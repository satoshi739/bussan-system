"""
物販チェッカー — FastAPI バックエンド
"""

import logging
import os as _sentry_os

try:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.starlette import StarletteIntegration
    _sentry_dsn = _sentry_os.environ.get("SENTRY_DSN")
    if _sentry_dsn:
        sentry_sdk.init(
            dsn=_sentry_dsn,
            integrations=[StarletteIntegration(), FastApiIntegration()],
            traces_sample_rate=0.2,
        )
except ImportError:
    pass

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, Security, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security.api_key import APIKeyHeader
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict
from datetime import date
import os as _os
import sys
import asyncio
import time as _time
from pathlib import Path

logger = logging.getLogger(__name__)

sys.path.insert(0, str(Path(__file__).parent))

from database import Database
from calculators import calculate_profit, find_breakeven_price, max_purchase_price, SELLING_PLATFORMS, CATEGORIES

_INTERNAL_API_KEY = _os.environ.get("INTERNAL_API_KEY", "")
_SKIP_AUTH = _os.environ.get("SKIP_AUTH", "false").lower() in ("true", "1", "yes")
_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


_PUBLIC_PATHS = {"/health", "/healthz", "/ping", "/docs", "/openapi.json", "/redoc"}

async def _verify_key(request: Request, key: Optional[str] = Security(_api_key_header)):
    if request.url.path in _PUBLIC_PATHS:
        return
    if _SKIP_AUTH:
        return
    if not _INTERNAL_API_KEY or key != _INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")


@asynccontextmanager
async def _lifespan(app: FastAPI):
    global _scanner_bg_task, _source_sync_bg_task
    import sys as _sys
    print(f"[Startup] Python {_sys.version}")
    print(f"[Startup] SKIP_AUTH={_SKIP_AUTH}, HAS_API_KEY={bool(_INTERNAL_API_KEY)}")
    try:
        import psycopg2 as _pg
        print("[Startup] psycopg2 OK")
    except ImportError:
        print("[Startup] psycopg2 NOT installed")
    try:
        import monitor
        monitor.start()
        print("[Startup] Monitor started OK")
    except Exception as e:
        print(f"[Startup] Monitor skip: {e}")
    _scanner_bg_task = asyncio.create_task(_auto_scan_loop())
    _source_sync_bg_task = asyncio.create_task(_source_sync_loop())
    yield
    if _scanner_bg_task:
        _scanner_bg_task.cancel()
    if _source_sync_bg_task:
        _source_sync_bg_task.cancel()
    try:
        import monitor
        monitor.stop()
    except Exception:
        pass


app = FastAPI(title="物販チェッカー API", dependencies=[Depends(_verify_key)], lifespan=_lifespan)

_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "https://frontend-one-steel-loaau9zmao.vercel.app",
    # 追加ドメインは環境変数 ALLOWED_ORIGINS で "," 区切りで渡す
]
_extra = _os.environ.get("ALLOWED_ORIGINS", "")
if _extra:
    _ALLOWED_ORIGINS += [o.strip() for o in _extra.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/sentry-test")
async def sentry_test():
    raise Exception("Sentry動作確認テスト — 物販チェッカー バックエンド")

_db: "Database | None" = None

def db_instance() -> "Database":
    global _db
    if _db is None:
        _db = Database()
    return _db

# グローバル db 変数 — 既存コードとの互換性を維持
class _LazyDb:
    def __getattr__(self, name):
        return getattr(db_instance(), name)

db = _LazyDb()


# ── モデル ──────────────────────────────────────────────

class PurchaseCreate(BaseModel):
    product_name: str
    platform: str
    purchase_price: float
    purchase_shipping: float = 0
    purchase_url: Optional[str] = None
    purchase_date: str
    notes: Optional[str] = None
    image_data: Optional[str] = None

class ListingCreate(BaseModel):
    purchase_id: int
    selling_platform: str = "Amazon"
    asin: Optional[str] = None
    listing_price: float
    amazon_shipping: float = 0
    use_fba: bool = False
    category: str = "その他"
    listed_date: str

class SaleCreate(BaseModel):
    listing_id: int
    sale_price: float
    amazon_fees: float
    net_profit: float
    sale_date: str

class SimpleSaleCreate(BaseModel):
    purchase_id: int
    sale_price: float
    sell_platform: str = "メルカリ"

class ProfitCalcRequest(BaseModel):
    purchase_price: float
    selling_price: float
    category: str = "その他"
    purchase_shipping: float = 0
    shipping_to_platform: float = 0
    use_fba: bool = False
    selling_platform: str = "Amazon"

class StatusUpdate(BaseModel):
    status: str


# ── ダッシュボード ───────────────────────────────────────

@app.get("/api/dashboard")
def get_dashboard():
    stats = db.get_summary_stats()
    monthly = [dict(r) for r in db.get_monthly_profit()]
    status_breakdown = db.get_status_breakdown()
    platform_breakdown = db.get_platform_breakdown()
    return {
        "stats": stats,
        "monthly_profit": monthly,
        "status_breakdown": [{"status": s, "count": c} for s, c in status_breakdown],
        "platform_breakdown": [{"platform": p, "count": c} for p, c in platform_breakdown],
    }


# ── 仕入れ ───────────────────────────────────────────────

@app.get("/api/purchases")
def get_purchases(status: Optional[str] = None, platform: Optional[str] = None, limit: Optional[int] = None):
    rows = db.get_purchases(status=status, platform=platform, limit=limit)
    return [dict(r) for r in rows]

@app.post("/api/purchases")
def create_purchase(body: PurchaseCreate):
    pid = db.add_purchase(body.model_dump())
    return {"id": pid}

@app.patch("/api/purchases/{purchase_id}/status")
def update_purchase_status(purchase_id: int, body: StatusUpdate):
    db.update_purchase_status(purchase_id, body.status)
    return {"ok": True}

class PurchaseUpdate(BaseModel):
    product_name: Optional[str] = None
    platform: Optional[str] = None
    purchase_price: Optional[float] = None
    purchase_shipping: Optional[float] = None
    purchase_url: Optional[str] = None
    purchase_date: Optional[str] = None
    notes: Optional[str] = None

@app.patch("/api/purchases/{purchase_id}")
def update_purchase(purchase_id: int, body: PurchaseUpdate):
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not data:
        raise HTTPException(400, "No fields to update")
    db.update_purchase(purchase_id, data)
    return {"ok": True}

@app.get("/api/purchases/product-names")
def get_product_names():
    return db.get_product_names()

try:
    @app.post("/api/purchases/import/csv")
    async def import_purchases_csv(file: UploadFile = File(...)):
        import csv, io as _io
        content = await file.read()
        try:
            text = content.decode("utf-8-sig")
        except UnicodeDecodeError:
            text = content.decode("shift-jis", errors="replace")

        try:
            reader = csv.DictReader(_io.StringIO(text))
            COL = {
                "product_name":      ["商品名", "product_name", "name", "商品"],
                "platform":          ["仕入れ先", "仕入れ元", "platform", "購入先", "買い先"],
                "purchase_price":    ["仕入れ価格", "purchase_price", "price", "価格", "金額"],
                "purchase_shipping": ["仕入れ送料", "purchase_shipping", "shipping", "送料"],
                "purchase_url":      ["URL", "purchase_url", "url", "リンク"],
                "purchase_date":     ["仕入れ日", "purchase_date", "date", "日付", "購入日"],
                "notes":             ["メモ", "notes", "note", "備考", "コメント"],
            }

            # ヘッダー行が認識できる列名を含むか確認
            fieldnames = reader.fieldnames or []
            required_candidates = COL["product_name"] + COL["purchase_price"]
            if not any(col in fieldnames for col in required_candidates):
                raise ValueError(f"列名が不正です。認識できる列名が見つかりません。検出された列: {list(fieldnames)}")

            def pick(row: dict, key: str):
                for col in COL[key]:
                    v = row.get(col, "")
                    if v:
                        return v.strip()
                return ""

            rows = []
            errors = []
            for i, row in enumerate(reader, 1):
                name = pick(row, "product_name")
                if not name:
                    errors.append(f"行{i}: 商品名が空です")
                    continue
                price_str = pick(row, "purchase_price")
                if not price_str:
                    errors.append(f"行{i}: 仕入れ価格が空です")
                    continue
                try:
                    price = float(price_str.replace(",", "").replace("¥", "").replace("円", ""))
                except ValueError:
                    err_msg = f"行{i}: 仕入れ価格が数値ではありません ({price_str})"
                    errors.append(err_msg)
                    continue
                shipping_str = pick(row, "purchase_shipping")
                try:
                    shipping = float(shipping_str.replace(",", "").replace("¥", "").replace("円", "")) if shipping_str else 0.0
                except ValueError:
                    shipping = 0.0
                rows.append({
                    "product_name":      name,
                    "platform":          pick(row, "platform") or "その他",
                    "purchase_price":    price,
                    "purchase_shipping": shipping,
                    "purchase_url":      pick(row, "purchase_url") or None,
                    "purchase_date":     pick(row, "purchase_date") or date.today().isoformat(),
                    "notes":             pick(row, "notes") or None,
                })

            result = db.import_purchases_csv(rows)
            result["parse_errors"] = errors
            return result

        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

except RuntimeError as _multipart_err:
    # python-multipart 未インストール時のフォールバック
    @app.post("/api/purchases/import/csv")
    async def import_purchases_csv(_req: Request):  # noqa: F811
        raise HTTPException(status_code=503, detail="CSVインポートにはサーバーの再デプロイが必要です")

@app.delete("/api/purchases/{purchase_id}")
def delete_purchase(purchase_id: int):
    db.delete_purchase(purchase_id)
    return {"ok": True}


# ── 出品 ─────────────────────────────────────────────────

@app.get("/api/listings")
def get_listings(status: Optional[str] = None):
    rows = db.get_listings(status=status)
    return [dict(r) for r in rows]

@app.post("/api/listings")
def create_listing(body: ListingCreate):
    data = body.model_dump()
    data["use_fba"] = 1 if data["use_fba"] else 0
    lid = db.add_listing(data)
    return {"id": lid}


# ── 売上 ─────────────────────────────────────────────────

@app.get("/api/sales")
def get_sales():
    rows = db.get_all_sales()
    return [dict(r) for r in rows]

@app.post("/api/sales")
def create_sale(body: SaleCreate):
    sid = db.add_sale(body.model_dump())
    return {"id": sid}

@app.post("/api/sales/simple")
def create_sale_simple(body: SimpleSaleCreate):
    from datetime import datetime
    net_profit = db.record_sale_simple(body.purchase_id, body.sale_price, body.sell_platform)
    month = datetime.today().strftime("%Y-%m")
    row = db.conn.execute(
        "SELECT COALESCE(SUM(net_profit), 0) as total FROM sales WHERE to_char(sale_date, 'YYYY-MM') = ?",
        (month,)
    ).fetchone()
    monthly_profit = float(row["total"]) if row else 0.0
    return {"net_profit": net_profit, "monthly_profit": monthly_profit}


# ── 利益計算 ─────────────────────────────────────────────

@app.post("/api/calc/profit")
def calc_profit(body: ProfitCalcRequest):
    result = calculate_profit(
        purchase_price=body.purchase_price,
        selling_price=body.selling_price,
        category=body.category,
        purchase_shipping=body.purchase_shipping,
        shipping_to_platform=body.shipping_to_platform,
        use_fba=body.use_fba,
        selling_platform=body.selling_platform,
    )
    return result

@app.get("/api/calc/platforms")
def get_platforms():
    return SELLING_PLATFORMS

@app.get("/api/calc/categories")
def get_categories():
    return list(CATEGORIES.keys())


class MaxPurchaseRequest(BaseModel):
    selling_price: float
    target_profit_rate: float = 0.20
    selling_platform: str = "メルカリ"
    category: str = "その他"
    shipping_to_platform: float = 0

@app.post("/api/calc/max-purchase")
def calc_max_purchase(body: MaxPurchaseRequest):
    max_price = max_purchase_price(
        selling_price=body.selling_price,
        category=body.category,
        target_profit_rate=body.target_profit_rate / 100 if body.target_profit_rate > 1 else body.target_profit_rate,
        shipping_to_platform=body.shipping_to_platform,
        selling_platform=body.selling_platform,
    )
    return {"max_purchase_price": max_price}


class AllPlatformsRequest(BaseModel):
    purchase_price: float
    purchase_shipping: float = 0
    selling_price: float

@app.post("/api/calc/all-platforms")
def calc_all_platforms(body: AllPlatformsRequest):
    results = {}
    for platform in SELLING_PLATFORMS:
        r = calculate_profit(
            purchase_price=body.purchase_price,
            selling_price=body.selling_price,
            purchase_shipping=body.purchase_shipping,
            selling_platform=platform,
        )
        results[platform] = {
            "gross_profit": r["gross_profit"],
            "profit_rate": r["profit_rate"],
            "platform_fees": r["platform_fees"],
            "emoji": SELLING_PLATFORMS[platform]["emoji"],
            "area": SELLING_PLATFORMS[platform]["area"],
        }
    return results


@app.get("/api/purchases/stale")
def get_stale_purchases(days: int = 14):
    """N日以上売れていない仕入れ済み商品"""
    from datetime import datetime, timedelta
    cutoff = (datetime.today() - timedelta(days=days)).date().isoformat()
    rows = db.conn.execute("""
        SELECT * FROM purchases
        WHERE status = 'purchased' AND purchase_date <= ?
        ORDER BY purchase_date ASC
    """, (cutoff,)).fetchall()
    return [dict(r) for r in rows]


@app.get("/api/analytics/by-platform")
def get_analytics_by_platform():
    rows = db.conn.execute("""
        SELECT l.selling_platform,
               COUNT(*) as count,
               SUM(s.net_profit) as total_profit,
               AVG(s.net_profit) as avg_profit,
               AVG(s.net_profit / s.sale_price * 100) as avg_rate
        FROM sales s
        JOIN listings l ON s.listing_id = l.id
        GROUP BY l.selling_platform
        ORDER BY total_profit DESC
    """).fetchall()
    return [dict(r) for r in rows]


@app.get("/api/analytics/by-buy-platform")
def get_analytics_by_buy_platform():
    rows = db.conn.execute("""
        SELECT p.platform,
               COUNT(*) as count,
               SUM(s.net_profit) as total_profit,
               AVG(s.net_profit) as avg_profit
        FROM sales s
        JOIN listings l ON s.listing_id = l.id
        JOIN purchases p ON l.purchase_id = p.id
        GROUP BY p.platform
        ORDER BY total_profit DESC
    """).fetchall()
    return [dict(r) for r in rows]


# ── 設定 ─────────────────────────────────────────────────

_SENSITIVE_KEYS = {"anthropic_api_key", "line_token"}

@app.get("/api/settings")
def get_settings():
    settings = db.get_settings()
    # センシティブなキーはマスクして返す（フロントで「設定済み」判定のみに使用）
    masked = {}
    for k, v in settings.items():
        if k in _SENSITIVE_KEYS and v:
            masked[k] = "****"
        else:
            masked[k] = v
    return masked

class SettingsUpdate(BaseModel):
    line_token: Optional[str] = None
    ebay_app_id: Optional[str] = None
    ebay_cert_id: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    auto_scan_enabled: Optional[bool] = None
    auto_scan_interval_min: Optional[int] = Field(None, ge=5, le=1440)
    source_sync_enabled: Optional[bool] = None
    source_sync_interval_min: Optional[int] = Field(None, ge=5, le=1440)
    watchlist: Optional[list] = None
    usd_jpy: Optional[float] = Field(None, gt=0, lt=10000)
    php_jpy: Optional[float] = Field(None, gt=0, lt=10000)
    monthly_budget: Optional[float] = Field(None, ge=0)

@app.post("/api/settings")
def save_settings(body: SettingsUpdate):
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    db.save_settings(data)
    return {"ok": True}


# ── ベスト商品ランキング ──────────────────────────────────

@app.get("/api/analytics/best-products")
def get_best_products(limit: int = 10):
    rows = db.conn.execute("""
        SELECT p.product_name,
               p.platform as buy_platform,
               l.selling_platform,
               p.purchase_price,
               s.sale_price,
               s.net_profit,
               s.sale_date,
               ROUND(s.net_profit / s.sale_price * 100, 1) as profit_rate
        FROM sales s
        JOIN listings l ON s.listing_id = l.id
        JOIN purchases p ON l.purchase_id = p.id
        ORDER BY s.net_profit DESC
        LIMIT ?
    """, (limit,)).fetchall()
    return [dict(r) for r in rows]


# ── 月次目標 ──────────────────────────────────────────────

@app.get("/api/goal")
def get_goal():
    from datetime import datetime
    month = datetime.today().strftime("%Y-%m")
    row = db.conn.execute(
        "SELECT value FROM settings WHERE key = ?", (f"goal_{month}",)
    ).fetchone()
    profit_row = db.conn.execute("""
        SELECT COALESCE(SUM(net_profit), 0) as profit
        FROM sales
        WHERE to_char(sale_date, 'YYYY-MM') = ?
    """, (month,)).fetchone()
    return {
        "month": month,
        "goal": float(row["value"]) if row else 0,
        "current_profit": float(profit_row["profit"]) if profit_row else 0,
    }

class GoalSet(BaseModel):
    goal: float

@app.post("/api/goal")
def set_goal(body: GoalSet):
    from datetime import datetime
    month = datetime.today().strftime("%Y-%m")
    db.conn.execute("""
        INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
    """, (f"goal_{month}", str(body.goal)))
    db.conn.commit()
    return {"ok": True}


# ── ウォッチリスト ────────────────────────────────────────

@app.get("/api/watchlist")
def get_watchlist():
    return db.get_watchlist()

class WatchlistItem(BaseModel):
    keyword: str
    sell_platform: str = "メルカリ"
    target_rate: float = 20.0
    memo: Optional[str] = None

@app.post("/api/watchlist")
def add_watchlist(body: WatchlistItem):
    items = db.get_watchlist()
    if any(i["keyword"] == body.keyword for i in items):
        return {"ok": True, "msg": "already exists"}
    items.append({
        "keyword": body.keyword,
        "sell_platform": body.sell_platform,
        "target_rate": body.target_rate,
        "memo": body.memo or "",
    })
    db.save_watchlist(items)
    return {"ok": True}

@app.delete("/api/watchlist/{keyword}")
def remove_watchlist(keyword: str):
    db.remove_watchlist_item(keyword)
    return {"ok": True}


# ── 相場検索 ──────────────────────────────────────────────

from scrapers import search_all_buy_sites, search_mercari, search_mercari_sold

@app.get("/api/search/market")
async def search_market(keyword: str, limit: int = 8):
    """メルカリ・ラクマ・ヤフオクの相場を一括検索し、価格履歴も記録"""
    results = await asyncio.to_thread(search_all_buy_sites, keyword, limit)
    
    # 価格履歴テーブルに保存
    from datetime import datetime
    for r in results:
        if r.get('price', 0) > 0:
            db.conn.execute(
                "INSERT INTO price_history (keyword, source, price) VALUES (?, ?, ?)",
                (keyword, r['source'], r['price'])
            )
    db.conn.commit()
    
    # 統計計算
    prices = [r['price'] for r in results if r.get('price', 0) > 0]
    stats = {}
    if prices:
        stats = {
            'min': min(prices),
            'max': max(prices),
            'avg': round(sum(prices) / len(prices)),
            'count': len(prices),
        }
    
    return {'results': results, 'stats': stats}


@app.get("/api/search/history")
def get_price_history(keyword: str):
    """キーワードの価格履歴を返す"""
    rows = db.conn.execute("""
        SELECT to_char(checked_at, 'YYYY-MM-DD') as date,
               ROUND(AVG(price)) as avg_price,
               MIN(price) as min_price,
               MAX(price) as max_price,
               COUNT(*) as count
        FROM price_history
        WHERE keyword = ?
        GROUP BY date
        ORDER BY date DESC
        LIMIT 30
    """, (keyword,)).fetchall()
    return [dict(r) for r in rows]


# ── LINE通知 ──────────────────────────────────────────────

import urllib.request
import urllib.parse

def _send_line(token: str, message: str) -> tuple[bool, str]:
    """
    LINE Notifyに送信する。
    Returns: (success, error_message)
    """
    try:
        data = urllib.parse.urlencode({'message': message}).encode('utf-8')
        req = urllib.request.Request(
            'https://notify-api.line.me/api/notify',
            data=data,
            headers={'Authorization': f'Bearer {token}'},
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=10) as res:
            return res.status == 200, ''
    except urllib.error.HTTPError as e:
        status = e.code
        if status == 401:
            msg = 'トークンが無効です。LINE Notifyで新しいトークンを発行してください。'
        elif status == 400:
            msg = 'リクエストが不正です。メッセージ内容を確認してください。'
        else:
            msg = f'LINE APIエラー (HTTP {status})'
        print(f'[LINE] HTTPエラー {status}: {msg}')
        return False, msg
    except Exception as e:
        msg = f'通信エラー: {e}'
        print(f'[LINE] エラー: {e}')
        return False, msg


class LineTestRequest(BaseModel):
    token: str

@app.post("/api/notify/test")
def notify_test(body: LineTestRequest):
    ok, err = _send_line(body.token, '\n✅ 物販チェッカーとLINEの連携が完了しました！\n売れ残り警告や日次レポートが届きます。')
    if ok:
        db.save_settings({'line_token': body.token})
    return {'ok': ok, 'error': err if not ok else None}


@app.post("/api/notify/stale")
def notify_stale(days: int = 14):
    """売れ残り商品をLINEに通知"""
    settings = db.get_settings()
    token = settings.get('line_token', '')
    if not token:
        raise HTTPException(400, 'LINE tokenが設定されていません')
    
    from datetime import datetime, timedelta
    cutoff = (datetime.today() - timedelta(days=days)).date().isoformat()
    rows = db.conn.execute("""
        SELECT product_name, purchase_date, purchase_price
        FROM purchases
        WHERE status = 'purchased' AND purchase_date <= ?
        ORDER BY purchase_date ASC
        LIMIT 10
    """, (cutoff,)).fetchall()
    
    if not rows:
        return {'ok': True, 'msg': '売れ残りなし'}
    
    msg = f'\n⚠️ 売れ残り警告（{len(rows)}件）\n\n'
    for r in rows:
        pd = r['purchase_date']
        if hasattr(pd, 'year'):
            # PostgreSQL の date オブジェクトはそのまま使える
            purchase_date_obj = pd
        else:
            purchase_date_obj = datetime.fromisoformat(str(pd)).date()
        days_elapsed = (datetime.today().date() - purchase_date_obj).days
        msg += f'・{r["product_name"]}\n  {days_elapsed}日経過 / ¥{r["purchase_price"]:,}\n\n'
    
    ok, err = _send_line(token, msg)
    result = {'ok': ok, 'count': len(rows)}
    if not ok:
        result['error'] = err
    return result


class HighRoiScanRequest(BaseModel):
    keyword: str
    min_roi: float = 50.0
    min_profit_jpy: int = 2000
    sell_platform: str = "Amazon"
    limit: int = 10


@app.post("/api/notify/high-roi-scan")
async def notify_high_roi_scan(body: HighRoiScanRequest):
    """
    国内転売スキャンを実行し、条件を満たす高ROI商品をLINEに通知する。
    min_roi: 最低ROI%（デフォルト50%）
    min_profit_jpy: 最低純利益額（デフォルト¥2,000）
    """
    settings = db.get_settings()
    token = settings.get('line_token', '')
    if not token:
        raise HTTPException(400, 'LINE tokenが設定されていません。設定ページでLINE Notifyトークンを登録してください。')

    results = await asyncio.to_thread(
        scan_keyword_domestic,
        body.keyword,
        body.sell_platform,
        None,
        0.0,
        body.limit,
    )

    # ROI・利益額フィルター
    hits = [
        r for r in results
        if r.get('roi', 0) >= body.min_roi
        and r.get('net_profit_jpy', 0) >= body.min_profit_jpy
    ]

    if not hits:
        return {'ok': True, 'found': 0, 'notified': False, 'msg': '条件を満たす商品が見つかりませんでした'}

    # LINEメッセージ組み立て
    mkt = hits[0].get('amazon_market', {})
    amazon_median = mkt.get('median', 0)
    lines = [
        f'\n🔥 高利益商品 発見！【{body.keyword}】',
        f'Amazon相場: ¥{amazon_median:,}（中央値）',
        f'対象: {len(hits)}件\n',
    ]
    for i, r in enumerate(hits[:5], 1):
        lines.append(
            f'#{i} [{r["rating"].upper()}] ROI {r["roi"]}% / 利益 ¥{r["net_profit_jpy"]:,}\n'
            f'  仕入れ ¥{r["buy_price"]:,}（{r["buy_source"]}）\n'
            f'  {r["name"][:30]}\n'
            f'  {r["buy_url"]}\n'
        )

    msg = '\n'.join(lines)
    ok, err = _send_line(token, msg)

    result = {'ok': ok, 'found': len(hits), 'notified': ok}
    if not ok:
        result['error'] = err
    return result


@app.post("/api/notify/daily")
def notify_daily():
    """今日の日次サマリーをLINEに通知"""
    settings = db.get_settings()
    token = settings.get('line_token', '')
    if not token:
        raise HTTPException(400, 'LINE tokenが設定されていません')
    
    from datetime import datetime
    today = datetime.today().date().isoformat()
    month = datetime.today().strftime('%Y-%m')
    
    today_sales = db.conn.execute(
        "SELECT COUNT(*) as c, COALESCE(SUM(net_profit),0) as p FROM sales WHERE sale_date = ?",
        (today,)
    ).fetchone()
    month_sales = db.conn.execute(
        "SELECT COUNT(*) as c, COALESCE(SUM(net_profit),0) as p FROM sales WHERE to_char(sale_date, 'YYYY-MM') = ?",
        (month,)
    ).fetchone()
    stale_count = db.conn.execute(
        "SELECT COUNT(*) as c FROM purchases WHERE status='purchased' AND purchase_date <= CURRENT_DATE - INTERVAL '14 days'"
    ).fetchone()
    
    msg = f'\n📊 物販チェッカー 日次レポート\n{today}\n\n'
    msg += f'【本日】\n売上 {today_sales["c"]}件 / 利益 ¥{int(today_sales["p"]):,}\n\n'
    msg += f'【今月累計】\n売上 {month_sales["c"]}件 / 利益 ¥{int(month_sales["p"]):,}\n\n'
    if stale_count['c'] > 0:
        msg += f'⚠️ 売れ残り {stale_count["c"]}件あり\n'
    
    ok, err = _send_line(token, msg)
    result = {'ok': ok}
    if not ok:
        result['error'] = err
    return result


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# グローバル物販チェッカー
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from global_calculator import (
    GLOBAL_PLATFORMS,
    calculate_global_profit,
    calculate_profit_matrix,
    suggest_selling_price,
    calculate_breakeven_price_local,
    get_intl_shipping,
)
from currency import get_all_rates_info, get_rates, jpy_to, to_jpy


# ── 為替レート ────────────────────────────────────────────────

@app.get("/api/global/rates")
def get_exchange_rates():
    """現在の為替レートを全通貨分返す"""
    return get_all_rates_info()


# ── プラットフォーム一覧 ──────────────────────────────────────

@app.get("/api/global/platforms")
def list_global_platforms():
    """グローバル販売プラットフォーム一覧"""
    return [
        {
            'key': k,
            **{kk: vv for kk, vv in v.items() if kk != 'fixed_fee_jpy'},
        }
        for k, v in GLOBAL_PLATFORMS.items()
    ]


# ── 利益マトリクス計算 ────────────────────────────────────────

class GlobalProfitRequest(BaseModel):
    purchase_price_jpy: float
    purchase_shipping_jpy: float = 0
    weight_g: float = 500
    # 各プラットフォームの販売価格（現地通貨）
    # 例: {"Shopee_SG": 50.0, "eBay": 45.0}
    selling_prices: Dict[str, float]


@app.post("/api/global/profit-matrix")
def profit_matrix(body: GlobalProfitRequest):
    """複数プラットフォームの利益を一括計算してランキング形式で返す"""
    results = calculate_profit_matrix(
        purchase_price_jpy=body.purchase_price_jpy,
        selling_prices=body.selling_prices,
        purchase_shipping_jpy=body.purchase_shipping_jpy,
        weight_g=body.weight_g,
    )
    return {'results': results, 'count': len(results)}


# ── 推奨販売価格計算 ──────────────────────────────────────────

class SuggestPriceRequest(BaseModel):
    purchase_price_jpy: float
    purchase_shipping_jpy: float = 0
    weight_g: float = 500
    target_profit_rate: float = 0.25     # 25%
    platforms: List[str] = []            # 空なら全プラットフォーム


@app.post("/api/global/suggest-prices")
def suggest_prices(body: SuggestPriceRequest):
    """
    各プラットフォームで目標利益率を達成するための推奨販売価格を計算。
    """
    targets = body.platforms if body.platforms else list(GLOBAL_PLATFORMS.keys())
    results = []
    for pk in targets:
        res = suggest_selling_price(
            purchase_price_jpy=body.purchase_price_jpy,
            platform_key=pk,
            target_profit_rate=body.target_profit_rate,
            purchase_shipping_jpy=body.purchase_shipping_jpy,
            weight_g=body.weight_g,
        )
        if res:
            pf = GLOBAL_PLATFORMS.get(pk, {})
            res['platform_flag'] = pf.get('flag', '')
            res['area'] = pf.get('area', '')
            res['note'] = pf.get('note', '')
            results.append(res)
    return {'results': results}


# ── 相場検索（グローバル）────────────────────────────────────

class GlobalSearchRequest(BaseModel):
    keyword: str
    # 仕入れ
    buy_platforms: List[str] = ['mercari', 'yahoo_auction', 'rakuma']
    # 販売先
    sell_platforms: List[str] = ['Shopee_SG', 'Shopee_MY', 'eBay', 'Amazon.com']
    limit: int = 5


@app.post("/api/global/search")
async def global_search(body: GlobalSearchRequest):
    """
    日本の仕入れ相場 + グローバル販売相場を並列検索して利益マトリクスを返す。
    """
    import concurrent.futures
    from scrapers import search_all_buy_sites
    from scrapers_global import search_global_selling_prices

    loop = asyncio.get_event_loop()
    executor = concurrent.futures.ThreadPoolExecutor(max_workers=2)

    # 仕入れ・販売相場を並列取得
    buy_fut = loop.run_in_executor(executor, search_all_buy_sites, body.keyword, body.limit)
    sell_fut = loop.run_in_executor(
        executor,
        lambda: search_global_selling_prices(
            keyword=body.keyword,
            platforms=body.sell_platforms,
            limit=body.limit,
        )
    )
    buy_results, sell_data = await asyncio.gather(buy_fut, sell_fut)

    buy_prices = [r['price'] for r in buy_results if r.get('price', 0) > 0]
    buy_stats = {}
    if buy_prices:
        buy_stats = {
            'min': min(buy_prices),
            'max': max(buy_prices),
            'avg': round(sum(buy_prices) / len(buy_prices)),
            'count': len(buy_prices),
        }

    # 利益マトリクス（仕入れ最安値 × 各プラットフォーム平均販売価格）
    profit_matrix_data = []
    if buy_stats.get('min'):
        purchase_price = buy_stats['min']
        for platform_key, pdata in sell_data.items():
            avg_local = pdata.get('avg_price_local', 0)
            if avg_local > 0:
                calc = calculate_global_profit(
                    purchase_price_jpy=purchase_price,
                    selling_price_local=avg_local,
                    platform_key=platform_key,
                )
                if 'error' not in calc:
                    calc['sell_sample_count'] = len(pdata.get('items', []))
                    profit_matrix_data.append(calc)

        profit_matrix_data.sort(key=lambda x: x.get('net_profit_jpy', -9999999), reverse=True)

    return {
        'keyword': body.keyword,
        'buy_results': buy_results[:body.limit * 2],
        'buy_stats': buy_stats,
        'sell_data': {k: {
            'name': v.get('name'),
            'flag': v.get('flag'),
            'currency': v.get('currency'),
            'avg_price_local': v.get('avg_price_local'),
            'min_price_local': v.get('min_price_local'),
            'avg_price_jpy': v.get('avg_price_jpy'),
            'item_count': len(v.get('items', [])),
        } for k, v in sell_data.items()},
        'profit_matrix': profit_matrix_data,
    }


# ── 全プラットフォーム相場一括検索 ───────────────────────────────

class AllPlatformSearchRequest(BaseModel):
    keyword: str
    buy_price_jpy: Optional[float] = None   # 仕入れ価格（入力すれば利益計算も返す）
    limit: int = 5


# 国内プラットフォームの手数料設定（calculators.py の SELLING_PLATFORMS から）
DOMESTIC_PLATFORMS = {
    'メルカリ':          {'flag': '🏪', 'fee_rate': 0.10,  'currency': 'JPY', 'area': '日本'},
    'ラクマ':            {'flag': '🛍️', 'fee_rate': 0.06,  'currency': 'JPY', 'area': '日本'},
    'PayPayフリマ':      {'flag': '💛', 'fee_rate': 0.05,  'currency': 'JPY', 'area': '日本'},
    'Yahoo!オークション': {'flag': '🔨', 'fee_rate': 0.088, 'currency': 'JPY', 'area': '日本'},
    'ヤフーショッピング':  {'flag': '🟡', 'fee_rate': 0.074, 'currency': 'JPY', 'area': '日本'},
    'Amazon.co.jp':      {'flag': '📦', 'fee_rate': 0.10,  'currency': 'JPY', 'area': '日本'},
}


@app.post("/api/global/all-platforms")
def search_all_platforms(body: AllPlatformSearchRequest):
    """
    キーワードで全プラットフォームの現在相場を一括検索。
    buy_price_jpy を指定すると利益計算も返す。

    返り値の platforms リスト:
      - platform_key, name, flag, currency, area
      - avg_price_local, min_price_local, avg_price_jpy, item_count
      - items: 実際の商品リスト（最大 limit 件）
      - profit: buy_price_jpy 指定時のみ
    """
    import time
    from scrapers import search_mercari, search_yahoo_auction, search_rakuma
    from scrapers_global import search_shopee, search_lazada, search_ebay_global

    keyword = body.keyword
    limit   = body.limit
    buy_jpy = body.buy_price_jpy

    platforms_data = []

    # ─ 国内プラットフォーム ─────────────────────────────
    from scrapers import search_yahoo_shopping, search_amazon_jp

    domestic_scrapers = [
        ('Yahoo!オークション',  search_yahoo_auction,  'Yahoo!オークション'),
        ('ヤフーショッピング',   search_yahoo_shopping, 'ヤフーショッピング'),
        ('Amazon.co.jp',        search_amazon_jp,      'Amazon.co.jp'),
    ]
    for pkey, scraper, src_name in domestic_scrapers:
        try:
            items_raw = scraper(keyword, limit)
            items = []
            for it in items_raw:
                price = it.get('price', 0)
                if price > 0:
                    items.append({
                        'name':      it.get('name', ''),
                        'price_local': price,
                        'price_jpy': price,
                        'url':       it.get('url', ''),
                        'image':     it.get('image', ''),
                        'condition': it.get('condition', ''),
                    })
        except Exception:
            items = []

        prices_jpy = [i['price_jpy'] for i in items]
        pinfo = DOMESTIC_PLATFORMS.get(pkey, {})
        fee_rate = pinfo.get('fee_rate', 0.10)

        entry = {
            'platform_key':    pkey,
            'name':            pkey,
            'flag':            pinfo.get('flag', '🏪'),
            'currency':        'JPY',
            'area':            '日本',
            'fee_rate':        fee_rate,
            'avg_price_local': round(sum(prices_jpy) / len(prices_jpy)) if prices_jpy else 0,
            'min_price_local': min(prices_jpy) if prices_jpy else 0,
            'max_price_local': max(prices_jpy) if prices_jpy else 0,
            'avg_price_jpy':   round(sum(prices_jpy) / len(prices_jpy)) if prices_jpy else 0,
            'item_count':      len(items),
            'items':           items[:limit],
        }

        # 利益計算（国内）
        if buy_jpy and entry['avg_price_local'] > 0:
            sell_jpy  = entry['avg_price_local']
            fee_jpy   = sell_jpy * fee_rate
            net       = sell_jpy - buy_jpy - fee_jpy
            rate      = (net / sell_jpy * 100) if sell_jpy > 0 else 0
            entry['profit'] = {
                'net_profit_jpy': round(net),
                'profit_rate':    round(rate, 1),
                'fee_jpy':        round(fee_jpy),
                'intl_shipping':  0,
                'is_profitable':  net > 0,
            }

        platforms_data.append(entry)
        time.sleep(0.2)

    # ─ 海外プラットフォーム ─────────────────────────────
    global_targets = [
        ('eBay',       lambda kw, lim: search_ebay_global(kw, lim)),
        ('Shopee_SG',  lambda kw, lim: search_shopee(kw, 'SG', lim)),
        ('Shopee_MY',  lambda kw, lim: search_shopee(kw, 'MY', lim)),
        ('Shopee_TH',  lambda kw, lim: search_shopee(kw, 'TH', lim)),
        ('Shopee_TW',  lambda kw, lim: search_shopee(kw, 'TW', lim)),
        ('Lazada_SG',  lambda kw, lim: search_lazada(kw, 'SG', lim)),
        ('Lazada_MY',  lambda kw, lim: search_lazada(kw, 'MY', lim)),
    ]

    for pkey, scraper in global_targets:
        pf = GLOBAL_PLATFORMS.get(pkey)
        if not pf:
            continue
        try:
            items_raw = scraper(keyword, limit)
            items = []
            for it in items_raw:
                pl = it.get('price_local', 0)
                pj = it.get('price_jpy', 0)
                if pl > 0:
                    items.append({
                        'name':       it.get('name', ''),
                        'price_local': pl,
                        'price_jpy':  pj,
                        'url':        it.get('url', ''),
                        'image':      it.get('image', ''),
                        'condition':  it.get('condition', ''),
                    })
        except Exception:
            items = []

        prices_local = [i['price_local'] for i in items]
        prices_jpy   = [i['price_jpy']   for i in items]
        currency = pf.get('currency', 'USD')

        entry = {
            'platform_key':    pkey,
            'name':            pf['name'],
            'flag':            pf['flag'],
            'currency':        currency,
            'area':            pf.get('area', ''),
            'fee_rate':        pf.get('fee_rate', 0.13),
            'avg_price_local': round(sum(prices_local) / len(prices_local), 2) if prices_local else 0,
            'min_price_local': min(prices_local) if prices_local else 0,
            'max_price_local': max(prices_local) if prices_local else 0,
            'avg_price_jpy':   round(sum(prices_jpy) / len(prices_jpy)) if prices_jpy else 0,
            'item_count':      len(items),
            'items':           items[:limit],
        }

        # 利益計算（海外）
        if buy_jpy and entry['avg_price_local'] > 0:
            calc = calculate_global_profit(
                purchase_price_jpy=buy_jpy,
                selling_price_local=entry['avg_price_local'],
                platform_key=pkey,
            )
            if 'error' not in calc:
                entry['profit'] = {
                    'net_profit_jpy': calc['net_profit_jpy'],
                    'profit_rate':    calc['profit_rate'],
                    'fee_jpy':        calc['platform_fee_jpy'],
                    'intl_shipping':  calc['intl_shipping_jpy'],
                    'is_profitable':  calc['is_profitable'],
                    'rating':         calc['rating'],
                }

        platforms_data.append(entry)
        time.sleep(0.2)

    # 価格データがあるものだけ残し、平均価格（円）の高い順にソート
    platforms_data = [p for p in platforms_data if p['item_count'] > 0]
    if buy_jpy:
        # 利益計算ありの場合: 純利益の高い順
        platforms_data.sort(
            key=lambda x: x.get('profit', {}).get('net_profit_jpy', -9999999),
            reverse=True,
        )
    else:
        platforms_data.sort(key=lambda x: x['avg_price_jpy'], reverse=True)

    return {
        'keyword':   keyword,
        'buy_price': buy_jpy,
        'platforms': platforms_data,
    }


# ── 単品利益計算 ──────────────────────────────────────────────

class SingleGlobalProfitRequest(BaseModel):
    purchase_price_jpy: float
    selling_price_local: float
    platform_key: str
    purchase_shipping_jpy: float = 0
    intl_shipping_jpy: Optional[float] = None
    weight_g: float = 500


@app.post("/api/global/profit")
def single_global_profit(body: SingleGlobalProfitRequest):
    """単一プラットフォーム向けの詳細利益計算"""
    result = calculate_global_profit(
        purchase_price_jpy=body.purchase_price_jpy,
        selling_price_local=body.selling_price_local,
        platform_key=body.platform_key,
        purchase_shipping_jpy=body.purchase_shipping_jpy,
        intl_shipping_jpy=body.intl_shipping_jpy,
        weight_g=body.weight_g,
    )
    if 'error' in result:
        raise HTTPException(400, result['error'])
    return result


# ── 国際送料計算 ──────────────────────────────────────────────

@app.get("/api/global/shipping")
def intl_shipping(platform: str, weight_g: float = 500):
    """プラットフォームへの国際送料目安を返す"""
    from global_calculator import PLATFORM_COUNTRY, INTL_SHIPPING_JPY
    country = PLATFORM_COUNTRY.get(platform, 'US')
    jpy = get_intl_shipping(platform, weight_g)
    return {
        'platform': platform,
        'country': country,
        'weight_g': weight_g,
        'shipping_jpy': jpy,
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 利益スキャナー（仕入れ候補商品の自動発掘）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from profit_scanner import (
    scan_keyword, scan_all_keywords, scan_keyword_domestic,
)


class ScanKeywordCreate(BaseModel):
    keyword: str
    target_sell_platform: str = "eBay"
    max_buy_price: Optional[float] = None
    min_profit_rate: float = 20.0
    memo: str = ""


@app.get("/api/scanner/keywords")
def get_scan_keywords():
    """スキャン対象キーワード一覧"""
    return db.load_scan_keywords()


@app.post("/api/scanner/keywords")
def add_keyword(body: ScanKeywordCreate):
    """スキャン対象キーワードを追加"""
    ok = db.add_scan_keyword(
        keyword=body.keyword,
        target_sell_platform=body.target_sell_platform,
        max_buy_price=body.max_buy_price,
        min_profit_rate=body.min_profit_rate,
        memo=body.memo,
    )
    return {"ok": ok, "msg": "already exists" if not ok else "added"}


@app.delete("/api/scanner/keywords/{keyword}")
def delete_keyword(keyword: str):
    """スキャン対象キーワードを削除"""
    db.remove_scan_keyword(keyword)
    return {"ok": True}


@app.get("/api/scanner/results")
def get_scan_results():
    """最新のスキャン結果（キャッシュ）を返す"""
    return db.load_scan_cache()


@app.post("/api/scanner/demand-check")
def scanner_demand_check(keyword: str, buy_price: float, sell_platform: str = "eBay"):
    """
    商品の需要・相場・売れやすさを確認する。
    - demand_score: 需要スコア 0〜100
    - market_prices: 各プラットフォームの平均価格
    - velocity: 売れやすさ推定（週あたり件数）
    - competition: 競合出品数
    """
    import time as _t
    from scrapers import search_mercari, search_yahoo_auction, search_rakuma

    market_prices: Dict[str, dict] = {}

    # ─ メルカリ ─────────────────────────────────────────────────
    try:
        items = search_mercari(keyword, 10)
        prices = [i.get("price", 0) for i in items if i.get("price", 0) > 0]
        if prices:
            market_prices["メルカリ"] = {
                "avg": round(sum(prices) / len(prices)),
                "min": min(prices),
                "max": max(prices),
                "count": len(prices),
                "flag": "🏪",
                "currency": "JPY",
            }
        else:
            market_prices["メルカリ"] = []
    except Exception as e:
        logger.warning(f"[demand_check] メルカリ 失敗: {e}")
        market_prices["メルカリ"] = []
    _t.sleep(0.2)

    # ─ ヤフオク ──────────────────────────────────────────────────
    try:
        items = search_yahoo_auction(keyword, 10)
        prices = [i.get("price", 0) for i in items if i.get("price", 0) > 0]
        if prices:
            market_prices["ヤフオク"] = {
                "avg": round(sum(prices) / len(prices)),
                "min": min(prices),
                "max": max(prices),
                "count": len(prices),
                "flag": "🔨",
                "currency": "JPY",
            }
    except Exception as e:
        logger.warning(f"[demand_check] ヤフオク 失敗: {e}")
    _t.sleep(0.2)

    # ─ ラクマ ────────────────────────────────────────────────────
    try:
        items = search_rakuma(keyword, 8)
        prices = [i.get("price", 0) for i in items if i.get("price", 0) > 0]
        if prices:
            market_prices["ラクマ"] = {
                "avg": round(sum(prices) / len(prices)),
                "min": min(prices),
                "max": max(prices),
                "count": len(prices),
                "flag": "🛍️",
                "currency": "JPY",
            }
    except Exception as e:
        logger.warning(f"[demand_check] ラクマ 失敗: {e}")
    _t.sleep(0.2)

    # ─ eBay（海外販売先の相場）─────────────────────────────────
    if sell_platform in ("eBay", "Amazon.com"):
        try:
            from scrapers_global import search_ebay_global
            items = search_ebay_global(keyword, 10)
            prices_jpy   = [i.get("price_jpy", 0)   for i in items if i.get("price_jpy",   0) > 0]
            prices_local = [i.get("price_local", 0)  for i in items if i.get("price_local", 0) > 0]
            if prices_jpy:
                market_prices["eBay"] = {
                    "avg":     round(sum(prices_jpy) / len(prices_jpy)),
                    "avg_local": round(sum(prices_local) / len(prices_local), 2) if prices_local else 0,
                    "min":     min(prices_jpy),
                    "max":     max(prices_jpy),
                    "count":   len(prices_jpy),
                    "flag":    "🌏",
                    "currency": "USD",
                }
        except Exception as e:
            logger.warning(f"[demand_check] eBay 失敗: {e}")

    # ─ 需要スコア計算 ─────────────────────────────────────────
    # 各プラットフォームの平均価格（円）リスト
    avg_prices_jpy = [
        p["avg"] for p in market_prices.values()
        if isinstance(p, dict) and "avg" in p and p.get("avg") is not None and p.get("currency") == "JPY"
    ]
    ebay_avg_jpy = market_prices.get("eBay", {}).get("avg", 0)
    if ebay_avg_jpy:
        avg_prices_jpy.append(ebay_avg_jpy)

    # Factor 1: 価格プレミアム（市場平均 ÷ 仕入れ価格 の倍率）
    price_premium_score = 0
    avg_market_jpy = 0
    if avg_prices_jpy and buy_price > 0:
        avg_market_jpy = round(sum(avg_prices_jpy) / len(avg_prices_jpy))
        ratio = avg_market_jpy / buy_price
        # ratio 1.3 = 30%以上の価格差 → 高需要
        price_premium_score = min(50, max(0, (ratio - 1.0) * 60))

    # Factor 2: 出品数（少ないほど需要 > 供給）
    total_listings = sum(p.get("count", 0) for p in market_prices.values())
    competition_score = max(0, 30 - total_listings * 1.2)

    # Factor 3: データ取得できたプラットフォーム数（市場の広さ）
    activity_score = min(20, len(market_prices) * 6)

    demand_score = int(min(100, max(0, price_premium_score + competition_score + activity_score)))

    # ─ 売れやすさ判定 ─────────────────────────────────────────
    if demand_score >= 70:
        velocity = {"level": "fast",   "label": "売れやすい",   "weekly": "週5〜10件",  "color": "#00ff80"}
    elif demand_score >= 45:
        velocity = {"level": "medium", "label": "普通",         "weekly": "週2〜5件",   "color": "#ffcc44"}
    else:
        velocity = {"level": "slow",   "label": "売れにくい",   "weekly": "週0〜2件",   "color": "#ff9944"}

    return {
        "demand_score":   demand_score,
        "market_prices":  market_prices,
        "velocity":       velocity,
        "total_listings": total_listings,
        "avg_market_jpy": avg_market_jpy,
    }


@app.post("/api/scanner/run")
async def run_scan(keyword: Optional[str] = None, platform: str = "eBay", limit: int = 8):
    """
    スキャンを実行する。
    - keyword 指定あり: そのキーワードのみスキャン
    - keyword 指定なし: 登録済み全キーワードをスキャン
    """
    if keyword:
        results = await asyncio.to_thread(scan_keyword, keyword, platform, limit)
    else:
        results = await asyncio.to_thread(scan_all_keywords, limit, db)

    await asyncio.to_thread(db.save_scan_cache, results)
    return {
        "ok": True,
        "count": len(results),
        "results": results,
    }


@app.post("/api/scanner/run-domestic")
async def run_domestic_scan(
    keyword: str,
    sell_platform: str = "Amazon",
    min_profit_rate: float = 15.0,
    limit: int = 10,
):
    """
    国内転売スキャン。
    ヤフオク仕入れ価格 × Amazon.co.jp実売価格で正確なROIを計算する。
    推定式ではなく実データで利益判定するため精度が高い。
    """
    results = await asyncio.to_thread(
        scan_keyword_domestic, keyword, sell_platform, None, min_profit_rate, limit
    )
    return {
        "ok": True,
        "count": len(results),
        "mode": "domestic",
        "results": results,
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 仕入れ→出品 ワンフロー API
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class QuickPurchaseAndListRequest(BaseModel):
    # 仕入れ情報
    product_name: str
    buy_platform: str
    buy_price: float
    buy_shipping: float = 0
    buy_url: Optional[str] = None
    buy_date: str
    condition: str = ""
    image_url: Optional[str] = None

    # 出品情報
    sell_platform: str = "eBay"
    sell_price_local: Optional[float] = None  # 指定なしなら推奨価格を自動計算
    weight_g: float = 500
    target_profit_rate: float = 0.25


class ListingPreviewRequest(BaseModel):
    product_name: str
    buy_platform: str
    buy_price: float
    buy_shipping: float = 0
    buy_url: Optional[str] = None
    sell_platform: str = "eBay"
    sell_price_local: Optional[float] = None
    weight_g: float = 500
    target_profit_rate: float = 0.25


@app.post("/api/flow/listing-preview")
def listing_preview(body: ListingPreviewRequest):
    """ディープリンクのみ生成（DB登録なし）"""
    pf = GLOBAL_PLATFORMS.get(body.sell_platform, {})
    currency = pf.get("currency", "JPY")

    if body.sell_price_local:
        sell_price_local = body.sell_price_local
    else:
        suggested = suggest_selling_price(
            purchase_price_jpy=body.buy_price + body.buy_shipping,
            platform_key=body.sell_platform,
            target_profit_rate=body.target_profit_rate,
            weight_g=body.weight_g,
        )
        sell_price_local = suggested.get("price_local", 0) if suggested else 0

    profit_calc = {}
    if sell_price_local > 0:
        profit_calc = calculate_global_profit(
            purchase_price_jpy=body.buy_price,
            selling_price_local=sell_price_local,
            platform_key=body.sell_platform,
            purchase_shipping_jpy=body.buy_shipping,
            weight_g=body.weight_g,
        )

    deep_links = _generate_listing_deeplinks(
        product_name=body.product_name,
        price_local=sell_price_local,
        currency=currency,
        platform_key=body.sell_platform,
        buy_url=body.buy_url,
    )

    return {
        "ok": True,
        "deep_links": deep_links,
        "sell_price_local": round(sell_price_local, 2) if sell_price_local else 0,
        "profit_calc": profit_calc,
    }


@app.post("/api/flow/quick-purchase-list")
def quick_purchase_and_list(body: QuickPurchaseAndListRequest):
    """
    仕入れ登録 → 出品推奨価格計算 → 出品ディープリンク生成 を一括で行う。
    """
    import urllib.parse
    from datetime import datetime

    # 1. 仕入れをDBに登録
    cursor = db.conn.execute("""
        INSERT INTO purchases
          (product_name, platform, purchase_price, purchase_shipping,
           purchase_url, purchase_date, status, notes, image_data)
        VALUES (?, ?, ?, ?, ?, ?, 'purchased', ?, ?)
        RETURNING id
    """, (
        body.product_name,
        body.buy_platform,
        body.buy_price,
        body.buy_shipping,
        body.buy_url,
        body.buy_date,
        body.condition,
        body.image_url,
    ))
    row = cursor.fetchone()
    purchase_id = row["id"] if row else None
    db.conn.commit()
    if not purchase_id:
        raise HTTPException(status_code=500, detail="購入記録の作成に失敗しました")

    # 2. 販売価格を計算（指定なしなら推奨価格）
    pf = GLOBAL_PLATFORMS.get(body.sell_platform, {})
    currency = pf.get("currency", "JPY")

    if body.sell_price_local:
        sell_price_local = body.sell_price_local
    else:
        suggested = suggest_selling_price(
            purchase_price_jpy=body.buy_price + body.buy_shipping,
            platform_key=body.sell_platform,
            target_profit_rate=body.target_profit_rate,
            weight_g=body.weight_g,
        )
        sell_price_local = suggested.get("price_local", 0) if suggested else 0

    # 3. 利益計算
    profit_calc = {}
    if sell_price_local > 0:
        profit_calc = calculate_global_profit(
            purchase_price_jpy=body.buy_price,
            selling_price_local=sell_price_local,
            platform_key=body.sell_platform,
            purchase_shipping_jpy=body.buy_shipping,
            weight_g=body.weight_g,
        )

    # 4. 出品ディープリンクを生成
    deep_links = _generate_listing_deeplinks(
        product_name=body.product_name,
        price_local=sell_price_local,
        currency=currency,
        platform_key=body.sell_platform,
        buy_url=body.buy_url,
    )

    return {
        "ok": True,
        "purchase_id": purchase_id,
        "product_name": body.product_name,
        "sell_platform": body.sell_platform,
        "sell_platform_flag": pf.get("flag", ""),
        "currency": currency,
        "sell_price_local": round(sell_price_local, 2) if sell_price_local else 0,
        "profit_calc": profit_calc,
        "deep_links": deep_links,
    }


def _generate_listing_deeplinks(
    product_name: str,
    price_local: float,
    currency: str,
    platform_key: str,
    buy_url: Optional[str] = None,
    buy_price_jpy: float = 0,
) -> Dict:
    """
    全プラットフォームの出品ページへのディープリンクを生成。
    推奨プラットフォームは recommended=True で返す。
    """
    import urllib.parse
    enc_name = urllib.parse.quote(product_name)

    # 推奨価格を各通貨に変換
    try:
        from currency import jpy_to, to_jpy
        price_jpy = to_jpy(price_local, currency) if price_local else 0
        price_usd = round(jpy_to(price_jpy, "USD"), 2) if price_jpy else 0
        price_sgd = round(jpy_to(price_jpy, "SGD"), 2) if price_jpy else 0
        price_myr = round(jpy_to(price_jpy, "MYR"), 2) if price_jpy else 0
        price_thb = round(jpy_to(price_jpy, "THB"), 2) if price_jpy else 0
        price_php = round(jpy_to(price_jpy, "PHP"), 2) if price_jpy else 0
        price_idr = round(jpy_to(price_jpy, "IDR"), 2) if price_jpy else 0
        price_twd = round(jpy_to(price_jpy, "TWD"), 2) if price_jpy else 0
        price_jpy_int = round(price_jpy)
    except Exception:
        price_usd = price_sgd = price_myr = price_thb = price_php = price_idr = price_twd = 0
        price_jpy_int = 0

    links = {}

    # ── 国内プラットフォーム ──────────────────────────────────────────
    links["mercari_jp"] = {
        "label": "メルカリで出品",
        "flag": "🏪",
        "url": "https://jp.mercari.com/sell",
        "note": f"推奨価格 ¥{price_jpy_int:,}" if price_jpy_int else "メルカリ出品ページ",
        "category": "国内",
        "recommended": platform_key in ("メルカリ", ""),
        "price_display": f"¥{price_jpy_int:,}" if price_jpy_int else "",
    }
    links["yahoo_auction"] = {
        "label": "ヤフオクで出品",
        "flag": "🔨",
        "url": f"https://auctions.yahoo.co.jp/sell/jp/show/tool?alocale=0jp&enc=UTF-8&keyword={enc_name}",
        "note": f"商品名プリセット済み / 推奨 ¥{price_jpy_int:,}" if price_jpy_int else "商品名プリセット済み",
        "category": "国内",
        "recommended": platform_key in ("Yahoo!オークション", ""),
        "price_display": f"¥{price_jpy_int:,}" if price_jpy_int else "",
    }
    links["rakuma"] = {
        "label": "ラクマで出品",
        "flag": "🛍️",
        "url": "https://fril.jp/sell",
        "note": f"手数料6%（最安水準）/ 推奨 ¥{price_jpy_int:,}" if price_jpy_int else "手数料6%（最安水準）",
        "category": "国内",
        "recommended": platform_key == "ラクマ",
        "price_display": f"¥{price_jpy_int:,}" if price_jpy_int else "",
    }
    links["paypay_flea"] = {
        "label": "PayPayフリマで出品",
        "flag": "💛",
        "url": "https://paypayfleamarket.yahoo.co.jp/sell",
        "note": f"手数料5%（最安クラス）/ 推奨 ¥{price_jpy_int:,}" if price_jpy_int else "手数料5%（最安クラス）",
        "category": "国内",
        "recommended": platform_key == "PayPayフリマ",
        "price_display": f"¥{price_jpy_int:,}" if price_jpy_int else "",
    }
    links["amazon_jp"] = {
        "label": "Amazon.co.jpで出品",
        "flag": "📦",
        "url": f"https://sellercentral.amazon.co.jp/product-search?ref=xx_addlisting_dnav_xx&q={enc_name}",
        "note": f"商品名検索プリセット / 推奨 ¥{price_jpy_int:,}" if price_jpy_int else "商品名検索プリセット",
        "category": "国内",
        "recommended": platform_key == "Amazon.co.jp",
        "price_display": f"¥{price_jpy_int:,}" if price_jpy_int else "",
    }

    # ── 海外プラットフォーム ──────────────────────────────────────────
    links["ebay"] = {
        "label": "eBayで出品",
        "flag": "🌏",
        "url": "https://www.ebay.com/sl/sell",
        "note": f"190ヵ国向け / 推奨 ${price_usd:,.2f}" if price_usd else "190ヵ国向け・Finding API連携",
        "category": "海外",
        "recommended": platform_key == "eBay",
        "price_display": f"${price_usd:,.2f}" if price_usd else "",
    }
    links["shopee_sg"] = {
        "label": "Shopee SGで出品",
        "flag": "🇸🇬",
        "url": "https://shopee.sg/portal/product/add",
        "note": f"シンガポール向け / 推奨 S${price_sgd:,.2f}" if price_sgd else "シンガポール向け",
        "category": "海外",
        "recommended": platform_key == "Shopee_SG",
        "price_display": f"S${price_sgd:,.2f}" if price_sgd else "",
    }
    links["shopee_my"] = {
        "label": "Shopee MYで出品",
        "flag": "🇲🇾",
        "url": "https://shopee.com.my/portal/product/add",
        "note": f"マレーシア向け / 推奨 RM{price_myr:,.2f}" if price_myr else "マレーシア向け",
        "category": "海外",
        "recommended": platform_key == "Shopee_MY",
        "price_display": f"RM{price_myr:,.2f}" if price_myr else "",
    }
    links["shopee_th"] = {
        "label": "Shopee THで出品",
        "flag": "🇹🇭",
        "url": "https://shopee.co.th/portal/product/add",
        "note": f"タイ向け / 推奨 ฿{price_thb:,.0f}" if price_thb else "タイ向け",
        "category": "海外",
        "recommended": platform_key == "Shopee_TH",
        "price_display": f"฿{price_thb:,.0f}" if price_thb else "",
    }
    links["shopee_ph"] = {
        "label": "Shopee PHで出品",
        "flag": "🇵🇭",
        "url": "https://shopee.ph/portal/product/add",
        "note": f"フィリピン向け / 推奨 ₱{price_php:,.0f}" if price_php else "フィリピン向け",
        "category": "海外",
        "recommended": platform_key == "Shopee_PH",
        "price_display": f"₱{price_php:,.0f}" if price_php else "",
    }
    links["shopee_id"] = {
        "label": "Shopee IDで出品",
        "flag": "🇮🇩",
        "url": "https://shopee.co.id/portal/product/add",
        "note": f"インドネシア向け / 推奨 Rp{price_idr:,.0f}" if price_idr else "インドネシア向け",
        "category": "海外",
        "recommended": platform_key == "Shopee_ID",
        "price_display": f"Rp{price_idr:,.0f}" if price_idr else "",
    }
    links["lazada_sg"] = {
        "label": "Lazada SGで出品",
        "flag": "🇸🇬",
        "url": "https://sellercenter.lazada.sg/portal#/product/create",
        "note": f"シンガポール向け / 推奨 S${price_sgd:,.2f}" if price_sgd else "シンガポール向け",
        "category": "海外",
        "recommended": platform_key == "Lazada_SG",
        "price_display": f"S${price_sgd:,.2f}" if price_sgd else "",
    }
    links["lazada_my"] = {
        "label": "Lazada MYで出品",
        "flag": "🇲🇾",
        "url": "https://sellercenter.lazada.com.my/portal#/product/create",
        "note": f"マレーシア向け / 推奨 RM{price_myr:,.2f}" if price_myr else "マレーシア向け",
        "category": "海外",
        "recommended": platform_key == "Lazada_MY",
        "price_display": f"RM{price_myr:,.2f}" if price_myr else "",
    }
    links["amazon_us"] = {
        "label": "Amazon.comで出品",
        "flag": "🇺🇸",
        "url": f"https://sellercentral.amazon.com/product-search?ref=xx_addlisting_dnav_xx&q={enc_name}",
        "note": f"米国向け / 推奨 ${price_usd:,.2f}" if price_usd else "米国向け",
        "category": "海外",
        "recommended": platform_key == "Amazon.com",
        "price_display": f"${price_usd:,.2f}" if price_usd else "",
    }
    links["etsy"] = {
        "label": "Etsyで出品",
        "flag": "🎨",
        "url": "https://www.etsy.com/sell",
        "note": f"ハンドメイド・ヴィンテージ向け / 推奨 ${price_usd:,.2f}" if price_usd else "ハンドメイド・ヴィンテージ向け",
        "category": "海外",
        "recommended": platform_key == "Etsy",
        "price_display": f"${price_usd:,.2f}" if price_usd else "",
    }

    return links


# ── 画像商品識別 ─────────────────────────────────────────────────────

class ImageIdentifyRequest(BaseModel):
    image_data: str   # base64 or data URL
    media_type: str = "image/jpeg"

    @field_validator("image_data")
    @classmethod
    def check_size(cls, v: str) -> str:
        if len(v) > 10_000_000:  # 約7.5MB
            raise ValueError("画像サイズが大きすぎます（最大7.5MB）")
        return v

_CLAUDE_VISION_MONTHLY_LIMIT = 200   # 月200回まで

@app.post("/api/image/identify")
def identify_product_from_image(body: ImageIdentifyRequest):
    """画像から商品名を識別する（Claude Vision）"""
    settings = db.get_settings()
    api_key = settings.get("anthropic_api_key", "").strip()
    if not api_key:
        raise HTTPException(400, "Anthropic APIキーが未設定です（設定ページで登録してください）")

    used = db.get_monthly_api_calls("claude_vision")
    if used >= _CLAUDE_VISION_MONTHLY_LIMIT:
        raise HTTPException(429, f"Claude Vision APIの月次利用上限（{_CLAUDE_VISION_MONTHLY_LIMIT}回）に達しました。来月まで待つか、上限を引き上げてください。")

    try:
        import anthropic

        # data URL の場合はプレフィックスを除去
        image_data = body.image_data
        media_type = body.media_type
        if "," in image_data:
            header, image_data = image_data.split(",", 1)
            if "image/png" in header:
                media_type = "image/png"
            elif "image/webp" in header:
                media_type = "image/webp"
            elif "image/gif" in header:
                media_type = "image/gif"
            else:
                media_type = "image/jpeg"

        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_data,
                        },
                    },
                    {
                        "type": "text",
                        "text": (
                            "この画像に写っている商品名を日本語で答えてください。"
                            "ブランド名・型番・シリーズ名を含めて、フリマサイトやオークションサイトで検索しやすい形で答えてください。"
                            "例: 「ポケモンカード リザードン ex」「LEGO テクニック 42083 ブガッティ」「セイコー プロスペックス SBDC003」"
                            "商品名のみ回答し、説明・補足は不要です。"
                        ),
                    },
                ],
            }],
        )

        product_name = message.content[0].text.strip()
        product_name = product_name.strip("「」『』\"'")
        db.increment_api_calls("claude_vision")
        return {
            "ok": True,
            "product_name": product_name,
            "monthly_used": used + 1,
            "monthly_limit": _CLAUDE_VISION_MONTHLY_LIMIT,
        }

    except ImportError:
        raise HTTPException(500, "anthropicライブラリが未インストールです")
    except Exception as e:
        raise HTTPException(500, f"識別エラー: {str(e)}")


# ── AI分析 ──────────────────────────────────────────────────────────

class AIAnalyzeRequest(BaseModel):
    product_name: str
    buy_price: float
    est_sell_price_jpy: float
    net_profit_jpy: float
    profit_rate: float
    roi: float
    sell_platform: str
    sell_platform_name: str
    buy_source: str
    condition: str = ""
    scan_keyword: str = ""

class AIKeywordsRequest(BaseModel):
    genre: str
    platform: str = "eBay"
    count: int = 8

@app.post("/api/ai/analyze")
def ai_analyze_product(body: AIAnalyzeRequest):
    """Claude AIによる商品仕入れ判断分析"""
    settings = db.get_settings()
    api_key = settings.get("anthropic_api_key", "").strip()
    if not api_key:
        raise HTTPException(400, "Anthropic APIキーが設定されていません（設定ページで登録してください）")

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        prompt = f"""あなたは日本の物販（転売・アービトラージ）の専門家です。
以下の商品について、仕入れて海外で転売すべきかを分析してください。

【商品情報】
- 商品名: {body.product_name}
- 仕入れ先: {body.buy_source}
- 仕入れ価格: ¥{body.buy_price:,.0f}
- コンディション: {body.condition or "不明"}
- キーワード: {body.scan_keyword or "なし"}

【利益試算】
- 販売先: {body.sell_platform_name}
- 推定販売価格: ¥{body.est_sell_price_jpy:,.0f}
- 推定純利益: ¥{body.net_profit_jpy:,.0f}
- 利益率: {body.profit_rate:.1f}%
- ROI: {body.roi:.1f}%

以下の形式で日本語で回答してください（各項目を改行で区切る）：

【総合判定】買うべき / 要検討 / 見送り のいずれかと、その理由を1文で

【ポジティブ要因】
・（箇条書きで2〜3点）

【リスク・注意点】
・（箇条書きで2〜3点）

【アドバイス】
（この商品を仕入れるなら何に気をつけるべきか、または代替案を1〜2文で）

簡潔に、実用的な内容で回答してください。"""

        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}]
        )

        analysis = message.content[0].text

        # 総合判定を抽出
        verdict = "要検討"
        if "買うべき" in analysis:
            verdict = "buy"
        elif "見送り" in analysis:
            verdict = "skip"
        else:
            verdict = "check"

        return {
            "ok": True,
            "verdict": verdict,
            "analysis": analysis,
            "model": "claude-haiku-4-5",
        }

    except ImportError:
        raise HTTPException(500, "anthropicライブラリがインストールされていません。pip install anthropic を実行してください")
    except Exception as e:
        raise HTTPException(500, f"AI分析エラー: {str(e)}")


@app.post("/api/ai/suggest-keywords")
def ai_suggest_keywords(body: AIKeywordsRequest):
    """AIによる仕入れキーワード提案"""
    settings = db.get_settings()
    api_key = settings.get("anthropic_api_key", "").strip()
    if not api_key:
        raise HTTPException(400, "Anthropic APIキーが設定されていません")

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        prompt = f"""あなたは日本の物販（輸出転売）の専門家です。
ジャンル「{body.genre}」で{body.platform}に出品する場合の、
ヤフオクやメルカリで仕入れるべき商品キーワードを{body.count}個提案してください。

条件：
- 日本で安く買えて海外で高く売れるもの
- 検索しやすい具体的なキーワード
- 価格帯も記載（仕入れ上限の目安）

以下のJSON形式で返してください（他のテキストは不要）：
[
  {{"keyword": "キーワード", "max_price": 数値（円）, "reason": "理由（10文字以内）"}},
  ...
]"""

        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}]
        )

        import json, re
        text = message.content[0].text
        # JSON部分を抽出
        match = re.search(r'\[.*\]', text, re.DOTALL)
        if match:
            suggestions = json.loads(match.group())
        else:
            suggestions = []

        return {"ok": True, "suggestions": suggestions}

    except ImportError:
        raise HTTPException(500, "anthropicライブラリがインストールされていません")
    except Exception as e:
        raise HTTPException(500, f"AI提案エラー: {str(e)}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 自動スキャン（バックグラウンドタスク）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

_scanner_bg_task: Optional[asyncio.Task] = None
_source_sync_bg_task: Optional[asyncio.Task] = None


def _is_listing_unavailable_page(html: str) -> bool:
    """仕入れ元の商品ページが売り切れ/終了かどうかをざっくり判定"""
    text = (html or "").lower()
    unavailable_keywords = [
        "このオークションは終了しました",
        "この商品は売り切れです",
        "販売終了",
        "sold out",
        "item ended",
        "listing has ended",
        "この商品は現在お取り扱いできません",
    ]
    return any(k.lower() in text for k in unavailable_keywords)


def _detect_buy_price_by_platform(product_name: str, platform: str) -> Optional[float]:
    """仕入れ元プラットフォームから現在価格（最安）を推定して返す"""
    from scrapers import (
        search_yahoo_auction, search_mercari, search_rakuma,
        search_yahoo_shopping, search_amazon_jp,
    )
    platform_norm = (platform or "").lower()
    scraper = None
    if "yahoo" in platform_norm or "ヤフオク" in platform_norm:
        scraper = search_yahoo_auction
    elif "mercari" in platform_norm or "メルカリ" in platform_norm:
        scraper = search_mercari
    elif "rakuma" in platform_norm or "ラクマ" in platform_norm:
        scraper = search_rakuma
    elif "ショッピング" in platform_norm:
        scraper = search_yahoo_shopping
    elif "amazon" in platform_norm:
        scraper = search_amazon_jp
    if not scraper:
        return None
    try:
        results = scraper(product_name, 5)
        prices = [float(i.get("price", 0)) for i in results if i.get("price", 0)]
        return min(prices) if prices else None
    except Exception:
        return None


def _send_source_sync_alert(message: str):
    settings = db.get_settings()
    token = settings.get("line_token", "").strip()
    if token:
        _send_line(token, message)


def _is_safe_url(url: str) -> bool:
    """SSRF 対策: 許可ドメイン以外・プライベートIPへのアクセスをブロック"""
    import ipaddress
    from urllib.parse import urlparse
    _ALLOWED_HOSTS = {
        "yahoo.co.jp", "auctions.yahoo.co.jp", "page.auctions.yahoo.co.jp",
        "mercari.com", "jp.mercari.com", "rakuma.jp",
        "amazon.co.jp", "www.amazon.co.jp",
        "ebay.com", "www.ebay.com",
        "shopee.sg", "shopee.com",
        "lazada.sg", "lazada.com",
    }
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        host = parsed.hostname or ""
        if host in ("169.254.169.254", "metadata.google.internal", "localhost", "127.0.0.1"):
            return False
        try:
            addr = ipaddress.ip_address(host)
            if addr.is_private or addr.is_loopback or addr.is_link_local:
                return False
        except ValueError:
            pass
        return any(host == h or host.endswith("." + h) for h in _ALLOWED_HOSTS)
    except Exception:
        return False


def run_source_sync_once() -> Dict:
    """
    仕入れ元在庫/価格を1回チェック:
    - 仕入れ元ページが終了・売り切れなら active listing を paused に変更
    - 仕入れ相場が上昇したらLINE通知
    """
    import urllib.request
    from datetime import datetime

    settings = db.get_settings()
    threshold_pct = float(settings.get("source_sync_price_rise_threshold_pct", "8"))
    min_alert_delta_jpy = float(settings.get("source_sync_min_alert_delta_jpy", "300"))
    active_only = settings.get("source_sync_active_only", "1") == "1"

    where_clause = "WHERE l.status = 'active'" if active_only else ""
    rows = db.conn.execute(f"""
        SELECT l.id as listing_id, l.status as listing_status, l.selling_platform,
               l.listing_price, p.id as purchase_id, p.product_name, p.platform,
               p.purchase_price, p.purchase_shipping, p.purchase_url
        FROM listings l
        JOIN purchases p ON l.purchase_id = p.id
        {where_clause}
        ORDER BY l.id DESC
        LIMIT 100
    """).fetchall()

    sold_out_count = 0
    price_up_count = 0
    sold_out_items: List[str] = []
    price_up_items: List[str] = []

    for r in rows:
        purchase_url = (r["purchase_url"] or "").strip()
        product_name = r["product_name"]
        buy_platform = r["platform"]
        baseline_buy = float(r["purchase_price"] or 0)

        # 1) URLがある場合はページ売り切れを優先チェック
        if purchase_url.startswith("http"):
            try:
                if not _is_safe_url(purchase_url):
                    print(f"[SourceSync] 安全でない URL をスキップ: {purchase_url}")
                    continue
                req = urllib.request.Request(
                    purchase_url,
                    headers={"User-Agent": "Mozilla/5.0"},
                )
                with urllib.request.urlopen(req, timeout=8) as res:
                    html = res.read(120000).decode("utf-8", errors="ignore")
                if _is_listing_unavailable_page(html):
                    if r["listing_status"] == "active":
                        db.conn.execute(
                            "UPDATE listings SET status = 'paused' WHERE id = ?",
                            (r["listing_id"],),
                        )
                        db.conn.commit()
                        sold_out_count += 1
                        sold_out_items.append(product_name)
            except Exception:
                pass

        # 2) 仕入れ相場の上昇チェック
        market_buy = _detect_buy_price_by_platform(product_name, buy_platform)
        if market_buy and baseline_buy > 0:
            delta = market_buy - baseline_buy
            rise_pct = (delta / baseline_buy) * 100
            if delta >= min_alert_delta_jpy and rise_pct >= threshold_pct:
                price_up_count += 1
                price_up_items.append(
                    f"・{product_name}\n  仕入れ {baseline_buy:,.0f}円 → 現在 {market_buy:,.0f}円 (+{rise_pct:.1f}%)"
                )

    db.save_settings({"source_sync_last_run": str(_time.time())})
    db.conn.commit()

    if sold_out_items:
        msg = "\n🛑 仕入れ元 在庫切れ検知\n"
        msg += f"自動停止: {sold_out_count}件\n\n"
        for name in sold_out_items[:6]:
            msg += f"・{name}\n"
        _send_source_sync_alert(msg)

    if price_up_items:
        msg = "\n📈 仕入れ価格 上昇アラート\n"
        msg += f"対象: {price_up_count}件\n\n"
        msg += "\n\n".join(price_up_items[:5])
        _send_source_sync_alert(msg)

    return {
        "ok": True,
        "checked": len(rows),
        "sold_out_detected": sold_out_count,
        "price_rise_detected": price_up_count,
        "checked_at": datetime.now().isoformat(),
    }


async def _source_sync_loop():
    """定期ソース連動ループ（在庫連動/価格上昇監視）"""
    while True:
        try:
            settings = db.get_settings()
            if settings.get("source_sync_enabled", "0") == "1":
                interval_min = float(settings.get("source_sync_interval_min", "15"))
                last_run = float(settings.get("source_sync_last_run", "0"))
                now = _time.time()
                if now - last_run >= interval_min * 60:
                    print("[SourceSync] 在庫・価格チェック開始...")
                    result = await asyncio.to_thread(run_source_sync_once)
                    print(
                        f"[SourceSync] 完了: checked={result['checked']} "
                        f"sold_out={result['sold_out_detected']} price_rise={result['price_rise_detected']}"
                    )
        except Exception as e:
            print(f"[SourceSync] エラー: {e}")
        await asyncio.sleep(120)  # 2分ごとに実行判定


async def _auto_scan_loop():
    """定期スキャンループ：5分ごとに設定を確認し、経過時間に応じてスキャンを実行する"""
    while True:
        try:
            settings = db.get_settings()
            if settings.get("auto_scan_enabled") == "1":
                interval_hours = float(settings.get("auto_scan_interval_hours", "8"))
                last_run = float(settings.get("auto_scan_last_run", "0"))
                now = _time.time()
                if now - last_run >= interval_hours * 3600:
                    print(f"[AutoScan] スキャン開始...")
                    results = await asyncio.to_thread(scan_all_keywords, 8, db)
                    await asyncio.to_thread(db.save_scan_cache, results)
                    db.save_settings({"auto_scan_last_run": str(now)})
                    print(f"[AutoScan] 完了: {len(results)}件")

                    # 高スコア商品があればLINEに通知
                    threshold = float(settings.get("auto_scan_notify_score", "70"))
                    top_items = [r for r in results if r.get("score", 0) >= threshold]
                    if top_items:
                        token = settings.get("line_token", "")
                        if token:
                            msg = f"\n🔍 利益スキャナー 自動結果\n高スコア商品 {len(top_items)}件\n\n"
                            for item in top_items[:5]:
                                msg += (
                                    f"・{item.get('name', item.get('product_name', ''))}\n"
                                    f"  スコア: {item.get('score', 0):.0f}"
                                    f" / 利益率: {item.get('profit_rate', 0):.1f}%"
                                    f" / 利益: ¥{int(item.get('net_profit_jpy', 0)):,}\n\n"
                                )
                            _send_line(token, msg)
        except Exception as e:
            print(f"[AutoScan] エラー: {e}")

        await asyncio.sleep(300)  # 5分ごとにチェック




# 自動スキャン設定の更新
class AutoScanSettings(BaseModel):
    enabled: bool
    interval_hours: float = 8
    notify_score: float = 70


@app.post("/api/scanner/auto-scan-settings")
def update_auto_scan_settings(body: AutoScanSettings):
    db.save_settings({
        "auto_scan_enabled": "1" if body.enabled else "0",
        "auto_scan_interval_hours": str(body.interval_hours),
        "auto_scan_notify_score": str(body.notify_score),
    })
    return {"ok": True}


@app.get("/api/scanner/auto-scan-settings")
def get_auto_scan_settings():
    settings = db.get_settings()
    return {
        "enabled": settings.get("auto_scan_enabled") == "1",
        "interval_hours": float(settings.get("auto_scan_interval_hours", "8")),
        "notify_score": float(settings.get("auto_scan_notify_score", "70")),
        "last_run": float(settings.get("auto_scan_last_run", "0")),
    }


class SourceSyncSettings(BaseModel):
    enabled: bool = False
    interval_min: float = 15
    price_rise_threshold_pct: float = 8
    min_alert_delta_jpy: float = 300
    active_only: bool = True


@app.post("/api/source-sync/settings")
def update_source_sync_settings(body: SourceSyncSettings):
    db.save_settings({
        "source_sync_enabled": "1" if body.enabled else "0",
        "source_sync_interval_min": str(body.interval_min),
        "source_sync_price_rise_threshold_pct": str(body.price_rise_threshold_pct),
        "source_sync_min_alert_delta_jpy": str(body.min_alert_delta_jpy),
        "source_sync_active_only": "1" if body.active_only else "0",
    })
    return {"ok": True}


@app.get("/api/source-sync/settings")
def get_source_sync_settings():
    settings = db.get_settings()
    return {
        "enabled": settings.get("source_sync_enabled", "0") == "1",
        "interval_min": float(settings.get("source_sync_interval_min", "15")),
        "price_rise_threshold_pct": float(settings.get("source_sync_price_rise_threshold_pct", "8")),
        "min_alert_delta_jpy": float(settings.get("source_sync_min_alert_delta_jpy", "300")),
        "active_only": settings.get("source_sync_active_only", "1") == "1",
        "last_run": float(settings.get("source_sync_last_run", "0")),
    }


@app.post("/api/source-sync/run")
async def source_sync_run_now():
    return await asyncio.to_thread(run_source_sync_once)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CSV エクスポート
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import csv
import io


@app.get("/api/purchases/export/csv")
def export_purchases_csv():
    """仕入れデータをCSVでダウンロード"""
    rows = db.conn.execute("""
        SELECT id, product_name, platform, purchase_price, purchase_shipping,
               purchase_date, status, notes, purchase_url, created_at
        FROM purchases
        ORDER BY purchase_date DESC
    """).fetchall()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "商品名", "仕入れ先", "仕入れ価格", "送料",
                     "仕入れ日", "ステータス", "メモ", "URL", "登録日時"])
    for r in rows:
        writer.writerow([
            r["id"], r["product_name"], r["platform"],
            r["purchase_price"], r["purchase_shipping"],
            str(r["purchase_date"]), r["status"], r["notes"] or "",
            r["purchase_url"] or "", str(r["created_at"]),
        ])

    output.seek(0)
    from datetime import datetime
    filename = f"purchases_{datetime.today().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter([output.getvalue().encode("utf-8-sig")]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/api/sales/export/csv")
def export_sales_csv():
    """売上データをCSVでダウンロード"""
    rows = db.conn.execute("""
        SELECT s.id, p.product_name, p.platform as buy_platform,
               l.selling_platform, s.sale_price, s.amazon_fees,
               s.net_profit, s.sale_date,
               p.purchase_price, p.purchase_shipping
        FROM sales s
        JOIN listings l ON s.listing_id = l.id
        JOIN purchases p ON l.purchase_id = p.id
        ORDER BY s.sale_date DESC
    """).fetchall()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "商品名", "仕入れ先", "販売先", "販売価格",
                     "手数料", "純利益", "売却日", "仕入れ価格", "仕入れ送料"])
    for r in rows:
        writer.writerow([
            r["id"], r["product_name"], r["buy_platform"],
            r["selling_platform"], r["sale_price"], r["amazon_fees"],
            r["net_profit"], str(r["sale_date"]),
            r["purchase_price"], r["purchase_shipping"],
        ])

    output.seek(0)
    from datetime import datetime
    filename = f"sales_{datetime.today().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter([output.getvalue().encode("utf-8-sig")]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 月次予算管理
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class BudgetRequest(BaseModel):
    budget: float


@app.get("/api/budget")
def get_budget():
    """今月の予算と使用額を返す"""
    from datetime import datetime
    settings = db.get_settings()
    budget = float(settings.get("monthly_budget", "0"))
    month = datetime.today().strftime('%Y-%m')

    row = db.conn.execute(
        """SELECT COALESCE(SUM(purchase_price + purchase_shipping), 0) as spent
           FROM purchases
           WHERE to_char(purchase_date, 'YYYY-MM') = ?""",
        (month,)
    ).fetchone()

    spent = float(row["spent"]) if row else 0
    return {"budget": budget, "spent": spent, "month": month}


@app.post("/api/budget")
def set_budget(body: BudgetRequest):
    """月次予算を設定する"""
    db.save_settings({"monthly_budget": str(body.budget)})
    return {"ok": True}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 価格変動アラート
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.get("/api/alerts/price-changes")
def get_price_change_alerts(days: int = 7, threshold: float = 5.0):
    """
    直近 days 日間の価格変化を検出してアラートを返す。
    threshold: 変化率の閾値（%、デフォルト5%）
    """
    from datetime import datetime, timedelta

    now = datetime.today()
    cutoff_recent = (now - timedelta(days=days)).isoformat()
    cutoff_old = (now - timedelta(days=days * 2)).isoformat()

    rows = db.conn.execute("""
        SELECT keyword, source,
               AVG(CASE WHEN checked_at >= ? THEN price END) as recent_avg,
               AVG(CASE WHEN checked_at < ? AND checked_at >= ? THEN price END) as old_avg,
               COUNT(CASE WHEN checked_at >= ? THEN 1 END) as recent_count,
               MIN(CASE WHEN checked_at >= ? THEN price END) as recent_min
        FROM price_history
        WHERE checked_at >= ?
        GROUP BY keyword, source
        HAVING recent_avg IS NOT NULL AND old_avg IS NOT NULL
    """, (cutoff_recent, cutoff_recent, cutoff_old, cutoff_recent, cutoff_recent, cutoff_old)).fetchall()

    alerts = []
    for r in rows:
        change_rate = (r['recent_avg'] - r['old_avg']) / r['old_avg'] * 100
        if abs(change_rate) >= threshold:
            alerts.append({
                'keyword': r['keyword'],
                'source': r['source'],
                'old_avg': round(r['old_avg']),
                'recent_avg': round(r['recent_avg']),
                'recent_min': round(r['recent_min']) if r['recent_min'] else None,
                'change_rate': round(change_rate, 1),
                'direction': 'up' if change_rate > 0 else 'down',
                'recent_count': r['recent_count'],
            })

    alerts.sort(key=lambda x: abs(x['change_rate']), reverse=True)

    watchlist = db.get_watchlist()
    watchlist_kws = {w['keyword'] for w in watchlist}
    for a in alerts:
        a['in_watchlist'] = a['keyword'] in watchlist_kws

    return {
        'alerts': alerts,
        'total': len(alerts),
        'checked_at': now.isoformat(),
        'period_days': days,
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 売れ筋トレンド分析
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.get("/api/analytics/trends")
def get_sales_trends(months: int = 6):
    """過去 N ヶ月の売れ筋トレンドを返す"""
    monthly_by_platform = db.conn.execute("""
        SELECT to_char(s.sale_date, 'YYYY-MM') as month,
               l.selling_platform,
               COUNT(*) as count,
               ROUND(SUM(s.net_profit)) as total_profit,
               ROUND(AVG(s.net_profit)) as avg_profit
        FROM sales s
        JOIN listings l ON s.listing_id = l.id
        WHERE s.sale_date >= CURRENT_DATE - CAST(? || ' months' AS INTERVAL)
        GROUP BY month, l.selling_platform
        ORDER BY month, total_profit DESC
    """, (str(months),)).fetchall()

    trending_products = db.conn.execute("""
        SELECT p.product_name,
               COUNT(*) as sale_count,
               ROUND(SUM(s.net_profit)) as total_profit,
               ROUND(AVG(s.net_profit / NULLIF(s.sale_price, 0) * 100), 1) as avg_rate,
               MAX(s.sale_date) as last_sold
        FROM sales s
        JOIN listings l ON s.listing_id = l.id
        JOIN purchases p ON l.purchase_id = p.id
        WHERE s.sale_date >= CURRENT_DATE - CAST(? || ' months' AS INTERVAL)
        GROUP BY p.product_name
        ORDER BY total_profit DESC
        LIMIT 10
    """, (str(months),)).fetchall()

    monthly_totals = db.conn.execute("""
        SELECT to_char(sale_date, 'YYYY-MM') as month,
               COUNT(*) as count,
               ROUND(SUM(net_profit)) as profit
        FROM sales
        WHERE sale_date >= CURRENT_DATE - CAST(? || ' months' AS INTERVAL)
        GROUP BY month
        ORDER BY month
    """, (str(months),)).fetchall()

    return {
        'monthly_by_platform': [dict(r) for r in monthly_by_platform],
        'trending_products': [dict(r) for r in trending_products],
        'monthly_totals': [dict(r) for r in monthly_totals],
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 競合セラー分析
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.get("/api/analytics/competition")
def get_competition_analysis():
    """出品中商品の市場相場と自分の価格を比較する"""
    import time as _t
    from scrapers import search_all_buy_sites

    listings = db.conn.execute("""
        SELECT l.id, p.product_name, l.listing_price, l.selling_platform,
               p.purchase_price, p.purchase_shipping
        FROM listings l
        JOIN purchases p ON l.purchase_id = p.id
        WHERE l.status = 'active'
        ORDER BY l.id DESC
        LIMIT 10
    """).fetchall()

    results = []
    for listing in listings:
        try:
            market = search_all_buy_sites(listing['product_name'], 6)
            prices = [r['price'] for r in market if r.get('price', 0) > 0]
            if prices:
                avg_market = round(sum(prices) / len(prices))
                min_market = min(prices)
                your_price = listing['listing_price']
                diff_pct = round((your_price - avg_market) / avg_market * 100, 1) if avg_market else 0

                status = 'competitive'
                if diff_pct > 15:
                    status = 'high'
                elif diff_pct < -15:
                    status = 'low'

                results.append({
                    'product_name': listing['product_name'],
                    'selling_platform': listing['selling_platform'],
                    'your_price': your_price,
                    'market_avg': avg_market,
                    'market_min': min_market,
                    'diff_pct': diff_pct,
                    'status': status,
                    'market_items': len(prices),
                    'cost': round(listing['purchase_price'] + listing['purchase_shipping']),
                })
            _t.sleep(0.3)
        except Exception as e:
            print(f'[Competition] {listing["product_name"]}: {e}')

    return {'results': results}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# AIリサーチアシスタント
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class AIResearchRequest(BaseModel):
    message: str
    include_data: bool = True

@app.post("/api/ai/research")
def ai_research(body: AIResearchRequest):
    """物販AIリサーチアシスタント"""
    settings = db.get_settings()
    api_key = settings.get("anthropic_api_key", "").strip()
    if not api_key:
        raise HTTPException(400, "Anthropic APIキーが設定されていません（設定ページで登録してください）")

    context_data = ""
    if body.include_data:
        try:
            recent = db.conn.execute("""
                SELECT p.product_name, p.platform as buy_platform, l.selling_platform,
                       s.net_profit, ROUND(s.net_profit / NULLIF(s.sale_price, 0) * 100, 1) as profit_rate
                FROM sales s
                JOIN listings l ON s.listing_id = l.id
                JOIN purchases p ON l.purchase_id = p.id
                ORDER BY s.sale_date DESC LIMIT 5
            """).fetchall()
            if recent:
                context_data += "【あなたの直近売上】\n"
                for r in recent:
                    context_data += f"・{r['product_name']} {r['buy_platform']}→{r['selling_platform']} 利益¥{int(r['net_profit']):,}({r['profit_rate']}%)\n"

            active = db.conn.execute(
                "SELECT COUNT(*) as c FROM purchases WHERE status='purchased'"
            ).fetchone()
            if active and active['c'] > 0:
                context_data += f"\n現在仕入れ済み・未販売: {active['c']}件\n"
        except Exception:
            pass

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        system = """あなたは日本の物販（メルカリ・ヤフオク・eBay・Shopee等）のプロフェッショナルAIアシスタントです。
仕入れ戦略、価格設定、需要分析、利益最大化について実践的なアドバイスを提供します。
ユーザーの実際のデータを踏まえて、具体的で実用的な回答を日本語で行ってください。"""

        user_msg = body.message
        if context_data:
            user_msg = f"【ユーザーデータ】\n{context_data}\n\n【質問】\n{body.message}"

        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1000,
            system=system,
            messages=[{"role": "user", "content": user_msg}]
        )

        return {"ok": True, "response": msg.content[0].text}
    except ImportError:
        raise HTTPException(500, "pip install anthropic を実行してください")
    except Exception as e:
        raise HTTPException(500, f"AIエラー: {str(e)}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 月次レポート自動生成
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.get("/api/reports/monthly")
def get_monthly_report(month: Optional[str] = None):
    """月次レポートを生成して返す"""
    from datetime import datetime, timedelta

    if not month:
        month = datetime.today().strftime('%Y-%m')

    prev_dt = datetime.strptime(month + '-01', '%Y-%m-%d') - timedelta(days=1)
    prev_month = prev_dt.strftime('%Y-%m')

    summary = db.conn.execute("""
        SELECT COUNT(*) as sale_count,
               COALESCE(SUM(s.net_profit), 0) as total_profit,
               COALESCE(AVG(s.net_profit), 0) as avg_profit,
               COALESCE(AVG(s.net_profit / NULLIF(s.sale_price, 0) * 100), 0) as avg_rate,
               COALESCE(SUM(s.sale_price), 0) as total_revenue
        FROM sales s
        WHERE to_char(s.sale_date, 'YYYY-MM') = ?
    """, (month,)).fetchone()

    prev = db.conn.execute("""
        SELECT COUNT(*) as sale_count,
               COALESCE(SUM(net_profit), 0) as total_profit
        FROM sales WHERE to_char(sale_date, 'YYYY-MM') = ?
    """, (prev_month,)).fetchone()

    purchases = db.conn.execute("""
        SELECT COUNT(*) as count,
               COALESCE(SUM(purchase_price + purchase_shipping), 0) as invested
        FROM purchases WHERE to_char(purchase_date, 'YYYY-MM') = ?
    """, (month,)).fetchone()

    by_platform = db.conn.execute("""
        SELECT l.selling_platform, COUNT(*) as count,
               ROUND(SUM(s.net_profit)) as profit,
               ROUND(AVG(s.net_profit / NULLIF(s.sale_price, 0) * 100), 1) as avg_rate
        FROM sales s JOIN listings l ON s.listing_id = l.id
        WHERE to_char(s.sale_date, 'YYYY-MM') = ?
        GROUP BY l.selling_platform ORDER BY profit DESC
    """, (month,)).fetchall()

    best = db.conn.execute("""
        SELECT p.product_name, p.platform as buy_platform,
               l.selling_platform, ROUND(s.net_profit) as net_profit,
               ROUND(s.net_profit / NULLIF(s.sale_price, 0) * 100, 1) as profit_rate
        FROM sales s JOIN listings l ON s.listing_id = l.id
        JOIN purchases p ON l.purchase_id = p.id
        WHERE to_char(s.sale_date, 'YYYY-MM') = ?
        ORDER BY s.net_profit DESC LIMIT 5
    """, (month,)).fetchall()

    goal_row = db.conn.execute(
        "SELECT value FROM settings WHERE key = ?", (f"goal_{month}",)
    ).fetchone()
    goal = float(goal_row['value']) if goal_row else 0

    growth = 0.0
    if prev['total_profit'] and prev['total_profit'] > 0:
        growth = round((summary['total_profit'] - prev['total_profit']) / prev['total_profit'] * 100, 1)

    return {
        'month': month,
        'summary': {
            'sale_count': summary['sale_count'],
            'total_profit': round(summary['total_profit']),
            'avg_profit': round(summary['avg_profit']),
            'avg_rate': round(summary['avg_rate'], 1),
            'total_revenue': round(summary['total_revenue']),
        },
        'prev_month': {
            'month': prev_month,
            'sale_count': prev['sale_count'],
            'total_profit': round(prev['total_profit']),
        },
        'purchases': {'count': purchases['count'], 'invested': round(purchases['invested'])},
        'goal': goal,
        'goal_achievement': round(summary['total_profit'] / goal * 100, 1) if goal > 0 else None,
        'profit_growth': growth,
        'by_platform': [dict(r) for r in by_platform],
        'best_products': [dict(r) for r in best],
    }


@app.post("/api/reports/monthly/line")
def send_monthly_report_line(month: Optional[str] = None):
    """月次レポートをLINEに送信"""
    from datetime import datetime
    if not month:
        month = datetime.today().strftime('%Y-%m')

    settings = db.get_settings()
    token = settings.get('line_token', '')
    if not token:
        raise HTTPException(400, 'LINE tokenが設定されていません')

    r = get_monthly_report(month)
    s = r['summary']

    msg = f'\n📋 {month} 月次レポート\n\n'
    msg += f'販売件数: {s["sale_count"]}件\n総利益: ¥{s["total_profit"]:,}\n平均利益率: {s["avg_rate"]}%\n'
    if r['goal'] > 0:
        msg += f'\n目標達成率: {r["goal_achievement"]}%\n'
    if r['profit_growth']:
        msg += f'前月比: {r["profit_growth"]:+.1f}%\n'
    if r['best_products']:
        msg += '\nベスト商品:\n'
        for p in r['best_products'][:3]:
            msg += f'・{p["product_name"]} ¥{int(p["net_profit"]):,}\n'

    ok, err = _send_line(token, msg)
    result = {'ok': ok}
    if not ok:
        result['error'] = err
    return result


# ── 外注・発送管理 ───────────────────────────────────────

class FulfillmentCreate(BaseModel):
    purchase_id: int
    worker_name: Optional[str] = None
    status: str = "waiting"
    tracking_number: Optional[str] = None
    shipping_company: Optional[str] = None
    pickup_date: Optional[str] = None
    pack_date: Optional[str] = None
    ship_date: Optional[str] = None
    notes: Optional[str] = None

class FulfillmentUpdate(BaseModel):
    worker_name: Optional[str] = None
    status: Optional[str] = None
    tracking_number: Optional[str] = None
    shipping_company: Optional[str] = None
    pickup_date: Optional[str] = None
    pack_date: Optional[str] = None
    ship_date: Optional[str] = None
    notes: Optional[str] = None

@app.get("/api/fulfillment")
def get_fulfillments(status: Optional[str] = None):
    rows = db.get_fulfillments(status=status)
    return [dict(r) for r in rows]

@app.post("/api/fulfillment")
def create_fulfillment(body: FulfillmentCreate):
    fid = db.add_fulfillment(body.model_dump())
    return {"id": fid}

@app.patch("/api/fulfillment/{fulfillment_id}")
def update_fulfillment(fulfillment_id: int, body: FulfillmentUpdate):
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not data:
        raise HTTPException(400, "更新するフィールドがありません")
    db.update_fulfillment(fulfillment_id, data)
    return {"ok": True}

@app.delete("/api/fulfillment/{fulfillment_id}")
def delete_fulfillment(fulfillment_id: int):
    db.delete_fulfillment(fulfillment_id)
    return {"ok": True}


# ── 発送代行業者 ─────────────────────────────────────────

class VendorCreate(BaseModel):
    name: str
    vendor_type: str = "manual"
    connection_type: str = "manual"
    status: str = "inactive"
    api_key: Optional[str] = None
    api_endpoint: Optional[str] = None
    contact_email: Optional[str] = None
    line_token: Optional[str] = None
    base_fee: float = 0
    per_item_fee: float = 0
    supported_methods: str = "[]"
    notes: Optional[str] = None

class VendorUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    api_key: Optional[str] = None
    api_endpoint: Optional[str] = None
    contact_email: Optional[str] = None
    line_token: Optional[str] = None
    base_fee: Optional[float] = None
    per_item_fee: Optional[float] = None
    supported_methods: Optional[str] = None
    notes: Optional[str] = None

class ShippingRequestCreate(BaseModel):
    vendor_id: int
    shipping_method: str
    shipping_cost: float = 0
    vendor_fee: float = 0
    recipient_name: Optional[str] = None
    recipient_zip: Optional[str] = None
    recipient_prefecture: Optional[str] = None
    recipient_address: Optional[str] = None
    recipient_phone: Optional[str] = None
    request_options: Optional[str] = None
    notes: Optional[str] = None

@app.get("/api/fulfillment/vendors")
def get_vendors():
    rows = db.get_vendors()
    return [dict(r) for r in rows]

@app.post("/api/fulfillment/vendors")
def create_vendor(body: VendorCreate):
    vid = db.add_vendor(body.model_dump())
    return {"id": vid}

@app.get("/api/fulfillment/vendors/{vendor_id}")
def get_vendor(vendor_id: int):
    row = db.get_vendor(vendor_id)
    if not row:
        raise HTTPException(404, "業者が見つかりません")
    return dict(row)

@app.patch("/api/fulfillment/vendors/{vendor_id}")
def update_vendor(vendor_id: int, body: VendorUpdate):
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not data:
        raise HTTPException(400, "更新フィールドがありません")
    db.update_vendor(vendor_id, data)
    return {"ok": True}

@app.delete("/api/fulfillment/vendors/{vendor_id}")
def delete_vendor(vendor_id: int):
    db.delete_vendor(vendor_id)
    return {"ok": True}

@app.post("/api/fulfillment/vendors/{vendor_id}/test")
def test_vendor(vendor_id: int):
    vendor = db.get_vendor(vendor_id)
    if not vendor:
        raise HTTPException(404, "業者が見つかりません")
    v = dict(vendor)
    if v['connection_type'] == 'api':
        if not v.get('api_key'):
            return {"ok": False, "message": "APIキーが設定されていません"}
        # 実際のAPI呼び出しは各業者実装時に追加
        return {"ok": True, "message": f"{v['name']} への接続テスト成功（モック）"}
    elif v['connection_type'] == 'email':
        if not v.get('contact_email'):
            return {"ok": False, "message": "メールアドレスが設定されていません"}
        return {"ok": True, "message": f"{v['contact_email']} への送信テスト成功"}
    elif v['connection_type'] == 'line':
        if not v.get('line_token'):
            return {"ok": False, "message": "LINEトークンが設定されていません"}
        return {"ok": True, "message": "LINE連携テスト成功"}
    return {"ok": True, "message": "手動管理モードです"}

@app.post("/api/fulfillment/{task_id}/request")
def create_shipping_request(task_id: int, body: ShippingRequestCreate):
    from datetime import datetime
    rows = db.get_fulfillments()
    task = next((dict(r) for r in rows if r['id'] == task_id), None)
    if not task:
        raise HTTPException(404, "タスクが見つかりません")

    old_status = task['status']
    data = body.model_dump()
    data['requested_at'] = datetime.now().isoformat()
    data['status'] = 'collected'
    if data.get('notes') is None:
        data.pop('notes', None)

    db.create_shipping_request(task_id, data)
    db.add_status_log(task_id, old_status, 'collected', 'user', f"発送依頼送信: vendor_id={body.vendor_id}")
    return {"ok": True}

@app.get("/api/fulfillment/{task_id}/logs")
def get_status_logs(task_id: int):
    rows = db.get_status_logs(task_id)
    return [dict(r) for r in rows]


# ─────────────────────────────────────────────────────────────
#  FBA 納品管理
# ─────────────────────────────────────────────────────────────

class FbaShipmentCreate(BaseModel):
    plan_name: str
    status: str = "draft"
    destination: str = "Amazon倉庫（川越FC）"
    box_count: int = 1
    notes: Optional[str] = None

class FbaShipmentUpdate(BaseModel):
    plan_name: Optional[str] = None
    status: Optional[str] = None
    destination: Optional[str] = None
    box_count: Optional[int] = None
    notes: Optional[str] = None
    sent_at: Optional[str] = None
    received_at: Optional[str] = None

class FbaShipmentItemCreate(BaseModel):
    purchase_id: Optional[int] = None
    product_name: str
    asin: Optional[str] = None
    fnsku: Optional[str] = None
    sku: Optional[str] = None
    quantity: int = 1
    box_number: int = 1
    condition_type: str = "NewItem"
    notes: Optional[str] = None

class FbaShipmentItemUpdate(BaseModel):
    product_name: Optional[str] = None
    asin: Optional[str] = None
    fnsku: Optional[str] = None
    sku: Optional[str] = None
    quantity: Optional[int] = None
    box_number: Optional[int] = None
    condition_type: Optional[str] = None
    notes: Optional[str] = None

@app.get("/api/fba/shipments")
def list_fba_shipments():
    rows = db.get_fba_shipments()
    result = []
    for r in rows:
        s = dict(r)
        items = db.get_fba_shipment_items(s["id"])
        s["items"] = [dict(i) for i in items]
        result.append(s)
    return result

@app.post("/api/fba/shipments")
def create_fba_shipment(body: FbaShipmentCreate):
    data = body.model_dump()
    new_id = db.add_fba_shipment(data)
    return {"id": new_id}

@app.get("/api/fba/shipments/{shipment_id}")
def get_fba_shipment(shipment_id: int):
    row = db.get_fba_shipment(shipment_id)
    if not row:
        raise HTTPException(404, "納品プランが見つかりません")
    s = dict(row)
    items = db.get_fba_shipment_items(shipment_id)
    s["items"] = [dict(i) for i in items]
    return s

@app.patch("/api/fba/shipments/{shipment_id}")
def update_fba_shipment(shipment_id: int, body: FbaShipmentUpdate):
    from datetime import datetime as _dt
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    if body.status == "sent" and "sent_at" not in data:
        data["sent_at"] = _dt.now().isoformat()
    if body.status == "received" and "received_at" not in data:
        data["received_at"] = _dt.now().isoformat()
    db.update_fba_shipment(shipment_id, data)
    return {"ok": True}

@app.delete("/api/fba/shipments/{shipment_id}")
def delete_fba_shipment(shipment_id: int):
    db.delete_fba_shipment(shipment_id)
    return {"ok": True}

@app.post("/api/fba/shipments/{shipment_id}/items")
def add_fba_shipment_item(shipment_id: int, body: FbaShipmentItemCreate):
    data = body.model_dump()
    data["shipment_id"] = shipment_id
    # FNSKU が未設定なら自動生成
    if not data.get("fnsku"):
        data["fnsku"] = f"X{shipment_id:04d}{data.get('box_number', 1):02d}{body.quantity:03d}"
    # SKU 未設定なら商品名ベースで生成
    if not data.get("sku"):
        import re
        name_part = re.sub(r"[^\w]", "", body.product_name)[:8].upper()
        data["sku"] = f"SKU-{name_part}-{shipment_id}"
    new_id = db.add_fba_shipment_item(data)
    return {"id": new_id, "fnsku": data["fnsku"], "sku": data["sku"]}

@app.patch("/api/fba/shipment-items/{item_id}")
def update_fba_shipment_item(item_id: int, body: FbaShipmentItemUpdate):
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    db.update_fba_shipment_item(item_id, data)
    return {"ok": True}

@app.delete("/api/fba/shipment-items/{item_id}")
def delete_fba_shipment_item(item_id: int):
    db.delete_fba_shipment_item(item_id)
    return {"ok": True}


# ─────────────────────────────────────────────────────────────
#  在庫管理
# ─────────────────────────────────────────────────────────────

class InventoryItemCreate(BaseModel):
    product_name: str
    asin: Optional[str] = None
    sku: Optional[str] = None
    fnsku: Optional[str] = None
    quantity: int = 0
    reserved_quantity: int = 0
    daily_sales: float = 0
    reorder_point: int = 5
    location: str = "FBA"
    status: str = "active"
    unit_cost: float = 0

class InventoryItemUpdate(BaseModel):
    product_name: Optional[str] = None
    asin: Optional[str] = None
    sku: Optional[str] = None
    fnsku: Optional[str] = None
    quantity: Optional[int] = None
    reserved_quantity: Optional[int] = None
    daily_sales: Optional[float] = None
    reorder_point: Optional[int] = None
    location: Optional[str] = None
    status: Optional[str] = None
    unit_cost: Optional[float] = None

@app.get("/api/inventory")
def list_inventory(status: str = None):
    rows = db.get_inventory(status)
    result = []
    for r in rows:
        item = dict(r)
        # 在庫切れ予測日数
        avail = item["quantity"] - item.get("reserved_quantity", 0)
        if item["daily_sales"] and item["daily_sales"] > 0:
            item["days_remaining"] = round(avail / item["daily_sales"])
        else:
            item["days_remaining"] = None
        result.append(item)
    return result

@app.post("/api/inventory")
def create_inventory_item(body: InventoryItemCreate):
    data = body.model_dump()
    new_id = db.add_inventory_item(data)
    return {"id": new_id}

@app.patch("/api/inventory/{item_id}")
def update_inventory_item(item_id: int, body: InventoryItemUpdate):
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    db.update_inventory_item(item_id, data)
    return {"ok": True}

@app.delete("/api/inventory/{item_id}")
def delete_inventory_item(item_id: int):
    db.delete_inventory_item(item_id)
    return {"ok": True}

@app.get("/api/inventory/summary")
def inventory_summary():
    rows = db.get_inventory()
    total = len(rows)
    low_stock = [r for r in rows if (r["quantity"] - r.get("reserved_quantity", 0)) <= r["reorder_point"]]
    out_of_stock = [r for r in rows if r["quantity"] <= 0]
    total_value = sum(r["quantity"] * r["unit_cost"] for r in rows)
    return {
        "total_items": total,
        "low_stock_count": len(low_stock),
        "out_of_stock_count": len(out_of_stock),
        "total_inventory_value": round(total_value),
    }


# ── バックアップ ───────────────────────────────────────────────

@app.post("/api/backup")
def create_backup():
    """DBをバックアップして保存パスを返す"""
    try:
        path = db.backup()
        backups = db.list_backups()
        return {
            "ok": True,
            "filename": _os.path.basename(path),
            "total_backups": len(backups),
        }
    except Exception as e:
        raise HTTPException(500, f"バックアップ失敗: {e}")


@app.get("/api/backup/list")
def list_backups():
    """バックアップ一覧を返す"""
    backups = db.list_backups()
    return {"backups": backups, "count": len(backups)}


# ── 為替レート強制更新 ────────────────────────────────────────

@app.post("/api/exchange-rates/refresh")
def refresh_exchange_rates():
    """為替レートをAPIから強制再取得する"""
    from currency import get_rates, is_using_fallback, get_cache_age_minutes
    rates = get_rates(force_refresh=True)
    return {
        "ok": True,
        "is_fallback": is_using_fallback(),
        "cache_age_minutes": get_cache_age_minutes(),
        "currencies": list(rates.keys()),
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  AI AGENT エンドポイント
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class CEORunRequest(BaseModel):
    goal: str
    budget_jpy: Optional[float] = None
    max_turns: int = 10

class RejectRequest(BaseModel):
    reason: str = ""

class GenerateListingRequest(BaseModel):
    approval_queue_id: Optional[int] = None
    purchase_id: Optional[int] = None
    product_name: str
    buy_price: float
    buy_source: str
    sell_platform: str
    est_sell_price: float
    condition: str = "中古・良好"
    notes: str = ""

class GenerateSNSRequest(BaseModel):
    approval_queue_id: Optional[int] = None
    purchase_id: Optional[int] = None
    product_name: str
    buy_price: float
    sell_price: float
    profit_jpy: float
    buy_source: str
    sell_platform: str
    post_type: str = "listing"
    platforms: List[str] = ["instagram", "twitter", "tiktok"]


def _get_agent_api_key() -> str:
    settings = db.get_settings()
    api_key = settings.get("anthropic_api_key", "").strip()
    if not api_key:
        raise HTTPException(400, "Anthropic APIキーが未設定です（設定ページで登録してください）")
    return api_key


# ── CEO エージェント ──────────────────────────────────────────────

@app.post("/api/agents/ceo/run")
async def run_ceo_agent(body: CEORunRequest):
    """AI CEOエージェントを起動: スキャン→承認キューに追加"""
    api_key = _get_agent_api_key()

    session_id = db.create_agent_session(body.goal, body.budget_jpy)
    db.update_agent_session(session_id, {"status": "running"})

    def _run_sync():
        from agents import CEOAgent
        agent = CEOAgent(api_key=api_key, db=db)
        return agent.run(
            goal=body.goal,
            budget_jpy=body.budget_jpy,
            max_turns=body.max_turns,
        )

    try:
        # CPU/IOブロッキング処理をスレッドプールで実行（FastAPIのイベントループをブロックしない）
        result = await asyncio.to_thread(_run_sync)

        import json as _json, datetime as _dt
        db.update_agent_session(session_id, {
            "status": "completed",
            "scanned_count": result.get("scanned_count", 0),
            "queued_count": result.get("queued_count", 0),
            "report": _json.dumps(result.get("report", {}), ensure_ascii=False),
            "log": _json.dumps(result.get("log", []), ensure_ascii=False),
            "completed_at": _dt.datetime.now().isoformat(),
        })

        # 承認キューに追加があればLINE通知
        queued = result.get("queued_count", 0)
        if queued > 0:
            settings = db.get_settings()
            line_token = settings.get("line_token", "").strip()
            if line_token:
                msg = (
                    f"\n🤖 AI CEO が {queued}件の仕入れ候補を発見しました！\n"
                    f"承認キューを確認して購入を承認してください。\n"
                    f"ゴール: {body.goal[:50]}"
                )
                _send_line(line_token, msg)

        return {
            "session_id": session_id,
            "status": "completed",
            **result,
        }

    except Exception as e:
        db.update_agent_session(session_id, {"status": "error"})
        raise HTTPException(500, f"CEOエージェントエラー: {str(e)}")


@app.get("/api/agents/ceo/stream")
async def stream_ceo_agent(goal: str, budget_jpy: Optional[float] = None, max_turns: int = 12):
    """CEOエージェントの進捗をSSEでリアルタイム配信する"""
    import json as _json, queue as _queue, threading as _threading, datetime as _dt
    from starlette.responses import StreamingResponse as _StreamingResponse

    api_key = _get_agent_api_key()
    session_id = db.create_agent_session(goal, budget_jpy)
    db.update_agent_session(session_id, {"status": "running"})

    q: _queue.Queue = _queue.Queue()

    def _run():
        try:
            from agents import CEOAgent
            agent = CEOAgent(api_key=api_key, db=db)
            q.put({"type": "progress", "message": f"ゴール受信: {goal[:60]}"})
            result = agent.run(goal=goal, budget_jpy=budget_jpy, max_turns=max_turns)
            db.update_agent_session(session_id, {
                "status": "completed",
                "scanned_count": result.get("scanned_count", 0),
                "queued_count": result.get("queued_count", 0),
                "report": _json.dumps(result.get("report", {}), ensure_ascii=False),
                "log": _json.dumps(result.get("log", []), ensure_ascii=False),
                "completed_at": _dt.datetime.now().isoformat(),
            })
            queued = result.get("queued_count", 0)
            if queued > 0:
                settings = db.get_settings()
                token = settings.get("line_token", "").strip()
                if token:
                    _send_line(token, f"\n🤖 AI CEO が {queued}件の仕入れ候補を発見！\nゴール: {goal[:50]}")
            q.put({"type": "done", "session_id": session_id, **result})
        except Exception as e:
            db.update_agent_session(session_id, {"status": "error"})
            q.put({"type": "error", "message": str(e)})
        finally:
            q.put(None)

    _threading.Thread(target=_run, daemon=True).start()

    async def _gen():
        yield f"data: {_json.dumps({'type': 'start', 'session_id': session_id}, ensure_ascii=False)}\n\n"
        while True:
            try:
                item = await asyncio.to_thread(q.get, timeout=300)
            except Exception:
                break
            if item is None:
                break
            yield f"data: {_json.dumps(item, ensure_ascii=False)}\n\n"
            if item.get("type") in ("done", "error"):
                break

    return _StreamingResponse(
        _gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/agents/sessions")
def get_agent_sessions(limit: int = 20):
    """CEOエージェントのセッション履歴を返す"""
    return db.get_agent_sessions(limit=limit)


# ── 承認キュー ────────────────────────────────────────────────────

@app.get("/api/agents/approval-queue")
def get_approval_queue(status: Optional[str] = None):
    """承認キューの一覧を返す"""
    items = db.get_approval_queue(status=status)
    total_investment = sum(i.get("buy_price", 0) for i in items if i.get("status") == "pending")
    total_profit = sum(i.get("net_profit_jpy", 0) for i in items if i.get("status") == "pending")
    return {
        "items": items,
        "pending_count": sum(1 for i in items if i.get("status") == "pending"),
        "total_investment_jpy": total_investment,
        "total_expected_profit_jpy": total_profit,
    }


@app.post("/api/agents/approval-queue/{item_id}/approve")
def approve_queue_item(item_id: int):
    """承認キューのアイテムを承認し、仕入れ管理に登録する"""
    item = db.get_approval_queue_item(item_id)
    if not item:
        raise HTTPException(404, "アイテムが見つかりません")
    if item["status"] != "pending":
        raise HTTPException(400, f"このアイテムはすでに{item['status']}です")

    from datetime import date as _date
    purchase_id = db.add_purchase({
        "product_name": item["product_name"],
        "platform": item["buy_source"] or "未設定",
        "purchase_price": item["buy_price"],
        "purchase_shipping": 0,
        "purchase_url": item.get("buy_url", ""),
        "purchase_date": _date.today().isoformat(),
        "notes": f"AI CEO承認済み | 期待利益率: {item.get('profit_rate', 0):.1f}% | {item.get('ceo_reason', '')}",
        "image_data": item.get("buy_image", ""),
    })

    db.approve_queue_item(item_id, purchase_id=purchase_id)

    return {
        "ok": True,
        "purchase_id": purchase_id,
        "message": f"承認しました。仕入れID: {purchase_id}",
    }


@app.post("/api/agents/approval-queue/{item_id}/reject")
def reject_queue_item(item_id: int, body: RejectRequest):
    """承認キューのアイテムを却下する"""
    item = db.get_approval_queue_item(item_id)
    if not item:
        raise HTTPException(404, "アイテムが見つかりません")
    db.reject_queue_item(item_id, reason=body.reason)
    return {"ok": True, "message": "却下しました"}


# ── 出品文生成 ────────────────────────────────────────────────────

@app.post("/api/agents/listing/generate")
async def generate_listing(body: GenerateListingRequest):
    """AI Listing Agentで出品文を自動生成する"""
    api_key = _get_agent_api_key()

    def _run():
        from agents import ListingAgent
        agent = ListingAgent(api_key=api_key)
        return agent.generate(
            product_name=body.product_name,
            buy_price=body.buy_price,
            buy_source=body.buy_source,
            sell_platform=body.sell_platform,
            est_sell_price=body.est_sell_price,
            condition=body.condition,
            notes=body.notes,
        )

    try:
        result = await asyncio.to_thread(_run)
        listing_id = db.add_agent_listing({
            "purchase_id": body.purchase_id,
            "approval_queue_id": body.approval_queue_id,
            "sell_platform": body.sell_platform,
            **result,
        })
        return {"listing_id": listing_id, "listing": result}

    except Exception as e:
        raise HTTPException(500, f"出品文生成エラー: {str(e)}")


@app.get("/api/agents/listings")
def get_agent_listings(purchase_id: Optional[int] = None, status: Optional[str] = None):
    """AI生成の出品文一覧を返す"""
    return db.get_agent_listings(purchase_id=purchase_id, status=status)


@app.post("/api/agents/listings/{listing_id}/publish")
def publish_agent_listing(listing_id: int):
    """出品文を公開済みにマークする"""
    db.publish_agent_listing(listing_id)
    return {"ok": True}


# ── SNSコンテンツ生成 ─────────────────────────────────────────────

@app.post("/api/agents/sns/generate")
async def generate_sns_content(body: GenerateSNSRequest):
    """AI SNS Agentで投稿文を自動生成する"""
    api_key = _get_agent_api_key()

    def _run():
        from agents import SNSAgent
        agent = SNSAgent(api_key=api_key)
        return agent.generate(
            product_name=body.product_name,
            buy_price=body.buy_price,
            sell_price=body.sell_price,
            profit_jpy=body.profit_jpy,
            buy_source=body.buy_source,
            sell_platform=body.sell_platform,
            platforms=body.platforms,
            post_type=body.post_type,
        )

    try:
        result = await asyncio.to_thread(_run)

        saved_ids = []
        for platform in body.platforms:
            platform_data = result.get(platform, {})
            content = platform_data.get("full_post") or platform_data.get("text") or platform_data.get("caption", "")
            hashtags = platform_data.get("hashtags", [])
            sns_id = db.add_agent_sns_content({
                "purchase_id": body.purchase_id,
                "approval_queue_id": body.approval_queue_id,
                "post_type": body.post_type,
                "platform": platform,
                "content": content,
                "hashtags": hashtags,
            })
            saved_ids.append({"platform": platform, "id": sns_id})

        return {"saved": saved_ids, "content": result}

    except Exception as e:
        raise HTTPException(500, f"SNSコンテンツ生成エラー: {str(e)}")


@app.get("/api/agents/sns")
def get_agent_sns_content(purchase_id: Optional[int] = None, status: Optional[str] = None):
    """AI生成のSNSコンテンツ一覧を返す"""
    return db.get_agent_sns_content(purchase_id=purchase_id, status=status)


@app.post("/api/agents/sns/{content_id}/publish")
def publish_sns_content(content_id: int):
    """SNSコンテンツを公開済みにマークする"""
    db.publish_agent_sns_content(content_id)
    return {"ok": True}


# ── SNSパフォーマンス記録 ──────────────────────────────────────────

class SNSPerformanceRequest(BaseModel):
    platform: str
    likes: int = 0
    comments: int = 0
    reach: int = 0
    led_to_sale: bool = False

@app.post("/api/agents/sns/{content_id}/performance")
def record_sns_performance(content_id: int, body: SNSPerformanceRequest):
    """SNS投稿のパフォーマンスを記録してエージェントに学習させる"""
    api_key = _get_agent_api_key()
    from agents import SNSAgent
    agent = SNSAgent(api_key=api_key, db=db)
    agent.record_performance(
        sns_content_id=content_id,
        platform=body.platform,
        likes=body.likes,
        comments=body.comments,
        reach=body.reach,
        led_to_sale=body.led_to_sale,
    )
    return {"ok": True}


# ── エージェント記憶 ──────────────────────────────────────────────────

@app.get("/api/agents/memory")
def get_agent_memory(agent_name: Optional[str] = None, memory_type: Optional[str] = None, q: Optional[str] = None):
    """エージェントの記憶一覧を返す"""
    now = __import__("datetime").datetime.now().isoformat()
    sql = "SELECT * FROM agent_memory WHERE (expires_at IS NULL OR expires_at > ?)"
    params = [now]
    if agent_name:
        sql += " AND agent_name = ?"
        params.append(agent_name)
    if memory_type:
        sql += " AND memory_type = ?"
        params.append(memory_type)
    if q:
        sql += " AND (title LIKE ? OR content LIKE ?)"
        params.extend([f"%{q}%", f"%{q}%"])
    sql += " ORDER BY importance DESC, created_at DESC LIMIT 100"
    rows = db.conn.execute(sql, params).fetchall()
    import json as _json
    result = []
    for r in rows:
        d = dict(r)
        try:
            d["tags"] = _json.loads(d.get("tags") or "[]")
        except Exception:
            d["tags"] = []
        result.append(d)
    return result

@app.delete("/api/agents/memory/{memory_id}")
def delete_memory(memory_id: int):
    """指定した記憶を削除する"""
    db.conn.execute("DELETE FROM agent_memory WHERE id = ?", (memory_id,))
    db.conn.commit()
    return {"ok": True}


# ── モニタリング制御 ──────────────────────────────────────────────────

@app.get("/api/monitor/status")
def get_monitor_status():
    """モニタリングスレッドの状態を返す"""
    try:
        import monitor
        return monitor.get_status()
    except Exception as e:
        return {"running": False, "error": str(e)}

@app.post("/api/monitor/run-now")
async def run_monitor_now(task: str = "daily_scan"):
    """指定タスクを今すぐ手動実行する"""
    valid_tasks = {
        "daily_scan": "daily_scan",
        "stale_check": "check_stale_inventory",
        "weekly_report": "weekly_report",
    }
    if task not in valid_tasks:
        raise HTTPException(400, f"不明なタスク: {task}")
    try:
        import monitor
        fn = getattr(monitor, valid_tasks[task])
        await asyncio.to_thread(fn)
        return {"ok": True, "task": task, "executed_at": __import__("datetime").datetime.now().isoformat()}
    except Exception as e:
        raise HTTPException(500, f"実行エラー: {str(e)}")

class MonitorSettingsRequest(BaseModel):
    daily_scan_time: Optional[str] = None
    stale_check_enabled: Optional[bool] = None
    weekly_report_day: Optional[str] = None
    weekly_report_time: Optional[str] = None

@app.post("/api/monitor/settings")
def save_monitor_settings(body: MonitorSettingsRequest):
    """モニタリング設定を保存してスケジュールを再設定する"""
    updates = {k: str(v) for k, v in body.model_dump().items() if v is not None}
    if updates:
        existing = db.get_settings()
        existing.update({f"monitor_{k}": v for k, v in updates.items()})
        db.save_settings(existing)
    try:
        import monitor
        monitor.setup_schedules()
    except Exception:
        pass
    return {"ok": True}


# ── Research Agent 単体呼び出し ────────────────────────────────────────

@app.get("/api/agents/research/market")
async def research_market(keyword: str, task: str = "ebay_sold"):
    """Research Agentに市場調査を依頼する"""
    def _run():
        from agents import ResearchAgent
        r = ResearchAgent(db=db)
        if task == "ebay_sold":
            return r.search_ebay_sold(keyword)
        elif task == "mercari_sold":
            return r.search_mercari_sold(keyword)
        elif task == "seasonal":
            return r.get_seasonal_intelligence()
        elif task == "own_history":
            return r.analyze_own_history(days=60)
        return {"error": f"不明なタスク: {task}"}
    try:
        result = await asyncio.to_thread(_run)
        return result
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/api/agents/research/seasonal")
def research_seasonal():
    """今月の季節インテリジェンスを返す"""
    from agents import ResearchAgent
    return ResearchAgent(db=db).get_seasonal_intelligence()

@app.get("/api/agents/research/history")
async def research_history(days: int = 60):
    """自社売上履歴分析を返す"""
    def _run():
        from agents import ResearchAgent
        return ResearchAgent(db=db).analyze_own_history(days=days)
    return await asyncio.to_thread(_run)

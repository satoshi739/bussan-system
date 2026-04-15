"""
物販チェッカー — FastAPI バックエンド
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import date
import sys
import asyncio
import time as _time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from database import Database
from calculators import calculate_profit, find_breakeven_price, max_purchase_price, SELLING_PLATFORMS, CATEGORIES

app = FastAPI(title="物販チェッカー API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db = Database()


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
    net_profit = db.record_sale_simple(body.purchase_id, body.sale_price, body.sell_platform)
    return {"net_profit": net_profit}


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

@app.get("/api/settings")
def get_settings():
    return db.get_settings()

@app.post("/api/settings")
def save_settings(body: dict):
    db.save_settings(body)
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
        WHERE strftime('%Y-%m', sale_date) = ?
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
        INSERT OR REPLACE INTO settings (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
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

from scrapers import search_all_buy_sites, search_mercari

@app.get("/api/search/market")
def search_market(keyword: str, limit: int = 8):
    """メルカリ・ラクマ・ヤフオクの相場を一括検索し、価格履歴も記録"""
    results = search_all_buy_sites(keyword, limit)
    
    # 価格履歴テーブルに保存
    from datetime import datetime
    db.conn.execute("""
        CREATE TABLE IF NOT EXISTS price_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            keyword TEXT NOT NULL,
            source TEXT NOT NULL,
            price INTEGER NOT NULL,
            checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
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
    db.conn.execute("""
        CREATE TABLE IF NOT EXISTS price_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            keyword TEXT NOT NULL,
            source TEXT NOT NULL,
            price INTEGER NOT NULL,
            checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    rows = db.conn.execute("""
        SELECT strftime('%Y-%m-%d', checked_at) as date,
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

def _send_line(token: str, message: str) -> bool:
    try:
        data = urllib.parse.urlencode({'message': message}).encode('utf-8')
        req = urllib.request.Request(
            'https://notify-api.line.me/api/notify',
            data=data,
            headers={'Authorization': f'Bearer {token}'},
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=10) as res:
            return res.status == 200
    except Exception as e:
        print(f'[LINE] エラー: {e}')
        return False


class LineTestRequest(BaseModel):
    token: str

@app.post("/api/notify/test")
def notify_test(body: LineTestRequest):
    ok = _send_line(body.token, '\n✅ 物販チェッカーとLINEの連携が完了しました！\n売れ残り警告や日次レポートが届きます。')
    if ok:
        db.save_settings({'line_token': body.token})
    return {'ok': ok}


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
        days_elapsed = (datetime.today().date() - datetime.fromisoformat(r['purchase_date']).date()).days
        msg += f'・{r["product_name"]}\n  {days_elapsed}日経過 / ¥{r["purchase_price"]:,}\n\n'
    
    ok = _send_line(token, msg)
    return {'ok': ok, 'count': len(rows)}


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
        "SELECT COUNT(*) as c, COALESCE(SUM(net_profit),0) as p FROM sales WHERE strftime('%Y-%m', sale_date) = ?",
        (month,)
    ).fetchone()
    stale_count = db.conn.execute(
        "SELECT COUNT(*) as c FROM purchases WHERE status='purchased' AND purchase_date <= date('now','-14 days')"
    ).fetchone()
    
    msg = f'\n📊 物販チェッカー 日次レポート\n{today}\n\n'
    msg += f'【本日】\n売上 {today_sales["c"]}件 / 利益 ¥{int(today_sales["p"]):,}\n\n'
    msg += f'【今月累計】\n売上 {month_sales["c"]}件 / 利益 ¥{int(month_sales["p"]):,}\n\n'
    if stale_count['c'] > 0:
        msg += f'⚠️ 売れ残り {stale_count["c"]}件あり\n'
    
    ok = _send_line(token, msg)
    return {'ok': ok}


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
def global_search(body: GlobalSearchRequest):
    """
    日本の仕入れ相場 + グローバル販売相場を同時検索して利益マトリクスを返す。
    """
    from scrapers import search_all_buy_sites
    from scrapers_global import search_global_selling_prices

    # 仕入れ相場（日本）
    buy_results = search_all_buy_sites(body.keyword, body.limit)
    buy_prices = [r['price'] for r in buy_results if r.get('price', 0) > 0]
    buy_stats = {}
    if buy_prices:
        buy_stats = {
            'min': min(buy_prices),
            'max': max(buy_prices),
            'avg': round(sum(buy_prices) / len(buy_prices)),
            'count': len(buy_prices),
        }

    # グローバル販売相場
    sell_data = search_global_selling_prices(
        keyword=body.keyword,
        platforms=body.sell_platforms,
        limit=body.limit,
    )

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
    'メルカリ':          {'flag': '🏪', 'fee_rate': 0.10, 'currency': 'JPY', 'area': '日本'},
    'ラクマ':            {'flag': '🛍️', 'fee_rate': 0.06, 'currency': 'JPY', 'area': '日本'},
    'PayPayフリマ':      {'flag': '💛', 'fee_rate': 0.05, 'currency': 'JPY', 'area': '日本'},
    'Yahoo!オークション': {'flag': '🔨', 'fee_rate': 0.088,'currency': 'JPY', 'area': '日本'},
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
    DOMESTIC_PLATFORMS.update({
        'ヤフーショッピング': {'flag': '🟡', 'fee_rate': 0.074, 'currency': 'JPY', 'area': '日本'},
        'Amazon.co.jp':      {'flag': '📦', 'fee_rate': 0.10,  'currency': 'JPY', 'area': '日本'},
    })

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
    load_scan_keywords, save_scan_keywords,
    add_scan_keyword, remove_scan_keyword,
    scan_keyword, scan_all_keywords,
    save_scan_results, load_scan_results,
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
    return load_scan_keywords()


@app.post("/api/scanner/keywords")
def add_keyword(body: ScanKeywordCreate):
    """スキャン対象キーワードを追加"""
    ok = add_scan_keyword(
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
    remove_scan_keyword(keyword)
    return {"ok": True}


@app.get("/api/scanner/results")
def get_scan_results():
    """最新のスキャン結果（キャッシュ）を返す"""
    return load_scan_results()


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
    except Exception:
        pass
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
    except Exception:
        pass
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
    except Exception:
        pass
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
        except Exception:
            pass

    # ─ 需要スコア計算 ─────────────────────────────────────────
    # 各プラットフォームの平均価格（円）リスト
    avg_prices_jpy = [
        p["avg"] for p in market_prices.values()
        if "avg" in p and p.get("currency") == "JPY"
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
def run_scan(keyword: Optional[str] = None, platform: str = "eBay", limit: int = 8):
    """
    スキャンを実行する。
    - keyword 指定あり: そのキーワードのみスキャン
    - keyword 指定なし: 登録済み全キーワードをスキャン
    """
    if keyword:
        results = scan_keyword(keyword, platform, limit=limit)
    else:
        results = scan_all_keywords(limit=limit)

    save_scan_results(results)
    return {
        "ok": True,
        "count": len(results),
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
    db.conn.commit()
    purchase_id = cursor.lastrowid

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

@app.post("/api/image/identify")
def identify_product_from_image(body: ImageIdentifyRequest):
    """画像から商品名を識別する（Claude Vision）"""
    settings = db.get_settings()
    api_key = settings.get("anthropic_api_key", "").strip()
    if not api_key:
        raise HTTPException(400, "Anthropic APIキーが未設定です（設定ページで登録してください）")

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
        # 余分な引用符や説明を除去
        product_name = product_name.strip("「」『』\"'")
        return {"ok": True, "product_name": product_name}

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
                    results = scan_all_keywords(limit=8)
                    save_scan_results(results)
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


@app.on_event("startup")
async def startup_event():
    global _scanner_bg_task
    _scanner_bg_task = asyncio.create_task(_auto_scan_loop())


@app.on_event("shutdown")
async def shutdown_event():
    global _scanner_bg_task
    if _scanner_bg_task:
        _scanner_bg_task.cancel()


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
            r["purchase_date"], r["status"], r["notes"] or "",
            r["purchase_url"] or "", r["created_at"],
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
            r["net_profit"], r["sale_date"],
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
           WHERE strftime('%Y-%m', purchase_date) = ?""",
        (month,)
    ).fetchone()

    spent = float(row["spent"]) if row else 0
    return {"budget": budget, "spent": spent, "month": month}


@app.post("/api/budget")
def set_budget(body: BudgetRequest):
    """月次予算を設定する"""
    db.save_settings({"monthly_budget": str(body.budget)})
    return {"ok": True}

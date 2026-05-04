"""
利益スキャナー
- 仕入れサイト（メルカリ・ヤフオク等）を定期巡回
- 各商品の利益スコアを算出
- 「買うべき商品」をランキング形式で返す
"""

import time
import json
from typing import List, Dict, Optional
from datetime import datetime
from pathlib import Path

from scrapers import (
    search_mercari, search_yahoo_auction, search_rakuma,
    get_amazon_market_price, search_ebay_sold,
)
from global_calculator import (
    GLOBAL_PLATFORMS, calculate_global_profit,
    suggest_selling_price, get_intl_shipping,
)
from calculators import calculate_profit as calc_domestic_profit, estimate_weight_by_category
from currency import get_rates, jpy_to

# ── スキャン対象キーワード管理 ──────────────────────────────────────
SCAN_KEYWORDS_FILE = Path(__file__).parent / "data" / "scan_keywords.json"


def load_scan_keywords() -> List[Dict]:
    """スキャン対象キーワード一覧を読み込む"""
    try:
        if SCAN_KEYWORDS_FILE.exists():
            return json.loads(SCAN_KEYWORDS_FILE.read_text())
    except Exception:
        pass
    return []


def save_scan_keywords(keywords: List[Dict]):
    SCAN_KEYWORDS_FILE.parent.mkdir(exist_ok=True)
    SCAN_KEYWORDS_FILE.write_text(json.dumps(keywords, ensure_ascii=False, indent=2))


def add_scan_keyword(
    keyword: str,
    target_sell_platform: str = "eBay",
    max_buy_price: Optional[float] = None,
    min_profit_rate: float = 20.0,
    memo: str = "",
):
    """スキャン対象キーワードを追加"""
    keywords = load_scan_keywords()
    # 重複チェック
    if any(k["keyword"] == keyword for k in keywords):
        return False
    keywords.append({
        "keyword": keyword,
        "target_sell_platform": target_sell_platform,
        "max_buy_price": max_buy_price,
        "min_profit_rate": min_profit_rate,
        "memo": memo,
        "added_at": datetime.now().isoformat(),
        "last_scanned": None,
        "best_profit_rate": None,
    })
    save_scan_keywords(keywords)
    return True


def remove_scan_keyword(keyword: str):
    keywords = [k for k in load_scan_keywords() if k["keyword"] != keyword]
    save_scan_keywords(keywords)


# ── カテゴリ推定 ─────────────────────────────────────────────────────

_CATEGORY_KEYWORDS: dict = {
    '家電・カメラ':               ['カメラ', '一眼', 'レンズ', 'テレビ', 'TV', '冷蔵庫', '洗濯機', 'エアコン', '掃除機', 'プロジェクター'],
    'パソコン・周辺機器':         ['ノートパソコン', 'ノートPC', 'MacBook', 'Surface', 'キーボード', 'マウス', 'モニター', 'SSD', 'GPU'],
    'スマートフォン・タブレット':  ['iPhone', 'iPad', 'Android', 'Galaxy', 'Pixel', 'スマホ', 'タブレット', 'スマートフォン'],
    'おもちゃ・ゲーム':            ['ゲーム', 'Nintendo', 'Switch', 'PlayStation', 'PS4', 'PS5', 'Xbox', 'レゴ', 'LEGO', 'フィギュア', 'ぬいぐるみ', 'プラモ'],
    'スポーツ・アウトドア':        ['テント', 'ザック', 'ゴルフ', '釣り', 'スキー', 'サーフ', 'トレーニング', 'ランニング', 'ウェイト'],
    'ホーム&キッチン':             ['調理', '鍋', 'ポット', '食器', '収納', 'ソファ', 'テーブル', 'チェア', '照明', 'ランプ'],
    'アパレル・ファッション':      ['シャツ', 'ジャケット', 'コート', 'スニーカー', 'バッグ', '財布', 'ブランド', 'ナイキ', 'アディダス', 'シュプリーム'],
    '本・音楽・DVD':               ['本', '漫画', 'CD', 'DVD', 'Blu-ray', 'ブルーレイ', '雑誌', 'コミック'],
    'ビューティー・コスメ':        ['コスメ', '化粧品', 'スキンケア', '香水', 'シャンプー', 'リップ', 'ファンデ'],
    'コレクター商品':              ['トレカ', 'ポケモン', 'ポケカ', '遊戯王', '切手', 'コイン', 'アンティーク', 'ヴィンテージ', 'ワンピース', '鬼滅'],
}


def _infer_category(name: str) -> str:
    """商品名からカテゴリを推定する。"""
    if not name:
        return 'その他'
    for category, keywords in _CATEGORY_KEYWORDS.items():
        if any(kw.lower() in name.lower() for kw in keywords):
            return category
    return 'その他'


# ── 利益スコア計算 ───────────────────────────────────────────────────

def _estimate_sell_price(buy_price: float, platform_key: str) -> float:
    """
    仕入れ価格から販売相場を推定する（目標利益率30%ベース）。
    実際の相場データがある場合はそちらを使うが、ない場合は計算で推定。
    """
    res = suggest_selling_price(
        purchase_price_jpy=buy_price,
        platform_key=platform_key,
        target_profit_rate=0.30,   # 30%目標で推奨価格を算出
    )
    return res.get("price_local", 0) if res else 0


def score_item(
    item: Dict,
    target_platform: str = "eBay",
    max_buy_price: Optional[float] = None,
    real_sell_price_jpy: Optional[float] = None,
) -> Optional[Dict]:
    """
    仕入れ候補商品にスコアを付ける。
    real_sell_price_jpy が渡された場合はその実売価格で計算（精度高）。
    未渡しの場合は推定式にフォールバック。
    """
    buy_price = item.get("price", 0)
    if not buy_price or buy_price <= 0:
        return None
    if max_buy_price and buy_price > max_buy_price:
        return None

    pf = GLOBAL_PLATFORMS.get(target_platform)
    if not pf:
        return None

    price_is_real = real_sell_price_jpy is not None and real_sell_price_jpy > 0

    if price_is_real:
        sell_price_jpy = real_sell_price_jpy
        sell_price_local = jpy_to(sell_price_jpy, pf['currency'])
    else:
        sell_price_local = _estimate_sell_price(buy_price, target_platform)
        if not sell_price_local or sell_price_local <= 0:
            return None
        sell_price_jpy = None  # calculate_global_profit が算出する

    category = _infer_category(item.get("name", ""))
    weight_g = estimate_weight_by_category(category)

    calc = calculate_global_profit(
        purchase_price_jpy=buy_price,
        selling_price_local=sell_price_local,
        platform_key=target_platform,
        purchase_shipping_jpy=0,
        weight_g=weight_g,
    )

    if "error" in calc or not calc.get("is_profitable"):
        return None

    profit_rate = calc.get("profit_rate", 0)
    net_profit = calc.get("net_profit_jpy", 0)
    roi = calc.get("roi", 0)

    score = min(100, max(0,
        profit_rate * 1.5
        + min(roi, 60) * 0.5
        + min(net_profit / 100, 20)
    ))

    return {
        "name": item.get("name", ""),
        "buy_price": buy_price,
        "buy_url": item.get("url", ""),
        "buy_image": item.get("image", ""),
        "buy_source": item.get("source", ""),
        "condition": item.get("condition", ""),

        "sell_platform": target_platform,
        "sell_platform_name": pf["name"],
        "sell_platform_flag": pf["flag"],
        "sell_currency": pf["currency"],
        "est_sell_price_local": round(sell_price_local, 2),
        "est_sell_price_jpy": calc.get("selling_price_jpy", 0),
        "price_source": "実売価格(Amazon)" if price_is_real else "推定価格",

        "net_profit_jpy": round(net_profit),
        "profit_rate": round(profit_rate, 1),
        "roi": round(roi, 1),
        "intl_shipping_jpy": calc.get("intl_shipping_jpy", 0),
        "platform_fee_jpy": round(calc.get("platform_fee_jpy", 0)),
        "rating": calc.get("rating", "ok"),

        "score": round(score, 1),
        "scanned_at": datetime.now().isoformat(),
    }


# ── 国内転売スコアリング（ヤフオク仕入れ → Amazon.co.jp/メルカリ販売） ──

def score_item_domestic(
    item: Dict,
    sell_price_jpy: float,
    sell_platform: str = "Amazon",
    max_buy_price: Optional[float] = None,
) -> Optional[Dict]:
    """
    国内転売用スコアリング。
    Amazon.co.jp等の実売価格(JPY)を使って正確な利益を計算する。
    """
    buy_price = item.get("price", 0)
    if not buy_price or buy_price <= 0:
        return None
    if max_buy_price and buy_price > max_buy_price:
        return None
    if sell_price_jpy <= buy_price:
        return None

    category = _infer_category(item.get("name", ""))
    weight_g = estimate_weight_by_category(category)

    calc = calc_domestic_profit(
        purchase_price=buy_price,
        selling_price=sell_price_jpy,
        selling_platform=sell_platform,
        category=category,
        purchase_shipping=0,
        fba_weight_g=weight_g,
    )

    net_profit = calc.get("gross_profit", 0)
    profit_rate = calc.get("profit_rate", 0)
    roi = calc.get("roi", 0)

    if net_profit <= 0:
        return None

    score = min(100, max(0,
        profit_rate * 1.5
        + min(roi, 60) * 0.5
        + min(net_profit / 100, 20)
    ))

    return {
        "name": item.get("name", ""),
        "buy_price": buy_price,
        "buy_url": item.get("url", ""),
        "buy_image": item.get("image", ""),
        "buy_source": item.get("source", ""),
        "condition": item.get("condition", ""),

        "sell_platform": sell_platform,
        "sell_platform_name": sell_platform,
        "sell_platform_flag": "📦" if sell_platform == "Amazon" else "🏪",
        "sell_currency": "JPY",
        "est_sell_price_local": sell_price_jpy,
        "est_sell_price_jpy": sell_price_jpy,
        "price_source": "実売価格(Amazon.co.jp)",

        "net_profit_jpy": round(net_profit),
        "profit_rate": round(profit_rate, 1),
        "roi": round(roi, 1),
        "platform_fee_jpy": round(calc.get("platform_fees", 0)),
        "rating": "great" if profit_rate >= 30 else "ok" if profit_rate >= 15 else "low",

        "score": round(score, 1),
        "scanned_at": datetime.now().isoformat(),
    }


def scan_keyword_domestic(
    keyword: str,
    sell_platform: str = "Amazon",
    max_buy_price: Optional[float] = None,
    min_profit_rate: float = 15.0,
    limit: int = 10,
) -> List[Dict]:
    """
    国内転売スキャン。
    仕入れ: Yahoo!オークション / 販売: Amazon.co.jp
    Amazon実売価格をもとに正確なROIを計算する。
    """
    # 仕入れ候補を収集
    buy_items: List[Dict] = []
    for item in search_yahoo_auction(keyword, limit):
        buy_items.append(item)
    for item in search_mercari(keyword, limit):
        item["source"] = "メルカリ"
        buy_items.append(item)

    # Amazon実売相場を取得
    amazon_market = get_amazon_market_price(keyword)
    if not amazon_market.get("found"):
        return []

    sell_price = amazon_market["median_price"]

    scored = []
    for item in buy_items:
        result = score_item_domestic(item, sell_price, sell_platform, max_buy_price)
        if result and result["profit_rate"] >= min_profit_rate:
            result["amazon_market"] = {
                "median": amazon_market.get("median_price"),
                "avg": amazon_market.get("avg_price"),
                "sample": amazon_market.get("sample_count"),
            }
            scored.append(result)

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored


# ── メインスキャン処理 ──────────────────────────────────────────────

def scan_keyword(
    keyword: str,
    target_platform: str = "eBay",
    max_buy_price: Optional[float] = None,
    limit: int = 10,
) -> List[Dict]:
    """
    キーワードを仕入れサイトで検索し、利益スコア付きの商品リストを返す。
    Amazon実売価格が取れた場合はそれを使って正確なROIを計算する。
    """
    buy_items: List[Dict] = []

    # メルカリ
    for item in search_mercari(keyword, limit):
        item["source"] = "メルカリ"
        buy_items.append(item)

    # Yahoo!オークション
    for item in search_yahoo_auction(keyword, limit):
        buy_items.append(item)

    # ラクマ
    for item in search_rakuma(keyword, limit):
        buy_items.append(item)

    # 実売価格を取得（プラットフォームに応じて最適なソースを選択）
    real_sell_price = None
    sell_price_meta: dict = {}

    if target_platform == "eBay":
        # eBay落札済み価格（出品中より信頼性が高い）
        try:
            sold_items = search_ebay_sold(keyword, limit=10)
            prices_jpy = [i['price_jpy'] for i in sold_items if i.get('price_jpy', 0) > 0]
            if prices_jpy:
                prices_jpy.sort()
                n = len(prices_jpy)
                median = prices_jpy[n // 2] if n % 2 == 1 else (prices_jpy[n // 2 - 1] + prices_jpy[n // 2]) // 2
                real_sell_price = float(median)
                sell_price_meta = {"source": "eBay落札", "median": median, "sample": n}
        except Exception:
            pass

    if real_sell_price is None and target_platform in ("Amazon", "Amazon.co.jp", "eBay"):
        # Amazon実売価格にフォールバック（Keepa優先）
        try:
            amazon_market = get_amazon_market_price(keyword)
            if amazon_market and amazon_market.get("found"):
                real_sell_price = float(amazon_market["median_price"])
                sell_price_meta = {
                    "source": f"Amazon({amazon_market.get('source', 'scraping')})",
                    "median": amazon_market.get("median_price"),
                    "sample": amazon_market.get("sample_count"),
                }
        except Exception:
            pass

    # スコアリング
    scored = []
    for item in buy_items:
        result = score_item(item, target_platform, max_buy_price, real_sell_price)
        if result:
            if sell_price_meta:
                result["sell_price_meta"] = sell_price_meta
            scored.append(result)

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored


def scan_all_keywords(limit: int = 5, db=None) -> List[Dict]:
    """
    登録済みの全キーワードをスキャンし、結果を統合して返す。
    db が渡された場合はDBからキーワードを読み書きする。
    """
    keywords = db.load_scan_keywords() if db is not None else load_scan_keywords()
    all_results = []

    for kw_conf in keywords:
        keyword = kw_conf["keyword"]
        platform = kw_conf.get("target_sell_platform", "eBay")
        max_price = kw_conf.get("max_buy_price")
        min_rate = kw_conf.get("min_profit_rate", 20.0)

        results = scan_keyword(keyword, platform, max_price, limit)

        # 最低利益率フィルタ
        results = [r for r in results if r["profit_rate"] >= min_rate]

        for r in results:
            r["scan_keyword"] = keyword
            r["scan_memo"] = kw_conf.get("memo", "")

        all_results.extend(results)

        # キーワードの最終スキャン時刻を更新
        last_scanned = datetime.now().isoformat()
        best_rate = max(r["profit_rate"] for r in results) if results else None
        if db is not None:
            db.update_scan_keyword(keyword, last_scanned, best_rate)
        else:
            kw_conf["last_scanned"] = last_scanned
            if best_rate is not None:
                kw_conf["best_profit_rate"] = best_rate

        time.sleep(0.5)  # レート制限対策

    if db is None:
        save_scan_keywords(keywords)

    # 全体をスコア順にソート
    all_results.sort(key=lambda x: x["score"], reverse=True)
    return all_results


# ── 結果キャッシュ管理 ──────────────────────────────────────────────

SCAN_RESULTS_FILE = Path(__file__).parent / "data" / "scan_results.json"


def save_scan_results(results: List[Dict]):
    SCAN_RESULTS_FILE.parent.mkdir(exist_ok=True)
    data = {
        "scanned_at": datetime.now().isoformat(),
        "count": len(results),
        "results": results,
    }
    SCAN_RESULTS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2))


def load_scan_results() -> Dict:
    try:
        if SCAN_RESULTS_FILE.exists():
            return json.loads(SCAN_RESULTS_FILE.read_text())
    except Exception:
        pass
    return {"scanned_at": None, "count": 0, "results": []}

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

from scrapers import search_mercari, search_yahoo_auction, search_rakuma
from global_calculator import (
    GLOBAL_PLATFORMS, calculate_global_profit,
    suggest_selling_price, get_intl_shipping,
)
from currency import get_rates

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
) -> Optional[Dict]:
    """
    仕入れ候補商品にスコアを付ける。

    スコアの基準:
    - 利益率
    - ROI
    - 手数料・送料を引いた純利益額（円）
    """
    buy_price = item.get("price", 0)
    if not buy_price or buy_price <= 0:
        return None
    if max_buy_price and buy_price > max_buy_price:
        return None  # 予算オーバー

    pf = GLOBAL_PLATFORMS.get(target_platform)
    if not pf:
        return None

    # 販売価格を推定（目標利益率30%の推奨価格）
    est_local = _estimate_sell_price(buy_price, target_platform)
    if not est_local or est_local <= 0:
        return None

    # 利益計算
    calc = calculate_global_profit(
        purchase_price_jpy=buy_price,
        selling_price_local=est_local,
        platform_key=target_platform,
        purchase_shipping_jpy=0,   # 仕入れ送料は0と仮定（最悪ケース）
        weight_g=500,
    )

    if "error" in calc or not calc.get("is_profitable"):
        return None

    profit_rate = calc.get("profit_rate", 0)
    net_profit = calc.get("net_profit_jpy", 0)
    roi = calc.get("roi", 0)

    # 総合スコア（0〜100）
    score = min(100, max(0,
        profit_rate * 1.5    # 利益率を重視
        + min(roi, 60) * 0.5  # ROI（上限60%でキャップ）
        + min(net_profit / 100, 20)  # 利益額ボーナス（最大20pt）
    ))

    return {
        # 商品情報
        "name": item.get("name", ""),
        "buy_price": buy_price,
        "buy_url": item.get("url", ""),
        "buy_image": item.get("image", ""),
        "buy_source": item.get("source", ""),
        "condition": item.get("condition", ""),

        # 販売情報
        "sell_platform": target_platform,
        "sell_platform_name": pf["name"],
        "sell_platform_flag": pf["flag"],
        "sell_currency": pf["currency"],
        "est_sell_price_local": round(est_local, 2),
        "est_sell_price_jpy": calc.get("selling_price_jpy", 0),

        # 利益
        "net_profit_jpy": round(net_profit),
        "profit_rate": round(profit_rate, 1),
        "roi": round(roi, 1),
        "intl_shipping_jpy": calc.get("intl_shipping_jpy", 0),
        "platform_fee_jpy": round(calc.get("platform_fee_jpy", 0)),
        "rating": calc.get("rating", "ok"),

        # スキャン情報
        "score": round(score, 1),
        "scanned_at": datetime.now().isoformat(),
    }


# ── メインスキャン処理 ──────────────────────────────────────────────

def scan_keyword(
    keyword: str,
    target_platform: str = "eBay",
    max_buy_price: Optional[float] = None,
    limit: int = 10,
) -> List[Dict]:
    """
    キーワードを仕入れサイトで検索し、利益スコア付きの商品リストを返す。
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

    # スコアリング
    scored = []
    for item in buy_items:
        result = score_item(item, target_platform, max_buy_price)
        if result:
            scored.append(result)

    # スコア順にソート
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

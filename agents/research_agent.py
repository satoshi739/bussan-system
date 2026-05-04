"""
Research Agent
- eBay落札相場・メルカリ相場・ヤフオク相場をリアルタイムで収集
- 自社の売上履歴から「何が利益に繋がったか」を分析
- 季節・トレンドを考慮した市場レポートをCEOに提出する
"""

import json
import time
import requests
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from bs4 import BeautifulSoup

HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/124.0.0.0 Safari/537.36'
    ),
    'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

# 季節・イベントカレンダー（月→注目カテゴリ）
SEASONAL_CALENDAR = {
    1:  {"season": "年明け・初売り", "hot": ["ゲーム", "フィギュア", "家電"], "note": "正月セール品の仕入れ狙い目"},
    2:  {"season": "バレンタイン", "hot": ["アクセサリー", "ブランド品", "雑貨"], "note": "プレゼント需要でブランド品高値"},
    3:  {"season": "卒業・入学シーズン", "hot": ["文房具", "カバン", "電子機器"], "note": "新生活準備で需要増"},
    4:  {"season": "ゴールデンウィーク前", "hot": ["アウトドア", "カメラ", "レジャー用品"], "note": "GW前に仕入れ最大化"},
    5:  {"season": "GW明け", "hot": ["ゲーム", "フィギュア", "コレクター品"], "note": "GWの売上分析して次を仕込む"},
    6:  {"season": "梅雨・父の日", "hot": ["時計", "財布", "電子機器"], "note": "父の日プレゼント需要"},
    7:  {"season": "夏休み・海外旅行ピーク", "hot": ["カメラ", "スポーツ", "ゲーム"], "note": "夏休み前に在庫確保"},
    8:  {"season": "お盆・夏フェス", "hot": ["音楽機器", "フェスグッズ", "アウトドア"], "note": "レトロ音楽機器eBayで高値"},
    9:  {"season": "秋の行楽シーズン", "hot": ["カメラ", "アウトドア", "ファッション"], "note": "秋冬物の仕入れ開始"},
    10: {"season": "ハロウィン", "hot": ["コスプレ", "フィギュア", "アニメグッズ"], "note": "海外でアニメ系需要急増"},
    11: {"season": "ブラックフライデー・ボーナス前", "hot": ["家電", "ゲーム", "ブランド品"], "note": "最大商戦期。在庫を最大化"},
    12: {"season": "クリスマス・年末", "hot": ["ゲーム", "おもちゃ", "アクセサリー", "時計"], "note": "年間最高値期。高利益狙い"},
}


class ResearchAgent:
    def __init__(self, db=None):
        self.db = db
        self._session = requests.Session()
        self._session.headers.update(HEADERS)

    # ── eBay落札相場 ────────────────────────────────────────────────

    def search_ebay_sold(self, keyword: str, limit: int = 10) -> Dict:
        """
        eBayの落札済み商品から実際の相場を取得する。
        Returns: {"keyword": ..., "avg_price_usd": ..., "min": ..., "max": ..., "items": [...]}
        """
        try:
            url = "https://www.ebay.com/sch/i.html"
            params = {
                "_nkw": keyword,
                "LH_Sold": "1",
                "LH_Complete": "1",
                "_sacat": "0",
                "_ipg": str(min(limit * 2, 48)),
            }
            resp = self._session.get(url, params=params, timeout=10)
            if resp.status_code != 200:
                return {"error": f"HTTP {resp.status_code}", "items": []}

            soup = BeautifulSoup(resp.text, "html.parser")
            items = []

            for card in soup.select(".s-item")[:limit]:
                title_el = card.select_one(".s-item__title")
                price_el = card.select_one(".s-item__price")
                sold_el  = card.select_one(".s-item__caption--signal")
                link_el  = card.select_one(".s-item__link")

                if not title_el or not price_el:
                    continue
                title = title_el.get_text(strip=True)
                if title in ("Shop on eBay", "New Listing"):
                    continue

                price_text = price_el.get_text(strip=True)
                price_usd = _parse_usd(price_text)
                if price_usd <= 0:
                    continue

                items.append({
                    "title": title,
                    "price_usd": price_usd,
                    "sold_date": sold_el.get_text(strip=True) if sold_el else "",
                    "url": link_el["href"] if link_el else "",
                })

            if not items:
                return {"keyword": keyword, "avg_price_usd": 0, "items": []}

            prices = [i["price_usd"] for i in items]
            return {
                "keyword": keyword,
                "avg_price_usd": round(sum(prices) / len(prices), 2),
                "min_price_usd": round(min(prices), 2),
                "max_price_usd": round(max(prices), 2),
                "sold_count": len(items),
                "items": items[:5],
            }

        except Exception as e:
            return {"keyword": keyword, "error": str(e), "items": []}

    # ── メルカリ相場 ─────────────────────────────────────────────────

    def search_mercari_sold(self, keyword: str, limit: int = 10) -> Dict:
        """メルカリの売り切れ商品（実売価格）から相場を取得する"""
        try:
            from scrapers import search_mercari_sold
            items = search_mercari_sold(keyword, limit=limit)
            if not items:
                return {"keyword": keyword, "avg_price_jpy": 0, "items": []}

            prices = [i.get("price", 0) for i in items if i.get("price", 0) > 0]
            if not prices:
                return {"keyword": keyword, "avg_price_jpy": 0, "items": []}

            return {
                "keyword": keyword,
                "avg_price_jpy": round(sum(prices) / len(prices)),
                "min_price_jpy": min(prices),
                "max_price_jpy": max(prices),
                "listing_count": len(prices),
                "items": items[:5],
            }
        except Exception as e:
            return {"keyword": keyword, "error": str(e), "items": []}

    # ── ヤフオク相場 ─────────────────────────────────────────────────

    def search_yahoo_sold(self, keyword: str, limit: int = 10) -> Dict:
        """ヤフオクの落札価格から相場を取得する"""
        try:
            from scrapers import search_yahoo_auction
            items = search_yahoo_auction(keyword, limit=limit)
            if not items:
                return {"keyword": keyword, "avg_price_jpy": 0, "items": []}

            prices = [i.get("price", 0) for i in items if i.get("price", 0) > 0]
            if not prices:
                return {"keyword": keyword, "avg_price_jpy": 0, "items": []}

            return {
                "keyword": keyword,
                "avg_price_jpy": round(sum(prices) / len(prices)),
                "min_price_jpy": min(prices),
                "max_price_jpy": max(prices),
                "listing_count": len(prices),
                "items": items[:5],
            }
        except Exception as e:
            return {"keyword": keyword, "error": str(e), "items": []}

    # ── 自社売上履歴分析 ──────────────────────────────────────────────

    def analyze_own_history(self, days: int = 90, user_id: str = 'default') -> Dict:
        """
        過去N日間の仕入れ→販売データを分析し、
        「何が稼げて何が稼げなかったか」を返す。
        """
        if not self.db:
            return {"error": "DB未接続"}

        since = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

        # 売れた商品
        sold = self.db.conn.execute("""
            SELECT p.product_name, p.platform as buy_platform,
                   l.selling_platform, p.purchase_price,
                   s.sale_price, s.net_profit,
                   ROUND(s.net_profit / s.sale_price * 100, 1) as profit_rate
            FROM sales s
            JOIN listings l ON s.listing_id = l.id
            JOIN purchases p ON l.purchase_id = p.id
            WHERE p.user_id = ? AND s.sale_date >= ?
            ORDER BY s.net_profit DESC
        """, (user_id, since)).fetchall()

        # 売れ残り（仕入れたが販売されていない）
        unsold = self.db.conn.execute("""
            SELECT p.product_name, p.platform, p.purchase_price,
                   p.purchase_date, p.status
            FROM purchases p
            WHERE p.user_id = ? AND p.purchase_date >= ?
              AND p.status NOT IN ('sold', 'returned')
              AND p.id NOT IN (SELECT purchase_id FROM listings WHERE status = 'active')
        """, (user_id, since)).fetchall()

        sold_list = [dict(r) for r in sold]
        unsold_list = [dict(r) for r in unsold]

        # 利益率でカテゴリ分類
        profitable = [s for s in sold_list if s.get("profit_rate", 0) >= 25]
        unprofitable = [s for s in sold_list if s.get("profit_rate", 0) < 10]

        total_profit = sum(s.get("net_profit", 0) for s in sold_list)
        avg_rate = (
            sum(s.get("profit_rate", 0) for s in sold_list) / len(sold_list)
            if sold_list else 0
        )

        return {
            "period_days": days,
            "total_sold": len(sold_list),
            "total_unsold": len(unsold_list),
            "total_profit_jpy": round(total_profit),
            "avg_profit_rate": round(avg_rate, 1),
            "top_profitable": profitable[:5],
            "unprofitable": unprofitable[:3],
            "unsold_items": unsold_list[:5],
            "insight": _generate_history_insight(sold_list, unsold_list, avg_rate),
        }

    # ── 季節・トレンド分析 ────────────────────────────────────────────

    def get_seasonal_intelligence(self) -> Dict:
        """現在の月に基づく季節インテリジェンスを返す"""
        now = datetime.now()
        current = SEASONAL_CALENDAR.get(now.month, {})
        next_month = SEASONAL_CALENDAR.get(now.month % 12 + 1, {})

        return {
            "current_month": now.month,
            "current_season": current.get("season", ""),
            "hot_categories": current.get("hot", []),
            "strategy_note": current.get("note", ""),
            "next_month_preview": {
                "season": next_month.get("season", ""),
                "hot": next_month.get("hot", []),
            },
            "days_in_month_remaining": (
                datetime(now.year, now.month % 12 + 1, 1) - now
            ).days if now.month < 12 else (datetime(now.year + 1, 1, 1) - now).days,
        }

    # ── 総合市場レポート ──────────────────────────────────────────────

    def generate_market_report(self, keywords: List[str] = None) -> Dict:
        """
        CEOに提出する総合市場レポートを生成する。
        キーワードリストが指定された場合はその相場も含める。
        """
        report = {
            "generated_at": datetime.now().isoformat(),
            "seasonal": self.get_seasonal_intelligence(),
            "own_history": self.analyze_own_history(days=30),
            "market_data": [],
        }

        if keywords:
            for kw in keywords[:5]:  # 最大5キーワード
                ebay_data = self.search_ebay_sold(kw, limit=8)
                mercari_data = self.search_mercari_sold(kw, limit=5)
                report["market_data"].append({
                    "keyword": kw,
                    "ebay": ebay_data,
                    "mercari": mercari_data,
                })
                time.sleep(1.5)  # レート制限対策

        return report


# ── ユーティリティ ───────────────────────────────────────────────────

def _parse_usd(text: str) -> float:
    """'$12.99' や '$10.00 to $15.00' から最初の金額を抽出する"""
    import re
    text = text.replace(",", "")
    m = re.search(r"\$?([\d]+\.?\d*)", text)
    return float(m.group(1)) if m else 0.0


def _generate_history_insight(sold: list, unsold: list, avg_rate: float) -> str:
    """売上履歴から洞察テキストを生成する"""
    insights = []
    if avg_rate >= 30:
        insights.append(f"直近の平均利益率{avg_rate:.1f}%は優秀です。この水準を維持してください。")
    elif avg_rate >= 20:
        insights.append(f"平均利益率{avg_rate:.1f}%。あと5〜10%の改善余地があります。")
    else:
        insights.append(f"平均利益率{avg_rate:.1f}%は低水準。仕入れ価格の見直しが必要です。")

    if unsold:
        insights.append(f"売れ残りが{len(unsold)}件あります。早期値下げか別プラットフォームへの移動を検討してください。")

    if sold:
        top = sold[0]
        insights.append(f"最高利益商品: {top.get('product_name', '')}（利益率{top.get('profit_rate', 0):.1f}%）。同カテゴリの仕入れを強化してください。")

    return " / ".join(insights)

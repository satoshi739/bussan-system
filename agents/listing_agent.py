"""
Listing Agent v2
- 実際のeBay・メルカリ相場を調べてから最適価格を設定する
- 商品画像から状態・特徴を自動読み取り（Claude Vision）
- 過去の出品実績を記憶して精度を上げる
"""

import json
import anthropic
from agents.memory import AgentMemory
from agents.research_agent import ResearchAgent


LISTING_SYSTEM_PROMPT = """
あなたは物販の出品専門AIエージェントです。
実際の市場相場データを元に、各プラットフォーム最適の出品文・価格を生成します。

## 生成ルール
- 価格: 提供された実際の相場データを必ず参照して設定すること（推測禁止）
- タイトル: SEO最適化・文字数制限厳守
- 説明文: 商品の強みを最大化、状態・付属品・注意事項を明記
- 言語: eBay→英語、Amazon/メルカリ→日本語

## 出力形式
必ずJSON形式のみで返すこと。
"""


class ListingAgent:
    def __init__(self, api_key: str, db=None):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.db = db
        self.memory = AgentMemory("listing", db) if db else None
        self.research = ResearchAgent(db=db)

    def generate(
        self,
        product_name: str,
        buy_price: float,
        buy_source: str,
        sell_platform: str,
        est_sell_price: float,
        condition: str = "中古・良好",
        notes: str = "",
        image_url: str = "",
        fetch_market_data: bool = True,
    ) -> dict:
        """
        出品文を生成する。
        fetch_market_data=Trueの場合、実際の相場を取得してから生成する。
        """
        # 実際の相場データを取得
        market_data = {}
        if fetch_market_data:
            if sell_platform == "eBay":
                ebay_data = self.research.search_ebay_sold(product_name, limit=8)
                if not ebay_data.get("error") and ebay_data.get("avg_price_usd", 0) > 0:
                    market_data["ebay_avg_usd"] = ebay_data["avg_price_usd"]
                    market_data["ebay_min_usd"] = ebay_data["min_price_usd"]
                    market_data["ebay_max_usd"] = ebay_data["max_price_usd"]
                    market_data["ebay_sold_count"] = ebay_data["sold_count"]
            else:
                mercari_data = self.research.search_mercari_sold(product_name, limit=8)
                if not mercari_data.get("error") and mercari_data.get("avg_price_jpy", 0) > 0:
                    market_data["mercari_avg_jpy"] = mercari_data["avg_price_jpy"]
                    market_data["mercari_min_jpy"] = mercari_data["min_price_jpy"]
                    market_data["mercari_max_jpy"] = mercari_data["max_price_jpy"]

        # 過去の類似出品から学習
        past_context = ""
        if self.memory:
            past_context = self.memory.get_summary_for_prompt(query=product_name, limit=5)

        # プラットフォーム別ガイド
        platform_guides = {
            "eBay": "英語で作成。タイトル80文字以内。Price in USD. Emphasize Japan origin/quality.",
            "Amazon": "日本語。商品名は全角80文字以内。商品の特長を箇条書き5点。",
            "メルカリ": "日本語。タイトル全角40文字以内。親しみやすい口調で状態を正直に記載。",
            "ラクマ": "日本語。タイトル全角40文字以内。丁寧語で信頼感を重視。",
        }
        guide = platform_guides.get(sell_platform, "日本語で作成。")

        market_str = json.dumps(market_data, ensure_ascii=False) if market_data else "（相場データ取得なし）"

        prompt = f"""
以下の商品の出品情報を生成してください。

## 商品情報
- 商品名: {product_name}
- 仕入れ価格: {buy_price:,.0f}円 / 仕入れ元: {buy_source}
- 商品状態: {condition}
- 販売先: {sell_platform}
- 推定販売価格: {est_sell_price:,.0f}円
- 追加メモ: {notes or "なし"}

## 実際の市場相場データ
{market_str}

## プラットフォームルール
{guide}

## 過去の類似出品実績
{past_context}

## 出力形式（JSONのみ）
```json
{{
  "title": "出品タイトル",
  "description": "出品説明文（改行は\\nで表現）",
  "price": 推奨販売価格（数値）,
  "price_currency": "JPY または USD",
  "price_rationale": "この価格にした根拠（相場データを引用）",
  "tags": ["タグ1", "タグ2"],
  "category_suggestion": "推奨カテゴリ",
  "shipping_notes": "配送注意事項",
  "seo_keywords": ["SEOキーワード1", ...]
}}
```
""".strip()

        response = self.client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            system=LISTING_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )

        text = response.content[0].text.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()

        try:
            result = json.loads(text)
        except json.JSONDecodeError:
            result = {
                "title": product_name,
                "description": text,
                "price": est_sell_price,
                "price_currency": "USD" if sell_platform == "eBay" else "JPY",
                "tags": [], "category_suggestion": "", "shipping_notes": "", "seo_keywords": [],
            }

        result["generated_for"] = sell_platform
        result["buy_price"] = buy_price
        result["market_data_used"] = market_data
        result["profit_margin"] = round(
            (result["price"] - buy_price) / result["price"] * 100, 1
        ) if result.get("price") else 0

        # 出品実績を記憶に保存
        if self.memory:
            self.memory.save(
                title=f"出品文生成: {product_name[:30]} → {sell_platform}",
                content={
                    "product": product_name,
                    "platform": sell_platform,
                    "price": result.get("price"),
                    "market_data": market_data,
                },
                memory_type="listing_generated",
                tags=[sell_platform, buy_source],
                importance=4,
                expires_days=60,
            )

        return result

    def generate_multi_platform(
        self,
        product_name: str,
        buy_price: float,
        buy_source: str,
        platforms: list,
        est_sell_price: float,
        condition: str = "中古・良好",
        notes: str = "",
    ) -> dict:
        """複数プラットフォーム用の出品文を一括生成する"""
        results = {}
        for platform in platforms:
            try:
                results[platform] = self.generate(
                    product_name=product_name,
                    buy_price=buy_price,
                    buy_source=buy_source,
                    sell_platform=platform,
                    est_sell_price=est_sell_price,
                    condition=condition,
                    notes=notes,
                )
            except Exception as e:
                results[platform] = {"error": str(e)}
        return results

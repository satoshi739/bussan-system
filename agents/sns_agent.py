"""
SNS Agent v2
- 過去の投稿パフォーマンスから学習する（記憶付き）
- 季節・トレンドを反映した投稿文を生成する
- 3段階キャンペーン（仕入れ→出品→売れた）を一括管理する
"""

import json
from datetime import datetime
import anthropic
from agents.memory import AgentMemory
from agents.research_agent import SEASONAL_CALENDAR


SNS_SYSTEM_PROMPT = """
あなたは物販ビジネスのSNSマーケティング専門AIエージェントです。
商品情報・季節データ・過去の実績を元に、各SNSに最適化した投稿文を生成します。

## 生成スタイル
- Instagram: 絵文字多用・改行で読みやすく・ハッシュタグ25個前後
- X(Twitter): 140文字以内のキャッチーな文章・ハッシュタグ3個以内
- TikTok: 動画説明文・若者向けトーン・トレンドワード活用
- 全般: 「普通の人が副業で稼いでいる」リアリティのある温かみのある口調

## 必ず含める要素
- 具体的な仕入れ値と販売値（透明性が信頼を生む）
- 商品ジャンルに合わせたハッシュタグ
- フォロワーが「自分もできそう」と思えるリアルな感情表現

## 出力形式
必ずJSON形式のみで返すこと。
"""

# 最適投稿時間帯（プラットフォーム別）
OPTIMAL_POST_TIMES = {
    "instagram": {"weekday": "19:00〜21:00", "weekend": "10:00〜12:00", "best_day": "火・水・木"},
    "twitter":   {"weekday": "07:00〜09:00 / 12:00〜13:00 / 20:00〜22:00", "weekend": "10:00〜12:00", "best_day": "平日全般"},
    "tiktok":    {"weekday": "19:00〜23:00", "weekend": "09:00〜11:00", "best_day": "木・金・土"},
}


class SNSAgent:
    def __init__(self, api_key: str, db=None):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.db = db
        self.memory = AgentMemory("sns", db) if db else None

    def generate(
        self,
        product_name: str,
        buy_price: float,
        sell_price: float,
        profit_jpy: float,
        buy_source: str,
        sell_platform: str,
        platforms: list = None,
        post_type: str = "listing",
    ) -> dict:
        """SNS投稿文を生成する"""
        if platforms is None:
            platforms = ["instagram", "twitter", "tiktok"]

        # 季節インテリジェンス
        month = datetime.now().month
        seasonal = SEASONAL_CALENDAR.get(month, {})

        # 過去の投稿実績から学習
        past_context = ""
        if self.memory:
            past_context = self.memory.get_summary_for_prompt(
                query=f"{sell_platform} {post_type}", limit=5
            )

        # 投稿タイプ別コンテキスト
        type_contexts = {
            "haul":    f"{buy_source}で掘り出し物を発見して仕入れました！",
            "listing": f"この商品を{sell_platform}に出品しました！",
            "sold":    f"この商品が{sell_platform}で売れました！利益確定！",
        }

        profit_rate = round((sell_price - buy_price) / sell_price * 100, 1) if sell_price > 0 else 0
        optimal_times = {p: OPTIMAL_POST_TIMES.get(p, {}) for p in platforms}

        prompt = f"""
以下の情報からSNS投稿文を生成してください。

## 商品・取引情報
- 商品名: {product_name}
- 仕入れ値: {buy_price:,.0f}円（{buy_source}）
- 販売価格: {sell_price:,.0f}円（{sell_platform}）
- 利益: {profit_jpy:,.0f}円（利益率 {profit_rate}%）
- 投稿タイプ: {type_contexts.get(post_type, post_type)}
- 対象SNS: {', '.join(platforms)}

## 季節・トレンド情報
- 今の季節: {seasonal.get('season', '')}
- 今月の注目ジャンル: {', '.join(seasonal.get('hot', []))}
- 戦略メモ: {seasonal.get('note', '')}

## 過去の投稿実績から学んだこと
{past_context or '（まだ実績なし）'}

## 各プラットフォームの最適投稿時間
{json.dumps(optimal_times, ensure_ascii=False)}

## 出力形式（JSONのみ）
{{
  "instagram": {{
    "caption": "投稿本文（絵文字・改行含む）",
    "hashtags": ["#タグ1", "#タグ2", ...],
    "full_post": "caption + 空行 + hashtags を結合した完全投稿文",
    "optimal_time": "最適投稿時間帯"
  }},
  "twitter": {{
    "text": "140文字以内のツイート（ハッシュタグ含む）",
    "optimal_time": "最適投稿時間帯"
  }},
  "tiktok": {{
    "caption": "TikTok動画説明文",
    "hashtags": ["#タグ1", ...],
    "optimal_time": "最適投稿時間帯"
  }}
}}

対象プラットフォームのみ含め、JSONのみ返してください。
""".strip()

        response = self.client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            system=SNS_SYSTEM_PROMPT,
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
            result = {"raw": text}

        result["post_type"] = post_type
        result["product_name"] = product_name
        result["generated_at"] = datetime.now().isoformat()
        result["seasonal_context"] = seasonal.get("season", "")

        # 生成実績を記憶
        if self.memory:
            self.memory.save(
                title=f"SNS生成: {post_type} / {product_name[:20]}",
                content={
                    "product": product_name,
                    "post_type": post_type,
                    "sell_platform": sell_platform,
                    "profit_rate": profit_rate,
                    "platforms": platforms,
                },
                memory_type="sns_generated",
                tags=[post_type, sell_platform] + platforms,
                importance=4,
                expires_days=30,
            )

        return result

    def generate_campaign(
        self,
        product_name: str,
        buy_price: float,
        sell_price: float,
        profit_jpy: float,
        buy_source: str,
        sell_platform: str,
    ) -> dict:
        """仕入れ→出品→売れたの3段階投稿セットを一括生成する"""
        return {
            "haul": self.generate(
                product_name, buy_price, sell_price, profit_jpy,
                buy_source, sell_platform, post_type="haul",
            ),
            "listing": self.generate(
                product_name, buy_price, sell_price, profit_jpy,
                buy_source, sell_platform, post_type="listing",
            ),
            "sold": self.generate(
                product_name, buy_price, sell_price, profit_jpy,
                buy_source, sell_platform, post_type="sold",
            ),
            "product_name": product_name,
            "campaign_created_at": datetime.now().isoformat(),
        }

    def record_performance(
        self,
        sns_content_id: int,
        platform: str,
        likes: int = 0,
        comments: int = 0,
        reach: int = 0,
        led_to_sale: bool = False,
    ):
        """投稿のパフォーマンスを記録して学習する"""
        if not self.memory:
            return

        score = likes + comments * 3 + (1000 if led_to_sale else 0)
        importance = min(10, max(1, score // 100 + (8 if led_to_sale else 4)))

        self.memory.save(
            title=f"SNS実績: {platform} いいね{likes} コメ{comments}{'💰売上繋がった' if led_to_sale else ''}",
            content={
                "content_id": sns_content_id,
                "platform": platform,
                "likes": likes,
                "comments": comments,
                "reach": reach,
                "led_to_sale": led_to_sale,
                "engagement_score": score,
            },
            memory_type="sns_performance",
            tags=[platform, "led_to_sale" if led_to_sale else "no_sale"],
            importance=importance,
            expires_days=90,
        )

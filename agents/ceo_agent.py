"""
AI CEO Agent v2
- Research Agentから市場データを受け取り、戦略的に判断する
- 過去の承認・売上履歴から学習する（記憶付き）
- エージェント同士が連携する真のマルチエージェント指揮官
"""

import json
import time
from datetime import datetime
from typing import Optional

import anthropic

from profit_scanner import scan_all_keywords, scan_keyword, load_scan_keywords
from agents.research_agent import ResearchAgent
from agents.memory import AgentMemory


CEO_SYSTEM_PROMPT = """
あなたは物販ビジネスのAI CEOです。Satoshi（オーナー）から目標・予算を受け取り、
Research Agent・Listing Agent・SNS Agentを指揮して利益を最大化します。

## あなたの役割
1. Satoshiの指示と市場データ・過去実績を総合して最良の判断をする
2. Research Agentに市場調査を依頼し、その結果を戦略に活かす
3. 利益スキャンを実行し、候補を承認キューに追加する
4. 判断理由を明確に説明し、Satoshiが迷わず承認/却下できる情報を提供する

## 重要ルール
- 購入の最終決定は必ずSatoshiが行う（承認キューへの追加のみ）
- 予算・過去の失敗パターン・季節トレンドを必ず考慮する
- 「なぜこの商品を推薦するか」の根拠を過去データや相場と結びつけて説明する
- セッション最後に必ず report_summary で結果を報告する
"""

CEO_TOOLS = [
    {
        "name": "consult_research_agent",
        "description": "Research Agentに市場調査を依頼する。eBay相場・メルカリ相場・季節トレンドを取得できる。",
        "input_schema": {
            "type": "object",
            "properties": {
                "task": {
                    "type": "string",
                    "enum": ["ebay_sold", "mercari_sold", "seasonal", "own_history", "full_report"],
                    "description": "調査タスクの種類",
                },
                "keyword": {"type": "string", "description": "調査するキーワード（ebay_sold/mercari_sold時に必要）"},
            },
            "required": ["task"],
        },
    },
    {
        "name": "recall_memory",
        "description": "過去の承認・却下・売上実績から学習した記憶を検索する。判断の根拠として使う。",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "検索キーワード（商品名・カテゴリ・プラットフォームなど）"},
            },
            "required": ["query"],
        },
    },
    {
        "name": "scan_market",
        "description": "登録済みの全キーワードで利益スキャンを実行し、スコアTop候補を返す",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": "各KWあたりの最大件数", "default": 5},
            },
            "required": [],
        },
    },
    {
        "name": "scan_keyword",
        "description": "指定キーワードで利益スキャンを実行する",
        "input_schema": {
            "type": "object",
            "properties": {
                "keyword": {"type": "string"},
                "target_platform": {"type": "string", "default": "eBay"},
                "max_buy_price": {"type": "number"},
            },
            "required": ["keyword"],
        },
    },
    {
        "name": "add_to_approval_queue",
        "description": "仕入れ候補を承認キューに追加してSatoshiに確認を求める",
        "input_schema": {
            "type": "object",
            "properties": {
                "product_name": {"type": "string"},
                "buy_price": {"type": "number"},
                "buy_url": {"type": "string"},
                "buy_source": {"type": "string"},
                "buy_image": {"type": "string"},
                "sell_platform": {"type": "string"},
                "est_sell_price": {"type": "number"},
                "net_profit_jpy": {"type": "number"},
                "profit_rate": {"type": "number"},
                "score": {"type": "number"},
                "ceo_reason": {
                    "type": "string",
                    "description": "推薦理由。必ずeBay相場・過去実績・季節データを根拠として含めること",
                },
            },
            "required": [
                "product_name", "buy_price", "buy_url", "buy_source",
                "sell_platform", "est_sell_price", "net_profit_jpy",
                "profit_rate", "score", "ceo_reason",
            ],
        },
    },
    {
        "name": "get_pending_approvals",
        "description": "現在の承認待ちリストと合計金額を取得する",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "report_summary",
        "description": "セッション終了時にSatoshiへの報告レポートを作成する",
        "input_schema": {
            "type": "object",
            "properties": {
                "summary": {"type": "string"},
                "scanned_count": {"type": "integer"},
                "queued_count": {"type": "integer"},
                "total_investment": {"type": "number"},
                "expected_profit": {"type": "number"},
                "market_highlights": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "今回発見した市場トレンドや重要インサイト",
                },
                "next_actions": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Satoshiへの推奨アクションリスト",
                },
            },
            "required": ["summary", "scanned_count", "queued_count", "next_actions"],
        },
    },
]


class CEOAgent:
    def __init__(self, api_key: str, db=None):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.db = db
        self.memory = AgentMemory("ceo", db) if db else None
        self.research = ResearchAgent(db=db)
        self._session_log: list = []
        self._queued_items: list = []
        self._scanned_count = 0

    def _log(self, event: str, data: dict = None):
        entry = {
            "timestamp": datetime.now().isoformat(),
            "event": event,
            "data": data or {},
        }
        self._session_log.append(entry)

    def _handle_tool(self, tool_name: str, tool_input: dict) -> str:
        self._log(f"tool:{tool_name}", tool_input)

        if tool_name == "consult_research_agent":
            return self._handle_research(tool_input)

        elif tool_name == "recall_memory":
            if self.memory:
                query = tool_input.get("query", "")
                summary = self.memory.get_summary_for_prompt(query=query, limit=10)
                return json.dumps({"memories": summary}, ensure_ascii=False)
            return json.dumps({"memories": "（記憶機能未接続）"})

        elif tool_name == "scan_market":
            try:
                results = scan_all_keywords(limit=tool_input.get("limit", 5))
                self._scanned_count += len(results)
                return json.dumps({"results": results[:10], "total_found": len(results)}, ensure_ascii=False)
            except Exception as e:
                return json.dumps({"error": str(e), "results": []})

        elif tool_name == "scan_keyword":
            try:
                results = scan_keyword(
                    tool_input["keyword"],
                    tool_input.get("target_platform", "eBay"),
                    tool_input.get("max_buy_price"),
                    limit=8,
                )
                self._scanned_count += len(results)
                return json.dumps({"results": results[:5]}, ensure_ascii=False)
            except Exception as e:
                return json.dumps({"error": str(e), "results": []})

        elif tool_name == "add_to_approval_queue":
            if self.db:
                item_id = self.db.add_approval_queue_item({
                    **tool_input,
                    "status": "pending",
                    "created_at": datetime.now().isoformat(),
                })
                self._queued_items.append({**tool_input, "id": item_id})
                # 記憶に候補として記録
                if self.memory:
                    self.memory.save(
                        title=f"承認キュー追加: {tool_input.get('product_name','')}",
                        content=tool_input,
                        memory_type="pending",
                        tags=[tool_input.get("sell_platform",""), tool_input.get("buy_source","")],
                        importance=6,
                        expires_days=30,
                    )
                return json.dumps({"ok": True, "queue_id": item_id})
            self._queued_items.append(tool_input)
            return json.dumps({"ok": True, "queue_id": len(self._queued_items)})

        elif tool_name == "get_pending_approvals":
            if self.db:
                items = self.db.get_approval_queue(status="pending")
                total = sum(i.get("buy_price", 0) for i in items)
                return json.dumps({"count": len(items), "total_jpy": total}, ensure_ascii=False)
            return json.dumps({"count": len(self._queued_items)})

        elif tool_name == "report_summary":
            self._log("report", tool_input)
            # 重要なインサイトを記憶に保存
            if self.memory and tool_input.get("market_highlights"):
                for highlight in tool_input["market_highlights"]:
                    self.memory.save(
                        title=f"市場インサイト ({datetime.now().strftime('%Y-%m-%d')})",
                        content=highlight,
                        memory_type="market",
                        importance=7,
                        expires_days=14,
                    )
            return json.dumps({"ok": True, "report": tool_input}, ensure_ascii=False)

        return json.dumps({"error": f"Unknown tool: {tool_name}"})

    def _handle_research(self, tool_input: dict) -> str:
        task = tool_input.get("task")
        keyword = tool_input.get("keyword", "")

        try:
            if task == "ebay_sold":
                data = self.research.search_ebay_sold(keyword)
                if self.memory and not data.get("error") and data.get("avg_price_usd", 0) > 0:
                    self.memory.save_market_insight(
                        keyword,
                        f"eBay相場: 平均${data['avg_price_usd']} ({data.get('sold_count',0)}件落札)",
                        data,
                    )
                return json.dumps(data, ensure_ascii=False)

            elif task == "mercari_sold":
                data = self.research.search_mercari_sold(keyword)
                return json.dumps(data, ensure_ascii=False)

            elif task == "seasonal":
                data = self.research.get_seasonal_intelligence()
                return json.dumps(data, ensure_ascii=False)

            elif task == "own_history":
                data = self.research.analyze_own_history(days=60)
                return json.dumps(data, ensure_ascii=False)

            elif task == "full_report":
                keywords = load_scan_keywords()
                kw_list = [k["keyword"] for k in keywords[:3]]
                data = self.research.generate_market_report(kw_list)
                return json.dumps(data, ensure_ascii=False)

            return json.dumps({"error": f"Unknown research task: {task}"})
        except Exception as e:
            return json.dumps({"error": str(e)})

    def run(self, goal: str, budget_jpy: Optional[float] = None, max_turns: int = 12) -> dict:
        self._log("session_start", {"goal": goal, "budget_jpy": budget_jpy})

        # 過去の記憶をプロンプトに組み込む
        past_memories = ""
        if self.memory:
            past_memories = self.memory.get_summary_for_prompt(query=goal, limit=8)

        keywords = load_scan_keywords()
        kw_list = ", ".join(k["keyword"] for k in keywords) if keywords else "（未登録）"
        budget_str = f"予算: {budget_jpy:,.0f}円" if budget_jpy else "予算: 未設定"

        user_message = f"""
## Satoshiからの指示
{goal}

{budget_str}
登録済みスキャンキーワード: {kw_list}

## 過去の記憶・学習データ
{past_memories}

## 行動指針
1. まず consult_research_agent で季節トレンドと自社履歴を確認する
2. 利益スキャンを実行し、eBay相場と照らし合わせて判断する
3. 過去の記憶を参考に「同カテゴリで実績があるか」を確認する
4. 根拠の明確な候補のみ承認キューに追加する
5. 最後に report_summary で結果とインサイトを報告する
""".strip()

        messages = [{"role": "user", "content": user_message}]
        final_report = {}
        turn = 0

        while turn < max_turns:
            turn += 1
            response = self.client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=4096,
                system=CEO_SYSTEM_PROMPT,
                tools=CEO_TOOLS,
                messages=messages,
            )

            messages.append({"role": "assistant", "content": response.content})

            if response.stop_reason == "end_turn":
                break
            if response.stop_reason != "tool_use":
                break

            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result_str = self._handle_tool(block.name, block.input)
                    if block.name == "report_summary":
                        try:
                            final_report = json.loads(result_str).get("report", {})
                        except Exception:
                            pass
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result_str,
                    })

            messages.append({"role": "user", "content": tool_results})
            time.sleep(0.3)

        final_text = "".join(
            block.text for block in response.content if hasattr(block, "text")
        )

        self._log("session_end", {"turns": turn, "queued": len(self._queued_items)})

        return {
            "status": "completed",
            "turns": turn,
            "scanned_count": self._scanned_count,
            "queued_count": len(self._queued_items),
            "queued_items": self._queued_items,
            "report": final_report,
            "final_message": final_text,
            "log": self._session_log,
        }

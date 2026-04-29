"""
Agent Memory System
- 全エージェント共通の記憶基盤
- 学習・パターン・市場データを永続化する
- キーワード検索で関連記憶を素早く取り出す
"""

import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Union


class AgentMemory:
    def __init__(self, agent_name: str, db):
        self.agent_name = agent_name
        self.db = db

    def save(
        self,
        title: str,
        content: Union[str, dict],
        memory_type: str = "learning",
        tags: List[str] = None,
        importance: int = 5,
        expires_days: int = None,
    ) -> int:
        """記憶を保存する。Returns: memory_id"""
        if isinstance(content, dict):
            content = json.dumps(content, ensure_ascii=False)

        tags_json = json.dumps(tags or [], ensure_ascii=False)
        expires_at = None
        if expires_days:
            expires_at = (datetime.now() + timedelta(days=expires_days)).isoformat()

        cursor = self.db.conn.execute("""
            INSERT INTO agent_memory
            (agent_name, memory_type, title, content, tags, importance, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (self.agent_name, memory_type, title, content, tags_json, importance, expires_at))
        self.db.conn.commit()
        return cursor.lastrowid

    def recall(self, query: str = "", memory_type: str = None, limit: int = 10) -> List[Dict]:
        """
        クエリに関連する記憶を検索して返す。
        queryはtitle/contentに対するキーワード検索。
        """
        now = datetime.now().isoformat()
        params = [self.agent_name, now]

        sql = """
            SELECT * FROM agent_memory
            WHERE agent_name = ?
              AND (expires_at IS NULL OR expires_at > ?)
        """
        if memory_type:
            sql += " AND memory_type = ?"
            params.append(memory_type)

        if query:
            sql += " AND (title LIKE ? OR content LIKE ? OR tags LIKE ?)"
            q = f"%{query}%"
            params.extend([q, q, q])

        sql += " ORDER BY importance DESC, last_accessed DESC LIMIT ?"
        params.append(limit)

        rows = self.db.conn.execute(sql, params).fetchall()

        result = []
        ids_to_update = []
        for r in rows:
            d = dict(r)
            try:
                d["tags"] = json.loads(d.get("tags") or "[]")
            except Exception:
                d["tags"] = []
            # contentがJSONなら辞書に変換
            try:
                d["content_parsed"] = json.loads(d["content"])
            except Exception:
                d["content_parsed"] = d["content"]
            result.append(d)
            ids_to_update.append(d["id"])

        # アクセス日時・回数を更新
        if ids_to_update:
            placeholders = ",".join("?" * len(ids_to_update))
            self.db.conn.execute(
                f"UPDATE agent_memory SET last_accessed = ?, access_count = access_count + 1 WHERE id IN ({placeholders})",
                [now] + ids_to_update
            )
            self.db.conn.commit()

        return result

    def learn_from_approval(self, item: Dict, approved: bool, reason: str = ""):
        """
        承認/却下の結果から学習する。
        CEOが「なぜこれを買うべきか/やめるべきか」を蓄積。
        """
        title = f"{'承認' if approved else '却下'}: {item.get('product_name', '')[:30]}"
        content = {
            "product_name": item.get("product_name"),
            "buy_price": item.get("buy_price"),
            "sell_platform": item.get("sell_platform"),
            "profit_rate": item.get("profit_rate"),
            "score": item.get("score"),
            "approved": approved,
            "reason": reason or item.get("ceo_reason", ""),
            "buy_source": item.get("buy_source"),
            "date": datetime.now().strftime("%Y-%m-%d"),
        }
        tags = [
            item.get("sell_platform", ""),
            item.get("buy_source", ""),
            "承認" if approved else "却下",
        ]
        importance = 7 if approved else 4
        self.save(title, content, memory_type="approval_history", tags=tags, importance=importance)

    def learn_from_sale(self, product_name: str, buy_price: float, sale_price: float,
                        net_profit: float, sell_platform: str, buy_source: str):
        """売上実績から学習する"""
        profit_rate = round(net_profit / sale_price * 100, 1) if sale_price > 0 else 0
        title = f"売上実績: {product_name[:30]} (利益率{profit_rate}%)"
        content = {
            "product_name": product_name,
            "buy_price": buy_price,
            "sale_price": sale_price,
            "net_profit": net_profit,
            "profit_rate": profit_rate,
            "sell_platform": sell_platform,
            "buy_source": buy_source,
            "date": datetime.now().strftime("%Y-%m-%d"),
        }
        importance = 8 if profit_rate >= 30 else 6 if profit_rate >= 20 else 3
        self.save(title, content, memory_type="sale_result",
                  tags=[sell_platform, buy_source, f"利益率{int(profit_rate)}%"],
                  importance=importance)

    def save_market_insight(self, keyword: str, insight: str, data: dict = None):
        """市場インサイトを保存する（7日間有効）"""
        title = f"市場インサイト: {keyword}"
        content = {"keyword": keyword, "insight": insight, "data": data or {}}
        self.save(title, content, memory_type="market", tags=[keyword],
                  importance=6, expires_days=7)

    def get_summary_for_prompt(self, query: str = "", limit: int = 8) -> str:
        """
        プロンプトに埋め込む用の記憶サマリーを返す。
        """
        memories = self.recall(query=query, limit=limit)
        if not memories:
            return "（過去の記憶なし）"

        lines = []
        for m in memories:
            content = m.get("content_parsed", m.get("content", ""))
            if isinstance(content, dict):
                # 承認履歴の場合
                if m["memory_type"] == "approval_history":
                    approved = content.get("approved", False)
                    lines.append(
                        f"- {'✅承認' if approved else '❌却下'} {content.get('product_name','')} "
                        f"(利益率{content.get('profit_rate',0):.1f}% / {content.get('sell_platform','')})"
                    )
                elif m["memory_type"] == "sale_result":
                    lines.append(
                        f"- 売上: {content.get('product_name','')} "
                        f"利益率{content.get('profit_rate',0):.1f}% "
                        f"¥{content.get('net_profit',0):,.0f}"
                    )
                else:
                    lines.append(f"- {m['title']}: {str(content)[:80]}")
            else:
                lines.append(f"- {m['title']}: {str(content)[:80]}")

        return "\n".join(lines)

    def delete_expired(self):
        """期限切れ記憶を削除する"""
        now = datetime.now().isoformat()
        self.db.conn.execute(
            "DELETE FROM agent_memory WHERE expires_at IS NOT NULL AND expires_at < ?", (now,)
        )
        self.db.conn.commit()

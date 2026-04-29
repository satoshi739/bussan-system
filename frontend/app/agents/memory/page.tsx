"use client";

import { useState, useEffect, useCallback } from "react";
import { Database, Trash2, RefreshCw, Search, Star } from "lucide-react";
import { getAgentMemory, deleteMemory, type AgentMemoryItem } from "@/lib/api";
import { toast } from "@/components/Toast";
import { errMsg } from "@/lib/errors";

const C = {
  bg0: "#0a0a0b", bg1: "#141414", bg2: "#1c1c1e", bg3: "#242424",
  t1: "#F5F0E8", t2: "#D4CCBC", t3: "#A09488", t4: "#5A5248",
  gold: "#D4AF37", goldLt: "#F0D060",
  up: "#4ade80", dn: "#f87171", warn: "#fbbf24",
  bd: "rgba(212,175,55,0.18)",
};
const card: React.CSSProperties = { background: C.bg1, border: `1px solid ${C.bd}`, borderRadius: 14, padding: "20px 24px" };

const AGENT_META: Record<string, { color: string; label: string }> = {
  ceo:      { color: C.gold,  label: "AI CEO" },
  research: { color: "#60a5fa", label: "Research" },
  listing:  { color: "#a78bfa", label: "Listing" },
  sns:      { color: "#f472b6", label: "SNS" },
};

const TYPE_META: Record<string, string> = {
  learning:          "🎓 学習",
  approval_history:  "✅ 承認記録",
  sale_result:       "💰 売上実績",
  market:            "📈 市場情報",
  pending:           "⏳ 承認待ち",
  listing_generated: "📄 出品文",
  sns_generated:     "📱 SNS生成",
  sns_performance:   "📊 SNS実績",
};

export default function MemoryPage() {
  const [memories, setMemories] = useState<AgentMemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentFilter, setAgentFilter] = useState("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAgentMemory({
        agent_name: agentFilter !== "all" ? agentFilter : undefined,
        q: search || undefined,
      });
      setMemories(data);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setLoading(false);
    }
  }, [agentFilter, search]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: number) => {
    try {
      await deleteMemory(id);
      toast("記憶を削除しました", "success");
      setMemories(prev => prev.filter(m => m.id !== id));
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };

  const importanceColor = (n: number) => n >= 8 ? C.up : n >= 5 ? C.gold : C.t4;

  const agentCounts = memories.reduce((acc, m) => {
    acc[m.agent_name] = (acc[m.agent_name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ background: C.bg0, minHeight: "100vh", padding: "24px 20px", maxWidth: 900, margin: "0 auto" }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ background: `linear-gradient(135deg, #818cf8, #6366f1)`, borderRadius: 12, padding: 10, display: "flex" }}>
          <Database size={24} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ color: C.t1, fontSize: 22, fontWeight: 700, margin: 0 }}>エージェント記憶</h1>
          <p style={{ color: C.t3, fontSize: 13, margin: 0 }}>AIエージェントが蓄積した学習・実績・市場データ</p>
        </div>
        <button onClick={load} style={{ background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 8, color: C.t3, padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <RefreshCw size={14} /> 更新
        </button>
      </div>

      {/* 統計 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        {["ceo","research","listing","sns"].map(agent => {
          const meta = AGENT_META[agent];
          return (
            <div key={agent} style={{ ...card, padding: "12px 16px", cursor: "pointer", borderColor: agentFilter === agent ? meta.color : C.bd }}
              onClick={() => setAgentFilter(agentFilter === agent ? "all" : agent)}>
              <div style={{ color: meta.color, fontSize: 18, fontWeight: 700 }}>{agentCounts[agent] || 0}</div>
              <div style={{ color: C.t4, fontSize: 11 }}>{meta.label}</div>
            </div>
          );
        })}
      </div>

      {/* 検索・フィルター */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={14} color={C.t4} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && load()}
            placeholder="記憶を検索..."
            style={{ width: "100%", background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 8, color: C.t1, padding: "9px 12px 9px 34px", fontSize: 13, outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <button onClick={load} style={{ background: C.gold, border: "none", borderRadius: 8, color: "#0a0a0b", padding: "0 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          検索
        </button>
        {agentFilter !== "all" && (
          <button onClick={() => setAgentFilter("all")} style={{ background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 8, color: C.t3, padding: "0 12px", fontSize: 12, cursor: "pointer" }}>
            全て表示
          </button>
        )}
      </div>

      {/* 記憶一覧 */}
      {loading ? (
        <div style={{ textAlign: "center", color: C.t4, padding: "40px 0" }}>読み込み中...</div>
      ) : memories.length === 0 ? (
        <div style={{ ...card, textAlign: "center", color: C.t4, padding: "48px 0" }}>
          <Database size={40} color={C.t4} style={{ margin: "0 auto 12px", display: "block" }} />
          <div style={{ fontSize: 14 }}>記憶がありません</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>AIエージェントを使うと自動的に学習・記憶が蓄積されます</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {memories.map(mem => {
            const agentMeta = AGENT_META[mem.agent_name] ?? { color: C.t3, label: mem.agent_name };
            const typeLabel = TYPE_META[mem.memory_type] ?? mem.memory_type;
            return (
              <div key={mem.id} style={{ ...card, padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  {/* 重要度 */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 32 }}>
                    <Star size={13} color={importanceColor(mem.importance)} fill={mem.importance >= 7 ? importanceColor(mem.importance) : "none"} />
                    <span style={{ color: importanceColor(mem.importance), fontSize: 10, fontWeight: 700 }}>{mem.importance}</span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ background: agentMeta.color + "22", color: agentMeta.color, borderRadius: 4, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>
                        {agentMeta.label}
                      </span>
                      <span style={{ color: C.t4, fontSize: 11 }}>{typeLabel}</span>
                      <span style={{ color: C.t4, fontSize: 10, marginLeft: "auto" }}>
                        参照{mem.access_count}回 · {new Date(mem.created_at).toLocaleDateString("ja-JP")}
                      </span>
                    </div>

                    <div style={{ color: C.t1, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{mem.title}</div>

                    <div style={{ color: C.t3, fontSize: 12, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {mem.content.slice(0, 120)}
                    </div>

                    {mem.tags.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                        {mem.tags.filter(Boolean).map((tag, i) => (
                          <span key={i} style={{ background: C.bg3, color: C.t4, borderRadius: 4, padding: "1px 6px", fontSize: 10 }}>{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleDelete(mem.id)}
                    style={{ background: "none", border: "none", color: C.t4, cursor: "pointer", padding: 4, flexShrink: 0 }}
                    title="削除"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

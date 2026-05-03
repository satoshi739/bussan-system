"use client";

import { useState, useEffect } from "react";
import { Brain, Play, CheckCircle, TrendingUp, Zap, Clock, AlertCircle, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getAgentSessions, getApprovalQueue, type AgentSession } from "@/lib/api";
import { toast } from "@/components/Toast";

const C = {
  bg0: "#0a0a0b", bg1: "#141414", bg2: "#1c1c1e", bg3: "#242424",
  t1: "#F5F0E8", t2: "#D4CCBC", t3: "#A09488", t4: "#5A5248",
  gold: "#D4AF37", goldLt: "#F0D060", goldDm: "#9A7D25",
  up: "#4ade80", dn: "#f87171", warn: "#fbbf24",
  bd: "rgba(212,175,55,0.18)", bdSt: "rgba(212,175,55,0.38)",
};

const card: React.CSSProperties = {
  background: C.bg1,
  border: `1px solid ${C.bd}`,
  borderRadius: 14,
  padding: "20px 24px",
};

const GOAL_SUGGESTIONS = [
  "今週は利益率30%以上の商品を5個発見してほしい。予算3万円。",
  "eBay向けの日本製レトロ商品（カメラ・時計・ゲーム）をスキャンしてTop候補を出してほしい。",
  "メルカリで仕入れてeBayで売れる商品を予算5万円以内で探してほしい。",
  "利益スコアTop10の商品を全キーワードでスキャンして報告してほしい。",
];

export default function AgentsPage() {
  const [goal, setGoal] = useState("");
  const [budget, setBudget] = useState("");
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [result, setResult] = useState<{ queued_count: number; scanned_count: number; final_message: string } | null>(null);
  const [progressLog, setProgressLog] = useState<string[]>([]);

  useEffect(() => {
    getAgentSessions().then(setSessions).catch(() => {});
    getApprovalQueue("pending").then(d => setPendingCount(d.pending_count)).catch(() => {});
  }, []);

  const handleRun = async () => {
    if (!goal.trim()) { toast("指示（ゴール）を入力してください", "error"); return; }
    const budgetNum = budget.trim() ? Number(budget) : undefined;
    if (budgetNum !== undefined && (!Number.isFinite(budgetNum) || budgetNum <= 0)) {
      toast("予算は正の数値を入力してください", "error");
      return;
    }
    setRunning(true);
    setResult(null);
    setProgressLog([]);

    const params = new URLSearchParams({ goal: goal.trim(), max_turns: "12" });
    if (budgetNum) params.set("budget_jpy", String(budgetNum));
    const es = new EventSource(`/api/proxy/agents/ceo/stream?${params}`);

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "start") {
          setProgressLog(["エージェント起動中..."]);
        } else if (data.type === "progress") {
          setProgressLog(p => [...p, data.message]);
        } else if (data.type === "done") {
          setResult(data);
          toast(`完了: ${data.queued_count ?? 0}件を承認キューに追加しました`, "success");
          getAgentSessions().then(setSessions).catch(() => {});
          getApprovalQueue("pending").then(d => setPendingCount(d.pending_count)).catch(() => {});
          setRunning(false);
          es.close();
        } else if (data.type === "error") {
          toast(data.message, "error");
          setProgressLog(p => [...p, `エラー: ${data.message}`]);
          setRunning(false);
          es.close();
        }
      } catch {}
    };

    es.onerror = () => {
      toast("接続エラーが発生しました", "error");
      setRunning(false);
      es.close();
    };
  };

  const statusColor = (s: string) => s === "completed" ? C.up : s === "error" ? C.dn : C.warn;
  const statusLabel = (s: string) => s === "completed" ? "完了" : s === "error" ? "エラー" : "実行中";

  return (
    <div style={{ background: C.bg0, minHeight: "100vh", padding: "24px 20px", maxWidth: 900, margin: "0 auto" }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <div style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldLt})`, borderRadius: 12, padding: 10, display: "flex" }}>
          <Brain size={24} color="#0a0a0b" />
        </div>
        <div>
          <h1 style={{ color: C.t1, fontSize: 22, fontWeight: 700, margin: 0 }}>AI CEO ダッシュボード</h1>
          <p style={{ color: C.t3, fontSize: 13, margin: 0 }}>AIが利益スキャン → 承認キューへ自動追加。購入はSatoshiが承認。</p>
        </div>
      </div>

      {/* ステータスバー */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "承認待ち", value: pendingCount, color: pendingCount > 0 ? C.warn : C.t3, icon: <CheckCircle size={16} />, href: "/agents/approvals" },
          { label: "総セッション数", value: sessions.length, color: C.gold, icon: <Brain size={16} /> },
          { label: "完了セッション", value: sessions.filter(s => s.status === "completed").length, color: C.up, icon: <TrendingUp size={16} /> },
        ].map((stat, i) => (
          <div key={i} style={{ ...card, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: stat.color }}>{stat.icon}</span>
            <div>
              <div style={{ color: stat.color, fontSize: 22, fontWeight: 700 }}>{stat.value}</div>
              <div style={{ color: C.t3, fontSize: 12 }}>{stat.label}</div>
            </div>
            {stat.href && (
              <Link href={stat.href} style={{ marginLeft: "auto", color: C.t4 }}>
                <ChevronRight size={16} />
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* 承認待ちバナー */}
      {pendingCount > 0 && (
        <Link href="/agents/approvals" style={{ textDecoration: "none" }}>
          <div style={{
            background: `linear-gradient(135deg, rgba(251,191,36,0.15), rgba(212,175,55,0.08))`,
            border: `1px solid ${C.warn}`,
            borderRadius: 12,
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
            cursor: "pointer",
          }}>
            <AlertCircle size={20} color={C.warn} />
            <div style={{ flex: 1 }}>
              <div style={{ color: C.warn, fontWeight: 600, fontSize: 14 }}>
                {pendingCount}件の仕入れ候補が承認待ちです
              </div>
              <div style={{ color: C.t3, fontSize: 12 }}>クリックして確認・承認してください →</div>
            </div>
          </div>
        </Link>
      )}

      {/* CEO 指示フォーム */}
      <div style={{ ...card, marginBottom: 24 }}>
        <h2 style={{ color: C.gold, fontSize: 16, fontWeight: 700, margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: 8 }}>
          <Zap size={16} /> Satoshi → AI CEO への指示
        </h2>

        <div style={{ marginBottom: 12 }}>
          <label style={{ color: C.t2, fontSize: 13, display: "block", marginBottom: 6 }}>ゴール・指示内容</label>
          <textarea
            value={goal}
            onChange={e => setGoal(e.target.value)}
            placeholder="例: 今週は利益率30%以上の商品を5個見つけてほしい。予算3万円。"
            rows={3}
            style={{
              width: "100%", background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 8,
              color: C.t1, padding: "10px 12px", fontSize: 14, outline: "none",
              resize: "vertical", fontFamily: "inherit", lineHeight: 1.6, boxSizing: "border-box",
            }}
          />
        </div>

        {/* サジェスト */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {GOAL_SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => setGoal(s)}
              style={{
                background: C.bg3, border: `1px solid ${C.bd}`, borderRadius: 20,
                color: C.t3, fontSize: 11, padding: "4px 10px", cursor: "pointer",
              }}
            >
              {s.slice(0, 22)}…
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={{ color: C.t2, fontSize: 13, display: "block", marginBottom: 6 }}>予算上限（円）</label>
            <input
              type="number"
              value={budget}
              onChange={e => setBudget(e.target.value)}
              placeholder="例: 50000（空欄=制限なし）"
              style={{
                width: "100%", background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 8,
                color: C.t1, padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
          <button
            onClick={handleRun}
            disabled={running}
            style={{
              background: running
                ? C.bg3
                : `linear-gradient(135deg, ${C.gold}, ${C.goldLt})`,
              border: "none", borderRadius: 10, color: running ? C.t4 : "#0a0a0b",
              padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: running ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
            }}
          >
            <Play size={16} />
            {running ? "AIが動作中..." : "AI CEOを起動"}
          </button>
        </div>
      </div>

      {/* 進捗ログ */}
      {(running || progressLog.length > 0) && (
        <div style={{ ...card, marginBottom: 24, borderColor: C.goldDm }}>
          <div style={{ color: C.gold, fontSize: 13, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <Zap size={14} /> リアルタイム進捗
          </div>
          <div style={{
            background: C.bg0, borderRadius: 8, padding: "12px 14px",
            height: 160, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4,
          }}>
            {progressLog.map((msg, i) => (
              <div key={i} style={{ fontSize: 12, fontFamily: "monospace", color: "#4ade80", lineHeight: 1.5 }}>
                <span style={{ color: C.t4, marginRight: 8 }}>{`>`}</span>{msg}
              </div>
            ))}
            {running && (
              <div style={{ fontSize: 12, fontFamily: "monospace", color: C.gold, lineHeight: 1.5 }}>
                <span style={{ marginRight: 8 }}>▋</span>処理中...
              </div>
            )}
          </div>
        </div>
      )}

      {/* 実行結果 */}
      {result && (
        <div style={{ ...card, marginBottom: 24, borderColor: C.up }}>
          <h3 style={{ color: C.up, fontSize: 14, fontWeight: 700, margin: "0 0 12px 0", display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle size={16} /> AI CEOセッション完了
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 12 }}>
            <div style={{ background: C.bg2, borderRadius: 8, padding: "12px 16px" }}>
              <div style={{ color: C.up, fontSize: 20, fontWeight: 700 }}>{result.queued_count}件</div>
              <div style={{ color: C.t3, fontSize: 12 }}>承認キューに追加</div>
            </div>
            <div style={{ background: C.bg2, borderRadius: 8, padding: "12px 16px" }}>
              <div style={{ color: C.gold, fontSize: 20, fontWeight: 700 }}>{result.scanned_count}件</div>
              <div style={{ color: C.t3, fontSize: 12 }}>スキャン商品数</div>
            </div>
          </div>
          {result.final_message && (
            <div style={{ background: C.bg2, borderRadius: 8, padding: "12px 16px", color: C.t2, fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {result.final_message}
            </div>
          )}
          <Link href="/agents/approvals" style={{ textDecoration: "none" }}>
            <button style={{
              marginTop: 12, background: C.gold, border: "none", borderRadius: 8,
              color: "#0a0a0b", padding: "8px 16px", fontSize: 13, fontWeight: 700,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            }}>
              <CheckCircle size={14} /> 承認キューを確認する
            </button>
          </Link>
        </div>
      )}

      {/* セッション履歴 */}
      <div style={card}>
        <h2 style={{ color: C.t2, fontSize: 15, fontWeight: 700, margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: 8 }}>
          <Clock size={15} /> セッション履歴
        </h2>
        {sessions.length === 0 ? (
          <div style={{ color: C.t4, textAlign: "center", padding: "24px 0", fontSize: 14 }}>
            まだセッションがありません。上のフォームからAI CEOを起動してください。
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sessions.map(s => (
              <div key={s.id} style={{
                background: C.bg2, borderRadius: 10, padding: "12px 16px",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <span style={{
                  background: statusColor(s.status) + "22",
                  color: statusColor(s.status),
                  borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
                }}>
                  {statusLabel(s.status)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: C.t1, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.goal}
                  </div>
                  <div style={{ color: C.t4, fontSize: 11 }}>
                    スキャン {s.scanned_count}件 / キュー {s.queued_count}件 &nbsp;·&nbsp;
                    {new Date(s.created_at).toLocaleString("ja-JP")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Users, TrendingUp, Crown, RefreshCw, AlertTriangle, Activity, FileText, Plus, Copy, Trash2, Sparkles, Video, Download } from "lucide-react";

interface UserStat {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  plan: string;
  subStatus: string;
  daysSinceSignup: number;
  churnRisk: "high" | "medium" | "low" | "safe";
  purchaseCount: number;
  soldCount: number;
  listedCount: number;
  pendingCount: number;
  totalInvested: number;
  lastPurchaseDate: string | null;
  isActive: boolean;
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  newUsersLast30: number;
  mrr: number;
  planCount: { FREE: number; STANDARD: number; PRO: number };
  churnSummary: { high: number; medium: number; low: number; safe: number };
  users: UserStat[];
}

interface ContentItem {
  id: string;
  platform: string;
  theme: string;
  title: string;
  body: string;
  status: string;
  publishedAt: string | null;
  createdAt: string;
}

const PLAN_COLOR: Record<string, string> = { FREE: "#8A8278", STANDARD: "#66aaff", PRO: "#D4AF37" };
const PLAN_LABEL: Record<string, string> = { FREE: "フリー", STANDARD: "Standard", PRO: "Pro" };
const RISK_COLOR = { high: "#ff6666", medium: "#ffcc44", low: "#66aaff", safe: "#44ccaa" };
const RISK_LABEL = { high: "🔴 離脱危険", medium: "🟡 要注意", low: "🔵 様子見", safe: "🟢 安全" };

const PLATFORM_COLOR: Record<string, string> = { tiktok: "#ff2d55", instagram: "#c13584", x: "#1d9bf0", dm: "#44ccaa" };
const PLATFORM_LABEL: Record<string, string> = { tiktok: "TikTok", instagram: "Instagram", x: "X", dm: "DM" };
const PLATFORM_ICON: Record<string, string> = { tiktok: "🎵", instagram: "📸", x: "𝕏", dm: "✉️" };

type Tab = "overview" | "churn" | "users" | "content";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [userFilter, setUserFilter] = useState("");

  // コンテンツ管理
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState({ platform: "tiktok", theme: "", title: "", body: "" });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});
  const [videoGenerating, setVideoGenerating] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated" && session.user.role !== "ADMIN") { router.push("/"); return; }
    if (status === "authenticated") fetchStats();
  }, [status, router, session?.user?.role]);

  const fetchStats = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error();
      setStats(await res.json());
    } catch { setError("データの取得に失敗しました"); }
    finally { setLoading(false); }
  };

  const fetchContents = useCallback(async () => {
    setContentLoading(true);
    try {
      const res = await fetch("/api/admin/content");
      if (res.ok) setContents(await res.json());
    } finally { setContentLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === "content") fetchContents();
  }, [tab, fetchContents]);

  const handleGenerate = async () => {
    if (!form.platform) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: form.platform, theme: form.theme }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setForm(f => ({ ...f, title: data.title, body: data.body }));
    } catch { alert("AI生成に失敗しました"); }
    finally { setGenerating(false); }
  };

  const handleSave = async () => {
    if (!form.title || !form.body) return;
    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setShowForm(false);
      setForm({ platform: "tiktok", theme: "", title: "", body: "" });
      fetchContents();
    } catch { alert("保存に失敗しました"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await fetch(`/api/admin/content/${id}`, { method: "DELETE" });
    setContents(c => c.filter(x => x.id !== id));
  };

  const handlePublish = async (item: ContentItem) => {
    await fetch(`/api/admin/content/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, status: "published", publishedAt: new Date().toISOString() }),
    });
    fetchContents();
  };

  const handleGenerateVideo = async (item: ContentItem) => {
    setVideoGenerating(item.id);
    try {
      const res = await fetch(`/api/admin/content/${item.id}/video`, { method: "POST" });
      if (!res.ok) { alert("動画生成に失敗しました"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setVideoUrls(v => ({ ...v, [item.id]: url }));
    } catch { alert("動画生成に失敗しました"); }
    finally { setVideoGenerating(null); }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (status === "loading" || loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "#8A8278" }}>読み込み中...</div>
  );
  if (error) return <div style={{ color: "#ff6666", padding: 40 }}>{error}</div>;
  if (!stats) return null;

  const payingUsers = stats.planCount.STANDARD + stats.planCount.PRO;
  const conversionRate = stats.totalUsers > 0 ? ((payingUsers / stats.totalUsers) * 100).toFixed(1) : "0";
  const filteredUsers = stats.users.filter(u =>
    !userFilter || u.email.includes(userFilter) || (u.name ?? "").includes(userFilter)
  );
  const churnUsers = stats.users.filter(u => u.churnRisk === "high" || u.churnRisk === "medium")
    .sort((a, b) => b.daysSinceSignup - a.daysSinceSignup);
  const filteredContents = platformFilter === "all" ? contents : contents.filter(c => c.platform === platformFilter);

  const card = (children: React.ReactNode, style?: React.CSSProperties) => (
    <div style={{ background: "rgba(20,20,22,0.9)", border: "1px solid rgba(212,175,55,0.1)", borderRadius: 14, padding: "20px 24px", ...style }}>
      {children}
    </div>
  );

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#D4AF37", margin: 0 }}>👑 管理者ダッシュボード</h1>
          <div style={{ fontSize: 12, color: "#8A8278", marginTop: 3 }}>全ユーザーの状態・MRR・チャーン分析・コンテンツ管理</div>
        </div>
        <button onClick={fetchStats} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 8, color: "#8A8278", padding: "8px 14px", fontSize: 12, cursor: "pointer" }}>
          <RefreshCw size={13} /> 更新
        </button>
      </div>

      {/* KPIカード */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { icon: <TrendingUp size={18} />, color: "#D4AF37", label: "MRR", value: `¥${stats.mrr.toLocaleString()}`, sub: `有料 ${payingUsers}人` },
          { icon: <Users size={18} />, color: "#66ccff", label: "総ユーザー", value: stats.totalUsers, sub: `直近30日 +${stats.newUsersLast30}` },
          { icon: <Activity size={18} />, color: "#44ccaa", label: "アクティブ", value: stats.activeUsers, sub: "仕入れ1件以上" },
          { icon: <Crown size={18} />, color: "#aa88ff", label: "転換率", value: `${conversionRate}%`, sub: "有料化率" },
          { icon: <AlertTriangle size={18} />, color: "#ff6666", label: "離脱危険", value: stats.churnSummary.high, sub: "14日超フリー" },
        ].map(({ icon, color, label, value, sub }) => (
          <div key={label} style={{ background: "rgba(20,20,22,0.9)", border: "1px solid rgba(212,175,55,0.1)", borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, color, marginBottom: 8 }}>{icon}<span style={{ fontSize: 10, fontWeight: 700 }}>{label}</span></div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#F5F0E8", fontFamily: "monospace" }}>{value}</div>
            <div style={{ fontSize: 10, color: "#8A8278", marginTop: 3 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* タブ */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(212,175,55,0.15)", width: "fit-content" }}>
        {([
          ["overview", "概要"],
          ["churn", `チャーン分析 (${stats.churnSummary.high + stats.churnSummary.medium})`],
          ["users", `全ユーザー (${stats.totalUsers})`],
          ["content", `コンテンツ管理 (${contents.length})`],
        ] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "9px 18px", background: tab === t ? "rgba(212,175,55,0.12)" : "transparent", border: "none", borderRight: "1px solid rgba(212,175,55,0.15)", color: tab === t ? "#D4AF37" : "#8A8278", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            {label}
          </button>
        ))}
      </div>

      {/* 概要タブ */}
      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {card(<>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#C8C0B0", marginBottom: 14 }}>プラン内訳</div>
            {(["FREE", "STANDARD", "PRO"] as const).map(plan => {
              const count = stats.planCount[plan];
              const pct = stats.totalUsers > 0 ? (count / stats.totalUsers) * 100 : 0;
              return (
                <div key={plan} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: PLAN_COLOR[plan], fontWeight: 700 }}>{PLAN_LABEL[plan]}</span>
                    <span style={{ fontSize: 12, color: "#F5F0E8", fontFamily: "monospace" }}>{count}人 ({pct.toFixed(0)}%)</span>
                  </div>
                  <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: PLAN_COLOR[plan], borderRadius: 3, opacity: plan === "FREE" ? 0.4 : 0.85 }} />
                  </div>
                </div>
              );
            })}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(212,175,55,0.08)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#8A8278" }}>月次収益（MRR）</span>
              <span style={{ fontSize: 16, fontWeight: 900, color: "#D4AF37", fontFamily: "monospace" }}>¥{stats.mrr.toLocaleString()}</span>
            </div>
          </>)}

          {card(<>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#C8C0B0", marginBottom: 14 }}>チャーンリスク概要</div>
            {(["high", "medium", "low", "safe"] as const).map(risk => (
              <div key={risk} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(212,175,55,0.05)" }}>
                <span style={{ fontSize: 12, color: RISK_COLOR[risk] }}>{RISK_LABEL[risk]}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#F5F0E8", fontFamily: "monospace" }}>{stats.churnSummary[risk]}人</span>
              </div>
            ))}
            <div style={{ marginTop: 14, fontSize: 11, color: "#5A5248", lineHeight: 1.7 }}>
              ※ フリープラン登録から14日超 → 離脱危険<br />
              ※ 7〜14日 → 要注意 / 有料プラン → 安全
            </div>
          </>)}

          {card(<>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#C8C0B0", marginBottom: 14 }}>直近の登録ユーザー</div>
            {stats.users.slice(0, 5).map(u => (
              <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(212,175,55,0.05)" }}>
                <div>
                  <div style={{ fontSize: 13, color: "#F5F0E8" }}>{u.email}</div>
                  <div style={{ fontSize: 11, color: "#8A8278" }}>{u.daysSinceSignup}日前に登録</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: PLAN_COLOR[u.plan], background: `${PLAN_COLOR[u.plan]}18`, border: `1px solid ${PLAN_COLOR[u.plan]}33`, borderRadius: 20, padding: "2px 8px" }}>
                  {PLAN_LABEL[u.plan] ?? u.plan}
                </span>
              </div>
            ))}
          </>, { gridColumn: "1 / -1" })}
        </div>
      )}

      {/* チャーン分析タブ */}
      {tab === "churn" && (
        <div>
          <div style={{ background: "rgba(255,100,50,0.06)", border: "1px solid rgba(255,100,50,0.2)", borderRadius: 12, padding: "14px 18px", marginBottom: 16, fontSize: 13, color: "#ff9966", lineHeight: 1.7 }}>
            <strong>チャーンとは：</strong> 登録してから長期間フリープランのまま離脱するユーザー。<br />
            このリストに対して <strong>LINE/メールでのフォロー</strong> や <strong>限定割引</strong> を送ると有料転換率が上がります。
          </div>
          {churnUsers.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#8A8278" }}>チャーンリスクユーザーはいません 🎉</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {churnUsers.map(u => (
                <div key={u.id} style={{ background: "rgba(20,20,22,0.9)", border: `1px solid ${RISK_COLOR[u.churnRisk]}22`, borderRadius: 12, padding: "14px 18px", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 12, alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, color: "#F5F0E8", fontWeight: 600 }}>{u.email}</div>
                    <div style={{ fontSize: 11, color: "#8A8278", marginTop: 2 }}>登録 {u.daysSinceSignup}日前</div>
                  </div>
                  <span style={{ fontSize: 11, color: RISK_COLOR[u.churnRisk], fontWeight: 700 }}>{RISK_LABEL[u.churnRisk]}</span>
                  <div style={{ fontSize: 12, color: "#C8C0B0" }}>仕入れ <span style={{ color: "#F5F0E8", fontWeight: 700 }}>{u.purchaseCount}</span>件</div>
                  <div style={{ fontSize: 12, color: "#C8C0B0" }}>売却 <span style={{ color: u.soldCount > 0 ? "#44ccaa" : "#8A8278", fontWeight: 700 }}>{u.soldCount}</span>件</div>
                  <div style={{ fontSize: 11, color: "#8A8278" }}>{u.lastPurchaseDate ? `最終: ${u.lastPurchaseDate}` : "未使用"}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 全ユーザータブ */}
      {tab === "users" && (
        <div>
          <input
            value={userFilter}
            onChange={e => setUserFilter(e.target.value)}
            placeholder="メール・名前で検索..."
            style={{ width: "100%", background: "rgba(10,10,11,0.9)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 10, color: "#F5F0E8", padding: "10px 14px", fontSize: 13, outline: "none", marginBottom: 14, boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 0.8fr 0.8fr 0.6fr 0.6fr 0.6fr 0.8fr", gap: 10, padding: "4px 14px", fontSize: 10, color: "#3A3830", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              <div>メール</div><div>プラン</div><div>リスク</div><div>仕入れ</div><div>売却</div><div>投資額</div><div>登録</div>
            </div>
            {filteredUsers.map(u => (
              <div key={u.id} style={{ display: "grid", gridTemplateColumns: "2fr 0.8fr 0.8fr 0.6fr 0.6fr 0.6fr 0.8fr", gap: 10, padding: "10px 14px", borderRadius: 8, background: "rgba(10,10,11,0.5)", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12, color: "#F5F0E8", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                  {!u.isActive && <span style={{ fontSize: 10, color: "#5A5248" }}>未使用</span>}
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: PLAN_COLOR[u.plan], background: `${PLAN_COLOR[u.plan]}18`, borderRadius: 20, padding: "2px 8px", width: "fit-content" }}>
                  {PLAN_LABEL[u.plan] ?? u.plan}
                </span>
                <span style={{ fontSize: 10, color: RISK_COLOR[u.churnRisk] }}>{RISK_LABEL[u.churnRisk]}</span>
                <div style={{ fontSize: 12, color: "#F5F0E8", fontFamily: "monospace", textAlign: "center" }}>{u.purchaseCount}</div>
                <div style={{ fontSize: 12, color: u.soldCount > 0 ? "#44ccaa" : "#8A8278", fontFamily: "monospace", textAlign: "center" }}>{u.soldCount}</div>
                <div style={{ fontSize: 11, color: "#C8C0B0", fontFamily: "monospace" }}>{u.totalInvested > 0 ? `¥${Math.round(u.totalInvested / 1000)}k` : "—"}</div>
                <div style={{ fontSize: 11, color: "#8A8278" }}>{new Date(u.createdAt).toLocaleDateString("ja-JP")}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* コンテンツ管理タブ */}
      {tab === "content" && (
        <div>
          {/* ツールバー */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 6 }}>
              {["all", "tiktok", "instagram", "x", "dm"].map(p => (
                <button key={p} onClick={() => setPlatformFilter(p)} style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid", fontSize: 11, fontWeight: 700, cursor: "pointer", background: platformFilter === p ? (p === "all" ? "rgba(212,175,55,0.15)" : `${PLATFORM_COLOR[p]}22`) : "transparent", color: platformFilter === p ? (p === "all" ? "#D4AF37" : PLATFORM_COLOR[p]) : "#8A8278", borderColor: platformFilter === p ? (p === "all" ? "rgba(212,175,55,0.4)" : `${PLATFORM_COLOR[p]}66`) : "rgba(255,255,255,0.08)" }}>
                  {p === "all" ? "すべて" : `${PLATFORM_ICON[p]} ${PLATFORM_LABEL[p]}`}
                </button>
              ))}
            </div>
            <button onClick={() => setShowForm(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.35)", borderRadius: 8, color: "#D4AF37", padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              <Plus size={14} /> 新規作成
            </button>
          </div>

          {/* 作成フォーム */}
          {showForm && (
            <div style={{ background: "rgba(20,20,22,0.95)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 14, padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#D4AF37", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <FileText size={16} /> コンテンツ作成
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#8A8278", marginBottom: 6, fontWeight: 700 }}>プラットフォーム</div>
                  <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} style={{ width: "100%", background: "rgba(10,10,11,0.9)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 8, color: "#F5F0E8", padding: "9px 12px", fontSize: 13, outline: "none" }}>
                    {["tiktok", "instagram", "x", "dm"].map(p => (
                      <option key={p} value={p}>{PLATFORM_ICON[p]} {PLATFORM_LABEL[p]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#8A8278", marginBottom: 6, fontWeight: 700 }}>テーマ（任意）</div>
                  <input value={form.theme} onChange={e => setForm(f => ({ ...f, theme: e.target.value }))} placeholder="例: 国内転売・利益率30%の商品の見つけ方" style={{ width: "100%", background: "rgba(10,10,11,0.9)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 8, color: "#F5F0E8", padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              <button onClick={handleGenerate} disabled={generating} style={{ display: "flex", alignItems: "center", gap: 6, background: generating ? "rgba(100,100,100,0.2)" : "rgba(170,136,255,0.15)", border: "1px solid rgba(170,136,255,0.4)", borderRadius: 8, color: generating ? "#8A8278" : "#aa88ff", padding: "9px 16px", fontSize: 12, fontWeight: 700, cursor: generating ? "not-allowed" : "pointer", marginBottom: 16 }}>
                <Sparkles size={14} /> {generating ? "AI生成中..." : "AIで生成する"}
              </button>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "#8A8278", marginBottom: 6, fontWeight: 700 }}>タイトル</div>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="タイトルを入力" style={{ width: "100%", background: "rgba(10,10,11,0.9)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 8, color: "#F5F0E8", padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: "#8A8278", marginBottom: 6, fontWeight: 700 }}>本文</div>
                <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="本文を入力（AIで生成またはここに直接書く）" rows={8} style={{ width: "100%", background: "rgba(10,10,11,0.9)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 8, color: "#F5F0E8", padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={handleSave} style={{ background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 8, color: "#D4AF37", padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>保存</button>
                <button onClick={() => { setShowForm(false); setForm({ platform: "tiktok", theme: "", title: "", body: "" }); }} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#8A8278", padding: "9px 20px", fontSize: 13, cursor: "pointer" }}>キャンセル</button>
              </div>
            </div>
          )}

          {/* コンテンツ一覧 */}
          {contentLoading ? (
            <div style={{ textAlign: "center", padding: 40, color: "#8A8278" }}>読み込み中...</div>
          ) : filteredContents.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#8A8278" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📝</div>
              <div>コンテンツがまだありません</div>
              <div style={{ fontSize: 12, marginTop: 6, color: "#5A5248" }}>「新規作成」からAIで台本を生成できます</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredContents.map(item => (
                <div key={item.id} style={{ background: "rgba(20,20,22,0.9)", border: `1px solid ${item.status === "published" ? "rgba(68,204,170,0.2)" : "rgba(212,175,55,0.1)"}`, borderRadius: 12, overflow: "hidden" }}>
                  {/* ヘッダー行 */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer" }} onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                    <span style={{ fontSize: 16 }}>{PLATFORM_ICON[item.platform]}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: PLATFORM_COLOR[item.platform], background: `${PLATFORM_COLOR[item.platform]}18`, borderRadius: 20, padding: "2px 8px", border: `1px solid ${PLATFORM_COLOR[item.platform]}33`, flexShrink: 0 }}>
                      {PLATFORM_LABEL[item.platform]}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#F5F0E8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                      {item.theme && <div style={{ fontSize: 11, color: "#5A5248", marginTop: 2 }}>#{item.theme}</div>}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: item.status === "published" ? "#44ccaa" : "#8A8278", background: item.status === "published" ? "rgba(68,204,170,0.1)" : "rgba(255,255,255,0.04)", borderRadius: 20, padding: "2px 8px", flexShrink: 0 }}>
                      {item.status === "published" ? "✓ 公開済" : "下書き"}
                    </span>
                    <div style={{ fontSize: 11, color: "#5A5248", flexShrink: 0 }}>{new Date(item.createdAt).toLocaleDateString("ja-JP")}</div>
                  </div>

                  {/* 展開エリア */}
                  {expandedId === item.id && (
                    <div style={{ borderTop: "1px solid rgba(212,175,55,0.08)", padding: "14px 16px" }}>
                      <pre style={{ fontSize: 12, color: "#C8C0B0", whiteSpace: "pre-wrap", lineHeight: 1.8, margin: 0, fontFamily: "inherit" }}>{item.body}</pre>
                      {/* 動画プレビュー */}
                      {videoUrls[item.id] && (
                        <div style={{ marginTop: 16, background: "rgba(0,0,0,0.4)", borderRadius: 10, padding: 12, display: "flex", gap: 16, alignItems: "flex-start" }}>
                          <video src={videoUrls[item.id]} controls style={{ width: 160, borderRadius: 8, background: "#000" }} />
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
                            <a href={videoUrls[item.id]} download={`${item.platform}_content.mp4`} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.35)", borderRadius: 7, color: "#D4AF37", padding: "8px 14px", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                              <Download size={12} /> ダウンロード
                            </a>
                            {item.platform === "tiktok" && (
                              <a href="https://www.tiktok.com/upload" target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,45,85,0.1)", border: "1px solid rgba(255,45,85,0.3)", borderRadius: 7, color: "#ff2d55", padding: "8px 14px", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                                🎵 TikTokで投稿
                              </a>
                            )}
                            {item.platform === "instagram" && (
                              <a href="https://www.instagram.com/reels/create" target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(193,53,132,0.1)", border: "1px solid rgba(193,53,132,0.3)", borderRadius: 7, color: "#c13584", padding: "8px 14px", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                                📸 Instagramで投稿
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                        <button onClick={() => handleGenerateVideo(item)} disabled={videoGenerating === item.id} style={{ display: "flex", alignItems: "center", gap: 5, background: videoGenerating === item.id ? "rgba(100,100,100,0.15)" : "rgba(170,136,255,0.12)", border: "1px solid rgba(170,136,255,0.35)", borderRadius: 7, color: videoGenerating === item.id ? "#8A8278" : "#aa88ff", padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: videoGenerating === item.id ? "not-allowed" : "pointer" }}>
                          <Video size={12} /> {videoGenerating === item.id ? "動画生成中..." : videoUrls[item.id] ? "再生成" : "動画生成"}
                        </button>
                        <button onClick={() => handleCopy(item.id, item.body)} style={{ display: "flex", alignItems: "center", gap: 5, background: copied === item.id ? "rgba(68,204,170,0.15)" : "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 7, color: copied === item.id ? "#44ccaa" : "#C8C0B0", padding: "7px 14px", fontSize: 12, cursor: "pointer" }}>
                          <Copy size={12} /> {copied === item.id ? "コピーしました！" : "コピー"}
                        </button>
                        {item.status !== "published" && (
                          <button onClick={() => handlePublish(item)} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(68,204,170,0.1)", border: "1px solid rgba(68,204,170,0.3)", borderRadius: 7, color: "#44ccaa", padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                            ✓ 公開済にする
                          </button>
                        )}
                        <button onClick={() => handleDelete(item.id)} style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "1px solid rgba(255,100,100,0.2)", borderRadius: 7, color: "#ff6666", padding: "7px 14px", fontSize: 12, cursor: "pointer", marginLeft: "auto" }}>
                          <Trash2 size={12} /> 削除
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

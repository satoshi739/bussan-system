"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Users, TrendingUp, Crown, Package, RefreshCw } from "lucide-react";

interface AdminStats {
  totalUsers: number;
  newUsersLast30: number;
  mrr: number;
  planCount: { FREE: number; STANDARD: number; PRO: number };
  recentSignups: {
    id: string;
    email: string;
    name: string | null;
    createdAt: string;
    plan: string;
    subStatus: string;
  }[];
}

const PLAN_COLOR: Record<string, string> = {
  FREE: "#8A8278",
  STANDARD: "#66aaff",
  PRO: "#D4AF37",
};

const PLAN_LABEL: Record<string, string> = {
  FREE: "フリー",
  STANDARD: "Standard",
  PRO: "Pro",
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated" && session.user.role !== "ADMIN") {
      router.push("/"); return;
    }
    if (status === "authenticated") fetchStats();
  }, [status, session]);

  const fetchStats = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("取得失敗");
      setStats(await res.json());
    } catch {
      setError("データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "#8A8278", fontSize: 14 }}>
        読み込み中...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 40, color: "#ff6666" }}>{error}</div>
    );
  }

  if (!stats) return null;

  const payingUsers = stats.planCount.STANDARD + stats.planCount.PRO;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#D4AF37", margin: 0 }}>管理者ダッシュボード</h1>
          <div style={{ fontSize: 12, color: "#8A8278", marginTop: 3 }}>全ユーザーデータの概要</div>
        </div>
        <button
          onClick={fetchStats}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 8, color: "#8A8278", padding: "8px 14px", fontSize: 12, cursor: "pointer" }}
        >
          <RefreshCw size={13} /> 更新
        </button>
      </div>

      {/* KPIカード */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
        {[
          {
            icon: <TrendingUp size={20} />, color: "#D4AF37",
            label: "MRR", value: `¥${stats.mrr.toLocaleString()}`,
            sub: `有料 ${payingUsers}人`,
          },
          {
            icon: <Users size={20} />, color: "#66ccff",
            label: "総ユーザー数", value: stats.totalUsers,
            sub: `直近30日 +${stats.newUsersLast30}人`,
          },
          {
            icon: <Crown size={20} />, color: "#aa88ff",
            label: "Proプラン", value: stats.planCount.PRO,
            sub: `¥${(stats.planCount.PRO * 19800).toLocaleString()}/月`,
          },
          {
            icon: <Package size={20} />, color: "#66aaff",
            label: "Standardプラン", value: stats.planCount.STANDARD,
            sub: `¥${(stats.planCount.STANDARD * 9800).toLocaleString()}/月`,
          },
        ].map(({ icon, color, label, value, sub }) => (
          <div key={label} style={{ background: "rgba(20,20,22,0.9)", border: "1px solid rgba(212,175,55,0.1)", borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color, marginBottom: 10 }}>
              {icon}
              <span style={{ fontSize: 11, fontWeight: 700 }}>{label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#F5F0E8", fontFamily: "monospace" }}>{value}</div>
            <div style={{ fontSize: 11, color: "#8A8278", marginTop: 4 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* プラン内訳バー */}
      <div style={{ background: "rgba(20,20,22,0.9)", border: "1px solid rgba(212,175,55,0.1)", borderRadius: 14, padding: "20px 24px", marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#C8C0B0", marginBottom: 14 }}>プラン内訳</div>
        <div style={{ display: "flex", gap: 20, marginBottom: 12 }}>
          {(["FREE", "STANDARD", "PRO"] as const).map(plan => (
            <div key={plan} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: PLAN_COLOR[plan] }} />
              <span style={{ fontSize: 12, color: "#8A8278" }}>{PLAN_LABEL[plan]}: <span style={{ color: "#F5F0E8", fontWeight: 700 }}>{stats.planCount[plan]}人</span></span>
            </div>
          ))}
        </div>
        {stats.totalUsers > 0 && (
          <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", height: 12 }}>
            {(["FREE", "STANDARD", "PRO"] as const).map(plan => {
              const pct = (stats.planCount[plan] / stats.totalUsers) * 100;
              return pct > 0 ? (
                <div key={plan} style={{ width: `${pct}%`, background: PLAN_COLOR[plan], opacity: plan === "FREE" ? 0.4 : 0.85 }} title={`${PLAN_LABEL[plan]}: ${stats.planCount[plan]}人`} />
              ) : null;
            })}
          </div>
        )}
      </div>

      {/* ユーザー一覧 */}
      <div style={{ background: "rgba(20,20,22,0.9)", border: "1px solid rgba(212,175,55,0.1)", borderRadius: 14, padding: "20px 24px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#C8C0B0", marginBottom: 16 }}>
          最近の登録ユーザー（直近20件）
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 12, padding: "4px 12px", fontSize: 10, color: "#3A3830", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            <div>メール</div>
            <div>プラン</div>
            <div>ステータス</div>
            <div>登録日</div>
          </div>
          {stats.recentSignups.map(u => (
            <div key={u.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 12, padding: "10px 12px", borderRadius: 8, background: "rgba(10,10,11,0.5)", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, color: "#F5F0E8", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                {u.name && <div style={{ fontSize: 11, color: "#8A8278" }}>{u.name}</div>}
              </div>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: PLAN_COLOR[u.plan] ?? "#8A8278", background: `${PLAN_COLOR[u.plan]}18`, border: `1px solid ${PLAN_COLOR[u.plan]}44`, borderRadius: 20, padding: "3px 8px" }}>
                  {PLAN_LABEL[u.plan] ?? u.plan}
                </span>
              </div>
              <div style={{ fontSize: 11, color: u.subStatus === "ACTIVE" ? "#44ccaa" : "#8A8278" }}>
                {u.subStatus === "ACTIVE" ? "有効" : u.subStatus === "INACTIVE" ? "未契約" : u.subStatus}
              </div>
              <div style={{ fontSize: 11, color: "#8A8278" }}>
                {new Date(u.createdAt).toLocaleDateString("ja-JP")}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

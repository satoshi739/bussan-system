"use client";

import { useEffect, useState, useCallback } from "react";
import { getDashboard, getStalePurchases, getPurchases, getGoal, setGoal, type Dashboard, type Purchase } from "@/lib/api";
import { TrendingUp, ShoppingCart, Package, Banknote, ArrowRight, Target, Pencil, Check, RefreshCw, WifiOff, Loader } from "lucide-react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const card: React.CSSProperties = { background: "rgba(0,14,5,0.9)", border: "1px solid rgba(0,255,80,0.15)", borderRadius: 14, padding: "20px 24px" };

function StatCard({ label, value, icon: Icon, color = "#00ff80", href }: {
  label: string; value: string; icon: React.ElementType; color?: string; href?: string;
}) {
  const content = (
    <div style={{ ...card, cursor: href ? "pointer" : "default", transition: "border-color 0.15s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 12, color: "#8ab89a", fontWeight: 600, marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 26, fontWeight: 900, color, fontFamily: "monospace" }}>{value}</div>
        </div>
        <div style={{ background: "rgba(0,255,80,0.07)", border: "1px solid rgba(0,255,80,0.12)", borderRadius: 10, padding: 10 }}>
          <Icon size={20} color={color} />
        </div>
      </div>
      {href && <div style={{ marginTop: 10, fontSize: 12, color: "#4a8a5a", display: "flex", alignItems: "center", gap: 4 }}>詳細を見る <ArrowRight size={11} /></div>}
    </div>
  );
  return href ? <Link href={href} style={{ textDecoration: "none" }}>{content}</Link> : content;
}

const STATUS_LABELS: Record<string, string> = {
  purchased: "仕入済", listed: "出品中", sold: "売却済", cancelled: "キャンセル",
};

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [stale, setStale] = useState<Purchase[]>([]);
  const [recent, setRecent] = useState<Purchase[]>([]);
  const [goal, setGoalData] = useState<{ month: string; goal: number; current_profit: number } | null>(null);
  const [editGoal, setEditGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [countdown, setCountdown] = useState(5);

  const loadAll = useCallback(async () => {
    try {
      const d = await getDashboard();
      setData(d);
      setError(false);
      getStalePurchases(14).then(setStale).catch(() => {});
      getPurchases({ limit: 5 }).then(setRecent).catch(() => {});
      getGoal().then(setGoalData).catch(() => {});
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // 接続エラー時：5秒ごとに自動リトライ
  useEffect(() => {
    if (!error) return;
    setCountdown(5);
    const tick = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          loadAll();
          setRetryCount(r => r + 1);
          return 5;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [error, retryCount, loadAll]);

  const handleSaveGoal = async () => {
    await setGoal(Number(goalInput));
    const g = await getGoal();
    setGoalData(g);
    setEditGoal(false);
  };

  if (error) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
        <div style={{ ...card, textAlign: "center", padding: "48px 40px", maxWidth: 440, width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <div style={{ background: "rgba(255,100,50,0.08)", border: "1px solid rgba(255,100,50,0.2)", borderRadius: 16, padding: 18 }}>
              <WifiOff size={32} color="#ff9966" />
            </div>
          </div>
          <div style={{ fontWeight: 700, color: "#ff9966", fontSize: 16, marginBottom: 8 }}>バックエンドに接続できません</div>
          <div style={{ fontSize: 13, color: "#4a8a5a", marginBottom: 24, lineHeight: 1.8 }}>
            ターミナルで以下のコマンドを実行してください
          </div>
          <div style={{ background: "rgba(0,0,0,0.5)", borderRadius: 10, padding: "12px 16px", fontFamily: "monospace", fontSize: 13, color: "#00ff80", marginBottom: 24, userSelect: "all", textAlign: "left" }}>
            cd ~/Desktop/bussan-system<br />
            python3 -m uvicorn api:app --reload
          </div>
          <button
            onClick={() => { setRetryCount(r => r + 1); loadAll(); }}
            style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(0,60,20,0.8)", border: "1px solid rgba(0,255,80,0.3)", borderRadius: 10, color: "#4ddc80", padding: "10px 24px", fontWeight: 700, cursor: "pointer", fontSize: 14, margin: "0 auto" }}
          >
            <RefreshCw size={15} /> 今すぐ再接続
          </button>
          <div style={{ marginTop: 14, fontSize: 12, color: "#3a6a4a" }}>
            {countdown}秒後に自動リトライ...
          </div>
        </div>
      </div>
    );
  }

  if (!data) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
      <div style={{ textAlign: "center", color: "#4a8a5a" }}>
        <Loader size={24} color="#4a8a5a" style={{ marginBottom: 12, animation: "spin 1s linear infinite" }} />
        <div>読み込み中...</div>
      </div>
    </div>
  );

  const { stats, monthly_profit, status_breakdown } = data;
  const profitColor = stats.total_profit >= 0 ? "#00ff80" : "#ff6666";
  const isEmpty = stats.total_purchases === 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "#e8f5eb" }}>ダッシュボード</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/calculator" style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0,30,10,0.8)", border: "1px solid rgba(0,255,80,0.2)", borderRadius: 8, color: "#8ab89a", padding: "8px 14px", fontSize: 13, textDecoration: "none", fontWeight: 600 }}>
            🧮 利益計算
          </Link>
          <Link href="/purchases" style={{ display: "flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg,#004d1f,#006629)", border: "1px solid rgba(0,255,80,0.4)", borderRadius: 8, color: "#00ff80", padding: "8px 14px", fontSize: 13, textDecoration: "none", fontWeight: 700 }}>
            + 仕入れ追加
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 16 }}>
        <StatCard label="総仕入れ数" value={`${stats.total_purchases} 件`} icon={ShoppingCart} href="/purchases" />
        <StatCard label="売却済" value={`${stats.total_sold} 件`} icon={Package} color="#4ddc80" href="/sales" />
        <StatCard label="総投資額" value={`¥${Math.round(stats.total_invested).toLocaleString()}`} icon={Banknote} color="#66ccff" />
        <StatCard label="純利益合計" value={`¥${Math.round(stats.total_profit).toLocaleString()}`} icon={TrendingUp} color={profitColor} />
      </div>

      {/* 月次目標 */}
      {goal !== null && (
        <div style={{ ...card, marginBottom: 20, padding: "16px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: goal.goal > 0 ? 12 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Target size={16} color="#00ff80" />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#b8dcc4" }}>{goal.month} の目標</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {editGoal ? (
                <>
                  <input type="number" value={goalInput} onChange={e => setGoalInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSaveGoal()} style={{ background: "rgba(0,12,4,0.95)", border: "1px solid rgba(0,255,80,0.4)", borderRadius: 6, color: "#00ff80", padding: "4px 10px", fontSize: 14, width: 120, fontFamily: "monospace", outline: "none" }} autoFocus placeholder="目標金額" />
                  <button onClick={handleSaveGoal} style={{ background: "rgba(0,60,20,0.8)", border: "1px solid rgba(0,255,80,0.3)", borderRadius: 6, color: "#00ff80", padding: "4px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}><Check size={12} />保存</button>
                  <button onClick={() => setEditGoal(false)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#8ab89a", padding: "4px 8px", cursor: "pointer", fontSize: 12 }}>×</button>
                </>
              ) : (
                <button onClick={() => { setEditGoal(true); setGoalInput(String(goal.goal || "")); }} style={{ background: "transparent", border: "1px solid rgba(0,255,80,0.15)", borderRadius: 6, color: "#4a8a5a", padding: "4px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                  <Pencil size={11} />{goal.goal > 0 ? "変更" : "目標を設定"}
                </button>
              )}
            </div>
          </div>
          {goal.goal > 0 && (() => {
            const pct = Math.min(100, (goal.current_profit / goal.goal) * 100);
            const remaining = goal.goal - goal.current_profit;
            const color = pct >= 100 ? "#00ff80" : pct >= 60 ? "#4ddc80" : pct >= 30 ? "#ffcc44" : "#ff9944";
            return (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: "#8ab89a" }}>今月の利益 <span style={{ color, fontFamily: "monospace", fontWeight: 700 }}>¥{Math.round(goal.current_profit).toLocaleString()}</span></span>
                  <span style={{ color: "#8ab89a" }}>目標 <span style={{ color: "#e8f5eb", fontFamily: "monospace", fontWeight: 700 }}>¥{goal.goal.toLocaleString()}</span>{remaining > 0 && <span style={{ color: "#4a8a5a", marginLeft: 6 }}>あと¥{Math.round(remaining).toLocaleString()}</span>}</span>
                </div>
                <div style={{ background: "rgba(0,255,80,0.06)", borderRadius: 6, height: 10, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, #003a15, ${color})`, borderRadius: 6, transition: "width 0.5s" }} />
                </div>
                <div style={{ textAlign: "right", fontSize: 11, color, marginTop: 4, fontWeight: 700 }}>
                  {pct >= 100 ? "達成！" : `${pct.toFixed(1)}%`}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {isEmpty ? (
        <div style={{ ...card, textAlign: "center", padding: "60px 40px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <div style={{ background: "rgba(0,255,80,0.06)", border: "1px solid rgba(0,255,80,0.15)", borderRadius: 20, padding: 22 }}>
              <ShoppingCart size={36} color="#4a8a5a" />
            </div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#b8dcc4", marginBottom: 8 }}>まずは仕入れを登録しましょう</div>
          <div style={{ fontSize: 13, color: "#4a8a5a", marginBottom: 24 }}>仕入れ→出品→売却の流れで利益を管理できます</div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Link href="/purchases" style={{ background: "linear-gradient(135deg,#004d1f,#006629)", border: "1px solid rgba(0,255,80,0.4)", borderRadius: 10, color: "#00ff80", padding: "12px 24px", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
              仕入れを追加する →
            </Link>
            <Link href="/calculator" style={{ background: "transparent", border: "1px solid rgba(0,255,80,0.2)", borderRadius: 10, color: "#8ab89a", padding: "12px 24px", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
              利益計算を試す
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={card}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#b8dcc4", marginBottom: 16 }}>月別利益（直近12ヶ月）</div>
              {monthly_profit.length === 0 ? (
                <div style={{ color: "#4a8a5a", textAlign: "center", padding: 32 }}>売上データなし</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={[...monthly_profit].reverse()}>
                    <XAxis dataKey="month" tick={{ fill: "#8ab89a", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#8ab89a", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ background: "#060f08", border: "1px solid rgba(0,255,80,0.3)", borderRadius: 8, color: "#e8f5eb" }} formatter={(v) => [`¥${Number(v).toLocaleString()}`, "利益"]} />
                    <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                      {[...monthly_profit].reverse().map((entry, i) => (
                        <Cell key={i} fill={entry.profit >= 0 ? "#00ff80" : "#ff6666"} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {recent.length > 0 && (
              <div style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#b8dcc4" }}>直近の仕入れ</div>
                  <Link href="/purchases" style={{ fontSize: 12, color: "#4a8a5a", textDecoration: "none" }}>すべて見る →</Link>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {recent.map(item => (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                      <span style={{ color: "#d8f0de", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "65%" }}>{item.product_name}</span>
                      <span style={{ color: "#00ff80", fontFamily: "monospace", fontWeight: 700, flexShrink: 0 }}>¥{item.purchase_price.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={card}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#b8dcc4", marginBottom: 16 }}>ステータス内訳</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {status_breakdown.map(({ status, count }) => (
                  <div key={status} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#a8d8b8", fontSize: 13 }}>{STATUS_LABELS[status] ?? status}</span>
                    <span style={{ background: "rgba(0,255,80,0.08)", border: "1px solid rgba(0,255,80,0.18)", borderRadius: 20, padding: "2px 12px", fontWeight: 700, fontSize: 14, color: "#00ff80" }}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {stale.length > 0 && (
              <div style={{ background: "rgba(28,10,0,0.95)", border: "1px solid rgba(255,150,0,0.35)", borderRadius: 14, padding: "16px 20px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#ffaa44", marginBottom: 12 }}>
                  ⚠️ 売れ残り警告 ({stale.length}件)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {stale.slice(0, 4).map(item => {
                    const days = Math.floor((Date.now() - new Date(item.purchase_date).getTime()) / 86400000);
                    return (
                      <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                        <span style={{ color: "#e8d8b0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>{item.product_name}</span>
                        <span style={{ color: "#ff9944", fontWeight: 700, flexShrink: 0 }}>{days}日経過</span>
                      </div>
                    );
                  })}
                </div>
                <Link href="/purchases" style={{ fontSize: 12, color: "#ffaa44", textDecoration: "none", display: "block", marginTop: 10 }}>
                  全て確認する →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

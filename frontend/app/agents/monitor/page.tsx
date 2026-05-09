"use client";

import { useState, useEffect, useCallback } from "react";
import { Activity, Play, RefreshCw, Settings, TrendingUp, Package, Brain } from "lucide-react";
import { getMonitorStatus, runMonitorNow, saveMonitorSettings, getSeasonalIntelligence, getOwnHistory, type MonitorStatus, type SeasonalIntelligence } from "@/lib/api";
import { toast } from "@/components/Toast";
import { errMsg } from "@/lib/errors";

const C = {
  bg0: "var(--bg)", bg1: "var(--surface)", bg2: "var(--surface-2)", bg3: "var(--surface-2)",
  t1: "var(--text)", t2: "var(--text-2)", t3: "var(--text-3)", t4: "var(--text-4)",
  gold: "var(--blue)", goldLt: "var(--blue-lt)",
  up: "#1E9C3C", dn: "#E02E24", warn: "#E88500",
  bd: "var(--border)",
};
const card: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 24px" };

const TASK_LABELS: Record<string, { label: string; desc: string; icon: typeof Play }> = {
  daily_scan:    { label: "デイリースキャン今すぐ実行", desc: "全キーワードをスキャンして承認キューへ",  icon: Brain },
  stale_check:   { label: "売れ残りチェック今すぐ実行", desc: "30日以上売れていない在庫を確認", icon: Package },
  weekly_report: { label: "週次レポート今すぐ送信",     desc: "週間の成績をLINEに送信",           icon: TrendingUp },
};

export default function MonitorPage() {
  const [status, setStatus] = useState<MonitorStatus | null>(null);
  const [seasonal, setSeasonal] = useState<SeasonalIntelligence | null>(null);
  const [history, setHistory] = useState<Record<string, unknown> | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [scanTime, setScanTime] = useState("08:00");
  const [weeklyDay, setWeeklyDay] = useState("monday");
  const [weeklyTime, setWeeklyTime] = useState("09:00");
  const [staleEnabled, setStaleEnabled] = useState(true);

  const load = useCallback(async () => {
    try {
      const [s, sea, hist] = await Promise.all([
        getMonitorStatus(),
        getSeasonalIntelligence(),
        getOwnHistory(30),
      ]);
      setStatus(s);
      setSeasonal(sea);
      setHistory(hist);
    } catch (e) {
      toast(errMsg(e), "error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRunNow = async (task: "daily_scan" | "stale_check" | "weekly_report") => {
    setRunning(task);
    try {
      await runMonitorNow(task);
      toast(`${TASK_LABELS[task].label} 完了`, "success");
      load();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setRunning(null);
    }
  };

  const handleSaveSchedule = async () => {
    try {
      await saveMonitorSettings({
        daily_scan_time: scanTime,
        stale_check_enabled: staleEnabled,
        weekly_report_day: weeklyDay,
        weekly_report_time: weeklyTime,
      });
      toast("スケジュール設定を保存しました", "success");
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };

  const histData = history as Record<string, unknown> | null;

  return (
    <div style={{ background: C.bg0, minHeight: "100vh", padding: "24px 20px", maxWidth: 900, margin: "0 auto" }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ background: `linear-gradient(135deg, #4ade80, #22c55e)`, borderRadius: 12, padding: 10, display: "flex" }}>
          <Activity size={24} color="#0a0a0b" />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ color: C.t1, fontSize: 22, fontWeight: 700, margin: 0 }}>自動監視・スケジュール</h1>
          <p style={{ color: C.t3, fontSize: 13, margin: 0 }}>AIが24時間365日、市場を監視・スキャン・通知します</p>
        </div>
        <button onClick={load} style={{ background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 8, color: C.t3, padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <RefreshCw size={14} /> 更新
        </button>
      </div>

      {/* 稼働状態 */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: status?.running ? C.up : C.dn,
            boxShadow: status?.running ? `0 0 8px ${C.up}` : "none",
          }} />
          <span style={{ color: status?.running ? C.up : C.dn, fontWeight: 700, fontSize: 14 }}>
            {status?.running ? "監視スレッド稼働中" : "監視スレッド停止中"}
          </span>
        </div>

        {status?.scheduled_jobs && status.scheduled_jobs.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {status.scheduled_jobs.map((job, i) => (
              <div key={i} style={{ background: C.bg2, borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: C.t2, fontSize: 13 }}>{job.job}</span>
                <span style={{ color: C.t4, fontSize: 11 }}>次回: {job.next_run?.slice(0, 16)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 季節インテリジェンス */}
      {seasonal && (
        <div style={{ ...card, marginBottom: 20, borderColor: `${C.gold}44` }}>
          <h2 style={{ color: C.gold, fontSize: 14, fontWeight: 700, margin: "0 0 12px 0" }}>
            🗓 今月の市場インテリジェンス — {seasonal.current_season}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ color: C.t3, fontSize: 12, marginBottom: 6 }}>今月の注目カテゴリ</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {seasonal.hot_categories.map((cat, i) => (
                  <span key={i} style={{ background: `${C.gold}18`, color: C.gold, borderRadius: 6, padding: "3px 10px", fontSize: 12 }}>{cat}</span>
                ))}
              </div>
            </div>
            <div>
              <div style={{ color: C.t3, fontSize: 12, marginBottom: 6 }}>戦略メモ</div>
              <div style={{ color: C.t2, fontSize: 13, lineHeight: 1.6 }}>{seasonal.strategy_note}</div>
            </div>
          </div>
          <div style={{ marginTop: 12, padding: "8px 12px", background: C.bg2, borderRadius: 8 }}>
            <span style={{ color: C.t4, fontSize: 11 }}>来月プレビュー: </span>
            <span style={{ color: C.t3, fontSize: 12 }}>{seasonal.next_month_preview.season} — {seasonal.next_month_preview.hot.join(", ")}</span>
          </div>
        </div>
      )}

      {/* 直近30日実績 */}
      {histData && (
        <div style={{ ...card, marginBottom: 20 }}>
          <h2 style={{ color: C.t2, fontSize: 14, fontWeight: 700, margin: "0 0 12px 0" }}>直近30日の実績</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {[
              { label: "売上件数", value: String(histData.total_sold ?? 0) + "件", color: C.gold },
              { label: "総利益", value: `¥${Number(histData.total_profit_jpy ?? 0).toLocaleString()}`, color: C.up },
              { label: "平均利益率", value: `${histData.avg_profit_rate ?? 0}%`, color: Number(histData.avg_profit_rate ?? 0) >= 25 ? C.up : C.warn },
              { label: "売れ残り", value: String(histData.total_unsold ?? 0) + "件", color: Number(histData.total_unsold ?? 0) > 5 ? C.dn : C.t3 },
            ].map((s, i) => (
              <div key={i} style={{ background: C.bg2, borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ color: s.color, fontSize: 18, fontWeight: 700 }}>{s.value}</div>
                <div style={{ color: C.t4, fontSize: 11 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {!!histData.insight && (
            <div style={{ marginTop: 12, padding: "10px 14px", background: `${C.gold}08`, border: `1px solid ${C.bd}`, borderRadius: 8, color: C.t2, fontSize: 13, lineHeight: 1.7 }}>
              {`${histData.insight}`}
            </div>
          )}
        </div>
      )}

      {/* 手動実行 */}
      <div style={{ ...card, marginBottom: 20 }}>
        <h2 style={{ color: C.t2, fontSize: 14, fontWeight: 700, margin: "0 0 16px 0" }}>今すぐ実行</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(Object.keys(TASK_LABELS) as ("daily_scan" | "stale_check" | "weekly_report")[]).map(task => {
            const meta = TASK_LABELS[task];
            const Icon = meta.icon;
            const isRunning = running === task;
            return (
              <div key={task} style={{ background: C.bg2, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <Icon size={18} color={C.gold} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: C.t1, fontSize: 13, fontWeight: 600 }}>{meta.label}</div>
                  <div style={{ color: C.t4, fontSize: 11 }}>{meta.desc}</div>
                </div>
                <button
                  onClick={() => handleRunNow(task)}
                  disabled={!!running}
                  style={{
                    background: isRunning ? C.bg3 : `linear-gradient(135deg, ${C.gold}, ${C.goldLt})`,
                    border: "none", borderRadius: 8,
                    color: isRunning ? C.t4 : "#0a0a0b",
                    padding: "7px 16px", fontSize: 12, fontWeight: 700,
                    cursor: running ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
                  }}
                >
                  <Play size={12} />
                  {isRunning ? "実行中..." : "実行"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* スケジュール設定 */}
      <div style={card}>
        <h2 style={{ color: C.t2, fontSize: 14, fontWeight: 700, margin: "0 0 16px 0" }}>
          <Settings size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
          スケジュール設定
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
          <div>
            <label style={{ color: C.t3, fontSize: 12, display: "block", marginBottom: 6 }}>毎朝スキャン時刻</label>
            <input type="time" value={scanTime} onChange={e => setScanTime(e.target.value)}
              style={{ background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 8, color: C.t1, padding: "8px 12px", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ color: C.t3, fontSize: 12, display: "block", marginBottom: 6 }}>売れ残りチェック</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, height: 38 }}>
              <input type="checkbox" checked={staleEnabled} onChange={e => setStaleEnabled(e.target.checked)} id="stale" style={{ width: 16, height: 16, cursor: "pointer" }} />
              <label htmlFor="stale" style={{ color: C.t2, fontSize: 13, cursor: "pointer" }}>有効（毎日18:00）</label>
            </div>
          </div>
          <div>
            <label style={{ color: C.t3, fontSize: 12, display: "block", marginBottom: 6 }}>週次レポート曜日</label>
            <select value={weeklyDay} onChange={e => setWeeklyDay(e.target.value)}
              style={{ background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 8, color: C.t1, padding: "8px 12px", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" }}>
              {["monday","tuesday","wednesday","thursday","friday","saturday","sunday"].map(d => (
                <option key={d} value={d}>{{"monday":"月曜","tuesday":"火曜","wednesday":"水曜","thursday":"木曜","friday":"金曜","saturday":"土曜","sunday":"日曜"}[d]}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ color: C.t3, fontSize: 12, display: "block", marginBottom: 6 }}>週次レポート時刻</label>
            <input type="time" value={weeklyTime} onChange={e => setWeeklyTime(e.target.value)}
              style={{ background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 8, color: C.t1, padding: "8px 12px", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" }} />
          </div>
        </div>
        <button onClick={handleSaveSchedule}
          style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldLt})`, border: "none", borderRadius: 10, color: "#0a0a0b", padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          スケジュールを保存
        </button>
      </div>
    </div>
  );
}

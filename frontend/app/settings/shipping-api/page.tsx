"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Truck, ArrowLeft, Key, Info, Save } from "lucide-react";
import { toast } from "@/components/Toast";
import { saveApiConfig, useApiConfig, useCarriers } from "@/lib/shipping-store";
import type { ShippingApiConfig, ShippingApiCredential } from "@/types/shipping";

const C = {
  bd: "var(--border)", t1: "var(--text)", t2: "var(--text-2)", t3: "var(--text-3)",
  gold: "var(--blue)", surf: "var(--surface)", surf2: "var(--surface-2)",
};

const card: React.CSSProperties = {
  background: C.surf, border: `1px solid ${C.bd}`, borderRadius: 14, padding: "18px 20px",
};
const inp: React.CSSProperties = {
  background: C.surf2, border: `1px solid ${C.bd}`, borderRadius: 8,
  color: C.t1, padding: "9px 12px", fontSize: 13, outline: "none",
  boxSizing: "border-box", width: "100%", fontFamily: "monospace",
};
const lbl: React.CSSProperties = { fontSize: 11, color: C.t3, fontWeight: 600, display: "block", marginBottom: 5 };
const btnPrimary: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  background: "var(--blue)", color: "#fff", border: "none",
  borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
};
const btnGhost: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  background: "transparent", border: `1px solid ${C.bd}`,
  color: C.t2, borderRadius: 10, padding: "8px 12px", fontSize: 12,
  fontWeight: 600, cursor: "pointer", textDecoration: "none",
};

const EMPTY_CRED: ShippingApiCredential = { apiKey: "", apiSecret: "", accountId: "", endpoint: "" };

export default function ShippingApiSettingsPage() {
  const stored = useApiConfig();
  const carriers = useCarriers();
  const [cfg, setCfg] = useState<ShippingApiConfig | null>(null);
  const [saving, setSaving] = useState(false);

  // 保存済み設定をフォームの初期値として一度だけ取り込む
  useEffect(() => {
    if (cfg === null && stored) setCfg(stored);
  }, [stored, cfg]);

  if (!cfg) {
    return <div style={{ padding: 40, textAlign: "center", color: C.t3 }}>読み込み中...</div>;
  }

  const selectedCarrier = carriers.find(c => c.id === cfg.defaultCarrierId);
  const cred = (cfg.defaultCarrierId && cfg.credentials[cfg.defaultCarrierId]) || EMPTY_CRED;

  const setField = <K extends keyof ShippingApiConfig>(k: K, v: ShippingApiConfig[K]) => {
    setCfg(prev => prev ? { ...prev, [k]: v } : prev);
  };

  const setCredField = (k: keyof ShippingApiCredential, v: string) => {
    if (!cfg.defaultCarrierId) {
      toast("先に配送業者を選んでください", "error");
      return;
    }
    const next: ShippingApiConfig = {
      ...cfg,
      credentials: {
        ...cfg.credentials,
        [cfg.defaultCarrierId]: { ...cred, [k]: v },
      },
    };
    setCfg(next);
  };

  const handleSave = () => {
    setSaving(true);
    try {
      saveApiConfig(cfg);
      toast("配送API設定を保存しました");
    } catch {
      toast("保存に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* ヘッダー */}
      <div style={{ marginBottom: 18 }}>
        <Link href="/shipping" style={{ ...btnGhost, marginBottom: 8 }}>
          <ArrowLeft size={12} /> 配送管理に戻る
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: C.t1, margin: "6px 0 3px", display: "flex", alignItems: "center", gap: 8 }}>
          <Truck size={20} color={C.gold} /> 配送API設定
        </h1>
        <div style={{ fontSize: 12, color: C.t3 }}>
          配送業者のAPIと連携する設定です。今はOFFのままでOK。本物のAPIキーは将来ここに入れて使います。
        </div>
      </div>

      {/* お知らせ */}
      <div style={{ ...card, marginBottom: 14, display: "flex", gap: 12, alignItems: "flex-start", borderColor: "rgba(0,111,230,0.25)", background: "rgba(0,111,230,0.04)" }}>
        <Info size={16} color={C.gold} style={{ marginTop: 2, flexShrink: 0 }} />
        <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.6 }}>
          現在は <b>API連携の準備段階</b> です。設定はちゃんと保存されますが、実際の配送業者APIへの送信はまだ動きません。
          本物のAPI（ヤマトB2クラウド・佐川e飛伝・郵便Web等）と繋ぎ込んだら、ここの設定がそのまま使われます。
        </div>
      </div>

      {/* 基本設定 */}
      <div style={{ ...card, marginBottom: 14 }}>
        <h2 style={{ fontSize: 14, fontWeight: 800, color: C.t1, margin: "0 0 14px" }}>基本設定</h2>

        <div style={{ display: "grid", gap: 14 }}>
          {/* API連携 ON/OFF */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${C.bd}` }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>API連携を有効にする</div>
              <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>
                ONにすると、配送業者APIに追跡番号の取得や送り状発行を依頼できるようになります（今は準備中）
              </div>
            </div>
            <button
              onClick={() => setField("enabled", !cfg.enabled)}
              aria-pressed={cfg.enabled}
              style={{
                width: 44, height: 24, borderRadius: 14,
                background: cfg.enabled ? C.gold : "var(--border-strong)",
                border: "none", cursor: "pointer", position: "relative", padding: 0, flexShrink: 0,
              }}
            >
              <span style={{
                position: "absolute", top: 2, left: cfg.enabled ? 22 : 2,
                width: 20, height: 20, borderRadius: 10, background: "#fff",
                transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </button>
          </div>

          {/* 配送業者選択 */}
          <div>
            <label style={lbl}>連携する配送業者</label>
            <select
              style={{ ...inp, cursor: "pointer", fontFamily: "inherit" }}
              value={cfg.defaultCarrierId ?? ""}
              onChange={e => setField("defaultCarrierId", e.target.value || null)}
            >
              <option value="">選んでください</option>
              {carriers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div style={{ fontSize: 10, color: C.t3, marginTop: 4 }}>
              配送業者は <Link href="/settings/shipping-carriers" style={{ color: C.gold }}>配送業者設定</Link> から追加できます。
            </div>
          </div>

          {/* ステータス自動同期 */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderTop: `1px solid ${C.bd}` }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>配送ステータスを自動で更新する</div>
              <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>
                ONにすると一定時間ごとに配送業者APIに問い合わせ、最新の配送状況に書き換えます
              </div>
            </div>
            <button
              onClick={() => setField("autoSyncStatus", !cfg.autoSyncStatus)}
              style={{
                width: 44, height: 24, borderRadius: 14,
                background: cfg.autoSyncStatus ? C.gold : "var(--border-strong)",
                border: "none", cursor: "pointer", position: "relative", padding: 0, flexShrink: 0,
              }}
            >
              <span style={{
                position: "absolute", top: 2, left: cfg.autoSyncStatus ? 22 : 2,
                width: 20, height: 20, borderRadius: 10, background: "#fff",
                transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </button>
          </div>

          {/* 同期間隔 */}
          {cfg.autoSyncStatus && (
            <div>
              <label style={lbl}>同期する間隔（分）</label>
              <input
                type="number"
                min={5}
                step={5}
                style={inp}
                value={cfg.syncIntervalMin}
                onChange={e => setField("syncIntervalMin", Math.max(5, Number(e.target.value) || 60))}
              />
            </div>
          )}
        </div>
      </div>

      {/* 業者ごとのAPIキー欄（将来用） */}
      <div style={{ ...card, marginBottom: 14 }}>
        <h2 style={{ fontSize: 14, fontWeight: 800, color: C.t1, margin: "0 0 6px", display: "flex", alignItems: "center", gap: 8 }}>
          <Key size={14} color={C.gold} /> APIキー
          {selectedCarrier && <span style={{ fontSize: 11, color: C.t3, fontWeight: 600 }}>— {selectedCarrier.name}</span>}
        </h2>
        <div style={{ fontSize: 11, color: C.t3, marginBottom: 14 }}>
          配送業者から発行されたAPIキーを入力します。今は保存されるだけで送信はしません。
        </div>

        {!cfg.defaultCarrierId ? (
          <div style={{ padding: "24px 0", textAlign: "center", color: C.t3, fontSize: 12 }}>
            先に上の「連携する配送業者」を選んでください
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <label style={lbl}>APIキー（API Key）</label>
              <input style={inp} type="password" value={cred.apiKey} onChange={e => setCredField("apiKey", e.target.value)} placeholder="****-****-****-****" />
            </div>
            <div>
              <label style={lbl}>APIシークレット（API Secret）</label>
              <input style={inp} type="password" value={cred.apiSecret} onChange={e => setCredField("apiSecret", e.target.value)} placeholder="****-****-****-****" />
            </div>
            <div>
              <label style={lbl}>アカウントID（任意）</label>
              <input style={inp} value={cred.accountId} onChange={e => setCredField("accountId", e.target.value)} placeholder="例：契約者コード" />
            </div>
            <div>
              <label style={lbl}>エンドポイントURL（任意）</label>
              <input style={inp} value={cred.endpoint} onChange={e => setCredField("endpoint", e.target.value)} placeholder="https://api.example.com/v1/" />
            </div>
          </div>
        )}
      </div>

      {/* 保存 */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
          <Save size={14} /> {saving ? "保存中..." : "設定を保存"}
        </button>
      </div>
    </div>
  );
}

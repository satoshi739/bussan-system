"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  getFulfillmentVendors, deleteFulfillmentVendor, updateFulfillmentVendor,
  type FulfillmentVendor,
} from "@/lib/api";
import { Plus, Settings, Trash2, CheckCircle, Zap, Mail, MessageCircle, Hand, ArrowLeft } from "lucide-react";
import { toast } from "@/components/Toast";
import { errMsg } from "@/lib/errors";

const S = {
  bg:       "#0f0f10",
  surface:  "rgba(20,20,22,0.95)",
  border:   "rgba(212,175,55,0.14)",
  borderAct:"rgba(212,175,55,0.38)",
  brass:    "#D4AF37",
  text:     "#F5F0E8",
  muted:    "#8A8278",
  faint:    "#3A3830",
  green:    "#44ccaa",
  blue:     "#66aaff",
  purple:   "#aa88ff",
  amber:    "#ffaa44",
} as const;

const card: React.CSSProperties = {
  background: S.surface,
  border: `1px solid ${S.border}`,
  borderRadius: 14,
  padding: "18px 20px",
  transition: "transform 0.15s, border-color 0.15s",
};

// 業者プリセット定義
const VENDOR_PRESETS = [
  {
    type: "openlogi",
    name: "オープンロジ",
    connection_type: "api" as const,
    emoji: "📦",
    description: "EC専用の発送代行サービス。SKU登録・在庫管理・自動出荷に対応。",
    features: ["API連携", "自動出荷", "在庫管理", "伝票自動発行"],
    url: "https://openlogi.com",
    base_fee: 330,
    per_item_fee: 220,
  },
  {
    type: "shippino",
    name: "シッピーノ",
    connection_type: "api" as const,
    emoji: "🚀",
    description: "多モール一元管理の発送代行。Amazon・楽天・Yahoo対応。",
    features: ["多モール対応", "API連携", "リアルタイム在庫", "返品管理"],
    url: "https://shippino.com",
    base_fee: 440,
    per_item_fee: 165,
  },
  {
    type: "logiless",
    name: "ロジレス",
    connection_type: "api" as const,
    emoji: "🏭",
    description: "次世代型EC向けWMS。在庫の可視化・自動出荷・柔軟なカスタマイズ。",
    features: ["WMS機能", "API連携", "自動出荷ルール", "検品対応"],
    url: "https://logiless.com",
    base_fee: 550,
    per_item_fee: 200,
  },
  {
    type: "lojimoplus",
    name: "ロジモプロ",
    connection_type: "api" as const,
    emoji: "📫",
    description: "小口から大口まで対応の柔軟な発送代行。検品・ラッピングオプション充実。",
    features: ["小口対応", "API連携", "検品写真", "ギフト対応"],
    url: "https://logimoplus.jp",
    base_fee: 300,
    per_item_fee: 180,
  },
  {
    type: "email",
    name: "メール連携",
    connection_type: "email" as const,
    emoji: "✉️",
    description: "任意の発送代行業者にメールで依頼。フォーマットを自動生成します。",
    features: ["メール自動生成", "任意業者対応", "履歴管理"],
    url: null,
    base_fee: 0,
    per_item_fee: 0,
  },
  {
    type: "line",
    name: "LINE連携",
    connection_type: "line" as const,
    emoji: "💬",
    description: "LINEメッセージで発送依頼。担当者・業者へリアルタイム通知。",
    features: ["LINE通知", "既読確認", "画像送信"],
    url: null,
    base_fee: 0,
    per_item_fee: 0,
  },
  {
    type: "manual",
    name: "手動管理",
    connection_type: "manual" as const,
    emoji: "📋",
    description: "API・メール連携なし。ステータスを手動で更新して業者を管理します。",
    features: ["ステータス管理", "メモ記録", "履歴確認"],
    url: null,
    base_fee: 0,
    per_item_fee: 0,
  },
];

const CONNECTION_BADGE: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  api:    { label: "API連携", color: S.blue,   icon: <Zap size={10} /> },
  email:  { label: "メール", color: S.purple, icon: <Mail size={10} /> },
  line:   { label: "LINE",   color: S.green,  icon: <MessageCircle size={10} /> },
  manual: { label: "手動",   color: S.faint,  icon: <Hand size={10} /> },
};

export default function VendorsPage() {
  const [vendors, setVendors] = useState<FulfillmentVendor[]>([]);

  const load = useCallback(() => {
    getFulfillmentVendors()
      .then(setVendors)
      .catch(e => toast(errMsg(e), "error"));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (v: FulfillmentVendor) => {
    if (!confirm(`「${v.name}」を削除しますか？`)) return;
    await deleteFulfillmentVendor(v.id);
    toast("削除しました", "info");
    load();
  };

  const handleToggleStatus = async (v: FulfillmentVendor) => {
    const next = v.status === "active" ? "inactive" : "active";
    await updateFulfillmentVendor(v.id, { status: next });
    toast(next === "active" ? `${v.name} を有効化しました` : `${v.name} を無効化しました`);
    load();
  };

  const activeVendors = vendors.filter(v => v.status === "active");
  const inactiveVendors = vendors.filter(v => v.status !== "active");

  const addedTypes = new Set(vendors.map(v => v.vendor_type));
  const availablePresets = VENDOR_PRESETS.filter(p => !addedTypes.has(p.type));

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <Link href="/fulfillment" style={{ color: S.muted, display: "flex", alignItems: "center", gap: 4, fontSize: 12, textDecoration: "none" }}>
          <ArrowLeft size={13} /> 発送管理
        </Link>
        <span style={{ color: S.faint, fontSize: 12 }}>/</span>
        <span style={{ fontSize: 12, color: S.muted }}>発送代行業者</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: S.text, margin: 0 }}>発送代行業者</h1>
          <div style={{ fontSize: 12, color: S.muted, marginTop: 3 }}>業者を連携すると発送タスクから直接依頼を送れます</div>
        </div>
      </div>

      {/* 連携中の業者 */}
      {activeVendors.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: S.green, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
            連携中 ({activeVendors.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {activeVendors.map(v => {
              const badge = CONNECTION_BADGE[v.connection_type] ?? CONNECTION_BADGE.manual;
              return (
                <div key={v.id} style={{ ...card, background: "rgba(68,204,170,0.04)", borderColor: "rgba(68,204,170,0.22)", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ fontSize: 26, flexShrink: 0 }}>
                    {VENDOR_PRESETS.find(p => p.type === v.vendor_type)?.emoji ?? "🏢"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: S.text }}>{v.name}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, background: `${badge.color}18`, border: `1px solid ${badge.color}44`, borderRadius: 20, padding: "2px 8px", color: badge.color }}>
                        {badge.icon} {badge.label}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, background: "rgba(68,204,170,0.12)", border: "1px solid rgba(68,204,170,0.3)", borderRadius: 20, padding: "2px 8px", color: S.green }}>
                        <CheckCircle size={10} /> 稼働中
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: S.muted }}>
                      {v.base_fee > 0 && `基本料 ¥${v.base_fee.toLocaleString()} `}
                      {v.per_item_fee > 0 && `+ 1件 ¥${v.per_item_fee.toLocaleString()}`}
                      {v.contact_email && ` · ${v.contact_email}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <Link
                      href={`/fulfillment/vendors/${v.id}/connect`}
                      style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: `1px solid ${S.border}`, borderRadius: 8, color: S.muted, padding: "6px 12px", fontSize: 12, textDecoration: "none" }}
                    >
                      <Settings size={12} /> 設定
                    </Link>
                    <button
                      onClick={() => handleToggleStatus(v)}
                      style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, color: "#ff6666", padding: "6px 12px", fontSize: 12, cursor: "pointer" }}
                    >
                      無効化
                    </button>
                    <button onClick={() => handleDelete(v)} style={{ background: "transparent", border: `1px solid rgba(255,80,80,0.15)`, borderRadius: 8, color: "#ff6666", cursor: "pointer", padding: "6px 8px" }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 未連携の登録済み業者 */}
      {inactiveVendors.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
            設定済み・未有効 ({inactiveVendors.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {inactiveVendors.map(v => {
              const badge = CONNECTION_BADGE[v.connection_type] ?? CONNECTION_BADGE.manual;
              return (
                <div key={v.id} style={{ ...card, display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ fontSize: 26, flexShrink: 0, opacity: 0.5 }}>
                    {VENDOR_PRESETS.find(p => p.type === v.vendor_type)?.emoji ?? "🏢"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: S.muted }}>{v.name}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, background: `${badge.color}18`, border: `1px solid ${badge.color}44`, borderRadius: 20, padding: "2px 8px", color: badge.color }}>
                        {badge.icon} {badge.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: S.faint }}>無効 · 設定を完了して有効化してください</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => handleToggleStatus(v)} style={{ background: "rgba(68,204,170,0.08)", border: "1px solid rgba(68,204,170,0.25)", borderRadius: 8, color: S.green, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>有効化</button>
                    <Link href={`/fulfillment/vendors/${v.id}/connect`} style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: `1px solid ${S.border}`, borderRadius: 8, color: S.muted, padding: "6px 12px", fontSize: 12, textDecoration: "none" }}>
                      <Settings size={12} /> 設定
                    </Link>
                    <button onClick={() => handleDelete(v)} style={{ background: "transparent", border: `1px solid rgba(255,80,80,0.15)`, borderRadius: 8, color: "#ff6666", cursor: "pointer", padding: "6px 8px" }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 追加できる業者プリセット */}
      {availablePresets.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
            業者を追加
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {availablePresets.map(p => {
              const badge = CONNECTION_BADGE[p.connection_type];
              return (
                <Link
                  key={p.type}
                  href={`/fulfillment/vendors/${p.type}/connect`}
                  style={{ ...card, display: "block", textDecoration: "none", cursor: "pointer" }}
                  className="vendor-preset-card"
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                    <span style={{ fontSize: 28, flexShrink: 0 }}>{p.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: S.text }}>{p.name}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, background: `${badge.color}18`, border: `1px solid ${badge.color}44`, borderRadius: 20, padding: "2px 6px", color: badge.color }}>
                          {badge.icon} {badge.label}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 11, color: S.muted, lineHeight: 1.6 }}>{p.description}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                    {p.features.map(f => (
                      <span key={f} style={{ fontSize: 10, background: "rgba(212,175,55,0.06)", border: `1px solid rgba(212,175,55,0.15)`, borderRadius: 20, padding: "2px 8px", color: S.muted }}>{f}</span>
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    {p.base_fee > 0 ? (
                      <span style={{ fontSize: 11, color: S.faint }}>基本 ¥{p.base_fee.toLocaleString()} + 1件 ¥{p.per_item_fee}</span>
                    ) : (
                      <span style={{ fontSize: 11, color: S.faint }}>料金は業者と直接確認</span>
                    )}
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: S.brass }}>
                      <Plus size={12} /> 追加
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 近日提供予定 */}
      <section>
        <div style={{ fontSize: 11, fontWeight: 700, color: S.faint, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
          近日提供予定
        </div>
        <div style={{ ...card, opacity: 0.45, display: "flex", gap: 16, alignItems: "center" }}>
          <span style={{ fontSize: 24 }}>🔗</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: S.muted, marginBottom: 4 }}>独自発送代行サービス連携</div>
            <div style={{ fontSize: 11, color: S.faint }}>物販チェッカー専用の発送代行ネットワーク。最安値自動選択・一括管理・追跡自動化を提供予定。</div>
          </div>
        </div>
      </section>

      <style>{`
        .vendor-preset-card:hover {
          transform: translateY(-1px) !important;
          border-color: rgba(212,175,55,0.3) !important;
        }
      `}</style>
    </div>
  );
}

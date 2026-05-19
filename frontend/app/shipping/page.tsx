"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Truck, Package, Search, Plus, ExternalLink, Settings, X, Trash2, RefreshCw, Lock } from "lucide-react";
import { toast } from "@/components/Toast";
import {
  useShipments,
  useCarriers,
  upsertShipment,
  deleteShipment,
  summarize,
} from "@/lib/shipping-store";
import {
  SHIPMENT_STATUS_LABEL,
  SHIPMENT_STATUS_COLOR,
  type Shipment,
  type ShipmentStatus,
  type Carrier,
} from "@/types/shipping";
import { usePlan } from "@/lib/usePlan";

const C = {
  bd:   "var(--border)",
  t1:   "var(--text)",
  t2:   "var(--text-2)",
  t3:   "var(--text-3)",
  gold: "var(--blue)",
  surf: "var(--surface)",
  surf2:"var(--surface-2)",
};

const card: React.CSSProperties = {
  background: C.surf,
  border: `1px solid ${C.bd}`,
  borderRadius: 14,
  padding: "18px 20px",
};

const inp: React.CSSProperties = {
  background: C.surf2,
  border: `1px solid ${C.bd}`,
  borderRadius: 8,
  color: C.t1,
  padding: "9px 12px",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

const btnPrimary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "var(--blue)",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "9px 14px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "transparent",
  border: `1px solid ${C.bd}`,
  color: C.t2,
  borderRadius: 10,
  padding: "9px 14px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none",
};

const STATUS_TABS: { key: "all" | ShipmentStatus; label: string }[] = [
  { key: "all",        label: "すべて" },
  { key: "pending",    label: "発送待ち" },
  { key: "preparing",  label: "準備中" },
  { key: "shipped",    label: "発送済み" },
  { key: "in_transit", label: "配送中" },
  { key: "delivered",  label: "配達完了" },
  { key: "problem",    label: "トラブル" },
];

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

function StatusPill({ status }: { status: ShipmentStatus }) {
  const color = SHIPMENT_STATUS_COLOR[status];
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "3px 10px",
      borderRadius: 999,
      background: `${color}15`,
      color,
      fontSize: 11,
      fontWeight: 700,
      whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
      {SHIPMENT_STATUS_LABEL[status]}
    </span>
  );
}

export default function ShippingPage() {
  const shipments = useShipments();
  const carriers  = useCarriers();
  const { plan, loading: planLoading } = usePlan();
  const canUseShipping = plan === "STANDARD" || plan === "PRO";
  const [search, setSearch]     = useState("");
  const [tab, setTab]           = useState<"all" | ShipmentStatus>("all");
  const [editing, setEditing]   = useState<Shipment | null>(null);
  const [creating, setCreating] = useState(false);
  const [issuing, setIssuing]   = useState<string | null>(null);
  const loading = false;

  const stats = useMemo(() => summarize(shipments), [shipments]);

  const filtered = useMemo(() => {
    return shipments.filter(s => {
      if (tab !== "all") {
        if (tab === "problem") {
          if (!["problem", "returned", "on_hold"].includes(s.status)) return false;
        } else if (s.status !== tab) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const hit = [s.productName, s.orderId, s.buyerName, s.trackingNumber, s.carrierName, s.marketplace]
          .filter(Boolean)
          .some(v => String(v).toLowerCase().includes(q));
        if (!hit) return false;
      }
      return true;
    });
  }, [shipments, tab, search]);

  const handleSave = (form: Partial<Shipment>) => {
    if (!form.productName || !form.carrierId) {
      toast("商品名と配送業者は必須です", "error");
      return;
    }
    upsertShipment(form as Partial<Shipment> & { productName: string; carrierId: string });
    setEditing(null);
    setCreating(false);
    toast("配送情報を保存しました");
  };

  const handleDelete = (id: string) => {
    if (!confirm("この配送データを削除しますか？")) return;
    deleteShipment(id);
    setEditing(null);
    toast("削除しました", "info");
  };

  // ヤマトで送り状を発行 (モック動作: YAMATO_API_MOCK=true 時)
  // 既存shipment の buyer 情報から recipient 情報を組み立てて POST する。
  // 郵便番号/電話番号は既存UIに無いため、住所から正規表現で抽出 or プレースホルダ。
  const handleIssueYamatoLabel = async (s: Shipment) => {
    if (!canUseShipping) {
      toast("Standard以上のプランで利用できます", "error");
      return;
    }
    const postalMatch = s.buyerAddress.match(/(\d{3}-?\d{4})/);
    const recipientPostalCode = postalMatch?.[1] ?? "100-0001";
    const recipientAddress =
      s.buyerAddress.replace(/^〒?\s*\d{3}-?\d{4}\s*/, "") || s.buyerAddress || "東京都千代田区1-1-1";
    const recipientPhone = "03-0000-0000"; // モック用プレースホルダ（実運用ではフォームで取得）

    setIssuing(s.id);
    try {
      const res = await fetch("/api/shipping-labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalOrderId: s.orderId || s.id,
          carrier: "yamato",
          recipientName: s.buyerName || "—",
          recipientPostalCode,
          recipientAddress,
          recipientPhone,
          packageName: s.productName,
        }),
      });
      const data = await res.json().catch(() => ({} as { error?: string; code?: string }));
      if (!res.ok) {
        if (res.status === 403 && data.code === "FORBIDDEN_TIER") {
          toast("Standard以上のプランで利用できます", "error");
        } else if (res.status === 401) {
          toast("ログインが必要です", "error");
        } else {
          toast(data.error ?? "送り状の発行に失敗しました", "error");
        }
        return;
      }
      const label = data.shippingLabel as {
        id: string;
        trackingNumber: string;
        trackingUrl: string;
        labelIssueId: string | null;
      };
      // 既存shipment(localStorage)に追跡番号を反映
      upsertShipment({
        ...s,
        trackingNumber: label.trackingNumber,
        trackingUrl: label.trackingUrl,
        status: "shipped",
        shippedAt: new Date().toISOString(),
      });
      toast(`ヤマト送り状を発行しました: ${label.trackingNumber}`);
    } catch {
      toast("送り状の発行に失敗しました（ネットワークエラー）", "error");
    } finally {
      setIssuing(null);
    }
  };

  return (
    <div>
      <style>{`
        @media (max-width: 768px) {
          .ship-kpi { grid-template-columns: repeat(2,1fr) !important; }
          .ship-header { flex-direction: column !important; align-items: flex-start !important; }
          .ship-table-row > * { font-size: 12px !important; }
        }
        .ship-row:hover { background: var(--nav-hover) !important; }
      `}</style>

      {/* ── タイトル ── */}
      <div className="ship-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, gap: 10, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: C.t1, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Truck size={20} color={C.gold} /> 配送管理
          </h1>
          <div style={{ fontSize: 12, color: C.t3, marginTop: 3 }}>
            売れた商品の発送状況・追跡番号・配送業者を管理できます。
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/settings/shipping-carriers" style={btnGhost}>
            <Settings size={14} /> 配送業者設定
          </Link>
          <Link href="/settings/shipping-api" style={btnGhost}>
            <Settings size={14} /> API連携
          </Link>
          <button onClick={() => setCreating(true)} style={btnPrimary}>
            <Plus size={14} /> 配送を追加
          </button>
        </div>
      </div>

      {/* ── ステータスカード ── */}
      <div className="ship-kpi" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 18 }}>
        {[
          { label: "全体",     value: stats.total,                                  color: C.gold },
          { label: "発送待ち", value: stats.pending + stats.preparing,              color: "#E88500" },
          { label: "発送済み", value: stats.shipped,                                color: "#3B8EEA" },
          { label: "配送中",   value: stats.inTransit,                              color: "#3B8EEA" },
          { label: "配達完了", value: stats.delivered,                              color: "#1E9C3C" },
        ].map(k => (
          <div key={k.label} style={card}>
            <div style={{ fontSize: 11, color: C.t3, marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: k.color, fontFamily: "monospace" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {stats.problem > 0 && (
        <div style={{ ...card, borderColor: "rgba(224,46,36,0.4)", background: "rgba(224,46,36,0.04)", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#E02E24" }} />
          <span style={{ fontSize: 13, color: C.t1, fontWeight: 700 }}>
            要対応の配送が {stats.problem} 件あります（返送・保留・トラブル）
          </span>
        </div>
      )}

      {/* ── フィルタ ── */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.t3 }} />
          <input
            style={{ ...inp, width: "100%", paddingLeft: 30 }}
            placeholder="商品名・注文番号・追跡番号・買い手名で検索..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {STATUS_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "7px 13px",
                borderRadius: 20,
                border: `1px solid ${tab === t.key ? "rgba(0,111,230,0.5)" : C.bd}`,
                background: tab === t.key ? "rgba(0,111,230,0.10)" : "transparent",
                color: tab === t.key ? C.gold : C.t3,
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── テーブル ── */}
      <div style={card}>
        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: C.t3 }}>読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center" }}>
            <Package size={36} color={C.t3} style={{ margin: "0 auto 10px", display: "block" }} />
            <div style={{ color: C.t2, fontSize: 14, fontWeight: 600 }}>該当する配送はまだありません</div>
            <div style={{ color: C.t3, fontSize: 12, marginTop: 4 }}>
              右上の「配送を追加」ボタンから登録できます
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", color: C.t3, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  <th style={{ padding: "10px 8px", borderBottom: `1px solid ${C.bd}` }}>商品 / 注文</th>
                  <th style={{ padding: "10px 8px", borderBottom: `1px solid ${C.bd}` }}>買い手</th>
                  <th style={{ padding: "10px 8px", borderBottom: `1px solid ${C.bd}` }}>配送業者</th>
                  <th style={{ padding: "10px 8px", borderBottom: `1px solid ${C.bd}` }}>追跡番号</th>
                  <th style={{ padding: "10px 8px", borderBottom: `1px solid ${C.bd}` }}>状態</th>
                  <th style={{ padding: "10px 8px", borderBottom: `1px solid ${C.bd}` }}>発送予定</th>
                  <th style={{ padding: "10px 8px", borderBottom: `1px solid ${C.bd}`, width: 220 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className="ship-row" style={{ borderBottom: `1px solid ${C.bd}` }}>
                    <td style={{ padding: "12px 8px" }}>
                      <div style={{ color: C.t1, fontWeight: 600, marginBottom: 2 }}>{s.productName}</div>
                      <div style={{ color: C.t3, fontSize: 11 }}>
                        {s.marketplace ? `${s.marketplace} / ` : ""}{s.orderId || "—"}
                      </div>
                    </td>
                    <td style={{ padding: "12px 8px", color: C.t2 }}>{s.buyerName || "—"}</td>
                    <td style={{ padding: "12px 8px", color: C.t2 }}>{s.carrierName}</td>
                    <td style={{ padding: "12px 8px", fontFamily: "monospace", color: C.t2, fontSize: 12 }}>
                      {s.trackingNumber ? (
                        s.trackingUrl ? (
                          <a href={s.trackingUrl} target="_blank" rel="noopener noreferrer" style={{ color: C.gold, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                            {s.trackingNumber} <ExternalLink size={11} />
                          </a>
                        ) : (
                          <span>{s.trackingNumber}</span>
                        )
                      ) : "—"}
                    </td>
                    <td style={{ padding: "12px 8px" }}><StatusPill status={s.status} /></td>
                    <td style={{ padding: "12px 8px", color: C.t3, fontSize: 12 }}>{fmtDate(s.scheduledShipDate)}</td>
                    <td style={{ padding: "12px 8px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
                        {s.carrierId === "yamato" && !s.trackingNumber && (
                          <button
                            onClick={() => handleIssueYamatoLabel(s)}
                            disabled={planLoading || issuing === s.id}
                            title={canUseShipping ? "ヤマトで送り状発行（モック）" : "Standard以上のプランで利用できます"}
                            style={{
                              ...btnGhost,
                              padding: "6px 10px",
                              fontSize: 12,
                              cursor: planLoading || issuing === s.id ? "not-allowed" : "pointer",
                              ...(canUseShipping
                                ? { borderColor: "rgba(0,111,230,0.4)", color: C.gold }
                                : { color: C.t3, opacity: 0.7 }),
                            }}
                          >
                            {canUseShipping ? (
                              issuing === s.id ? "発行中..." : "ヤマト発行"
                            ) : (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <Lock size={11} /> Standard以上
                              </span>
                            )}
                          </button>
                        )}
                        {s.carrierId === "yamato" && s.trackingNumber && (
                          <span style={{
                            fontSize: 11,
                            color: "#1E9C3C",
                            fontWeight: 700,
                            padding: "6px 10px",
                            background: "rgba(30,156,60,0.10)",
                            borderRadius: 8,
                            whiteSpace: "nowrap",
                          }}>発行済</span>
                        )}
                        <button onClick={() => setEditing(s)} style={{ ...btnGhost, padding: "6px 10px", fontSize: 12 }}>編集</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── モーダル ── */}
      {(editing || creating) && (
        <ShipmentModal
          initial={editing ?? undefined}
          carriers={carriers}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={handleSave}
          onDelete={editing ? () => handleDelete(editing.id) : undefined}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
//   モーダル
// ──────────────────────────────────────────────
function ShipmentModal({
  initial,
  carriers,
  onClose,
  onSave,
  onDelete,
}: {
  initial?: Shipment;
  carriers: Carrier[];
  onClose: () => void;
  onSave: (form: Partial<Shipment>) => void;
  onDelete?: () => void;
}) {
  const activeCarriers = carriers.filter(c => c.isActive);
  const [form, setForm] = useState<Partial<Shipment>>(
    initial ?? {
      productName: "",
      orderId: "",
      marketplace: "",
      buyerName: "",
      buyerAddress: "",
      carrierId: activeCarriers[0]?.id ?? "",
      trackingNumber: "",
      status: "pending",
      memo: "",
      scheduledShipDate: null,
      shippedAt: null,
      estimatedDeliveryDate: null,
      deliveredAt: null,
    }
  );

  const lbl: React.CSSProperties = { fontSize: 11, color: C.t3, fontWeight: 600, display: "block", marginBottom: 5 };

  const setField = <K extends keyof Shipment>(k: K, v: Shipment[K] | null) => {
    setForm(f => ({ ...f, [k]: v }));
  };

  // 日付フィールド用のヘルパ（input type="date" → ISO文字列）
  const toDateInput = (iso: string | null | undefined) => iso ? iso.slice(0, 10) : "";
  const fromDateInput = (v: string) => v ? new Date(v + "T00:00:00").toISOString() : null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.surf, border: `1px solid ${C.bd}`,
          borderRadius: 16, width: "100%", maxWidth: 640, maxHeight: "90vh",
          overflowY: "auto", padding: "20px 24px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: C.t1, margin: 0 }}>
            {initial ? "配送を編集" : "配送を追加"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.t3, cursor: "pointer", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <label style={lbl}>商品名 <span style={{ color: "#E02E24" }}>*</span></label>
            <input
              style={{ ...inp, width: "100%" }}
              value={form.productName ?? ""}
              onChange={e => setField("productName", e.target.value)}
              placeholder="例：ナイキ エアジョーダン1 27cm"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>注文番号</label>
              <input style={{ ...inp, width: "100%" }} value={form.orderId ?? ""} onChange={e => setField("orderId", e.target.value)} placeholder="M-20260516-001" />
            </div>
            <div>
              <label style={lbl}>販売先（マーケット）</label>
              <input style={{ ...inp, width: "100%" }} value={form.marketplace ?? ""} onChange={e => setField("marketplace", e.target.value)} placeholder="メルカリ / ヤフオク / eBay" />
            </div>
          </div>

          <div>
            <label style={lbl}>買い手の名前</label>
            <input style={{ ...inp, width: "100%" }} value={form.buyerName ?? ""} onChange={e => setField("buyerName", e.target.value)} />
          </div>

          <div>
            <label style={lbl}>配送先の住所</label>
            <textarea
              style={{ ...inp, width: "100%", minHeight: 60, fontFamily: "inherit" }}
              value={form.buyerAddress ?? ""}
              onChange={e => setField("buyerAddress", e.target.value)}
              placeholder="〒000-0000 ..."
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>配送業者 <span style={{ color: "#E02E24" }}>*</span></label>
              <select
                style={{ ...inp, width: "100%", cursor: "pointer" }}
                value={form.carrierId ?? ""}
                onChange={e => setField("carrierId", e.target.value)}
              >
                <option value="">選択してください</option>
                {activeCarriers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>追跡番号</label>
              <input
                style={{ ...inp, width: "100%", fontFamily: "monospace" }}
                value={form.trackingNumber ?? ""}
                onChange={e => setField("trackingNumber", e.target.value || null)}
                placeholder="例：1234-5678-9012"
              />
            </div>
          </div>

          <div>
            <label style={lbl}>配送ステータス</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(Object.keys(SHIPMENT_STATUS_LABEL) as ShipmentStatus[]).map(st => {
                const active = form.status === st;
                const color = SHIPMENT_STATUS_COLOR[st];
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setField("status", st)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 999,
                      border: `1px solid ${active ? color : C.bd}`,
                      background: active ? `${color}15` : "transparent",
                      color: active ? color : C.t3,
                      fontWeight: active ? 700 : 500,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    {SHIPMENT_STATUS_LABEL[st]}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>発送予定日</label>
              <input
                type="date"
                style={{ ...inp, width: "100%" }}
                value={toDateInput(form.scheduledShipDate)}
                onChange={e => setField("scheduledShipDate", fromDateInput(e.target.value))}
              />
            </div>
            <div>
              <label style={lbl}>発送した日</label>
              <input
                type="date"
                style={{ ...inp, width: "100%" }}
                value={toDateInput(form.shippedAt)}
                onChange={e => setField("shippedAt", fromDateInput(e.target.value))}
              />
            </div>
            <div>
              <label style={lbl}>到着予定日</label>
              <input
                type="date"
                style={{ ...inp, width: "100%" }}
                value={toDateInput(form.estimatedDeliveryDate)}
                onChange={e => setField("estimatedDeliveryDate", fromDateInput(e.target.value))}
              />
            </div>
            <div>
              <label style={lbl}>配達完了日</label>
              <input
                type="date"
                style={{ ...inp, width: "100%" }}
                value={toDateInput(form.deliveredAt)}
                onChange={e => setField("deliveredAt", fromDateInput(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label style={lbl}>発送メモ</label>
            <textarea
              style={{ ...inp, width: "100%", minHeight: 60, fontFamily: "inherit" }}
              value={form.memo ?? ""}
              onChange={e => setField("memo", e.target.value || null)}
              placeholder="梱包サイズ、注意事項、買い手とのやりとりメモなど"
            />
          </div>
        </div>

        {/* フッター */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 22, paddingTop: 16, borderTop: `1px solid ${C.bd}` }}>
          <div>
            {onDelete && (
              <button onClick={onDelete} style={{ ...btnGhost, color: "#E02E24", borderColor: "rgba(224,46,36,0.3)" }}>
                <Trash2 size={13} /> 削除
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={btnGhost}>キャンセル</button>
            <button onClick={() => onSave(form)} style={btnPrimary}>
              <RefreshCw size={13} /> 保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

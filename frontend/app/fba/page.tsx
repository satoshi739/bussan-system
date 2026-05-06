"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getFbaShipments, createFbaShipment, updateFbaShipment, deleteFbaShipment,
  addFbaShipmentItem, deleteFbaShipmentItem, updateFbaShipmentItem,
  getPurchases,
  type FbaShipment, type FbaShipmentItem, type Purchase,
} from "@/lib/api";
import {
  Plus, Package, Trash2, ChevronDown, ChevronUp, CheckCircle,
  Send, BoxesIcon, Printer, Edit2, Save, RefreshCw,
} from "lucide-react";
import { toast } from "@/components/Toast";
import RequirePlan from "@/components/RequirePlan";

// ── Design tokens ──────────────────────────────────────────────
const C = {
  bg0: "#0a0a0b", bg1: "#141414", bg2: "#1c1c1e",
  t1: "#F5F0E8", t2: "#C8C0B0", t3: "#8A8278", t4: "#5A5248",
  gold: "#D4AF37", goldDm: "#9A7D25",
  bd: "rgba(212,175,55,0.15)", bdSt: "rgba(212,175,55,0.4)",
  up: "#22c55e", dn: "#ef4444", blue: "#66ccff", warn: "#ff9966",
};

const inp: React.CSSProperties = {
  background: "rgba(10,10,11,0.95)", border: `1px solid rgba(212,175,55,0.3)`,
  borderRadius: 8, color: C.t1, padding: "8px 12px", fontSize: 13,
  width: "100%", outline: "none", boxSizing: "border-box",
};
const lbl: React.CSSProperties = {
  fontSize: 11, color: C.t3, fontWeight: 700, display: "block", marginBottom: 4,
};
const card: React.CSSProperties = {
  background: C.bg1, border: `1px solid ${C.bd}`, borderRadius: 14,
};

// ── Status config ──────────────────────────────────────────────
const STATUS_MAP = {
  draft:    { label: "下書き",   color: C.t3,    bg: "rgba(90,82,72,0.2)" },
  ready:    { label: "発送準備", color: "#66ccff", bg: "rgba(102,204,255,0.12)" },
  sent:     { label: "発送済み", color: C.gold,   bg: "rgba(212,175,55,0.12)" },
  received: { label: "受領済み", color: C.up,     bg: "rgba(34,197,94,0.12)" },
} as const;

const STATUS_FLOW: Array<keyof typeof STATUS_MAP> = ["draft", "ready", "sent", "received"];

const CONDITIONS = ["NewItem", "UsedLikeNew", "UsedVeryGood", "UsedGood", "UsedAcceptable"];
const FBA_DESTINATIONS = [
  "Amazon倉庫（川越FC）", "Amazon倉庫（多治見FC）", "Amazon倉庫（八千代FC）",
  "Amazon倉庫（堺FC）", "Amazon倉庫（西宮FC）",
];

// ── FNSKU ラベル印刷（ダミー）──────────────────────────────────
function generateFnsku(shipmentId: number, itemId: number): string {
  return `X${String(shipmentId).padStart(4, "0")}${String(itemId).padStart(4, "0")}`;
}

function printLabel(item: FbaShipmentItem) {
  const fnsku = item.fnsku || generateFnsku(item.shipment_id, item.id);
  const win = window.open("", "_blank", "width=400,height=300");
  if (!win) return;
  win.document.write(`
    <html><head><title>FNSKUラベル</title>
    <style>body{font-family:monospace;padding:20px;text-align:center}
    .barcode{font-size:28px;letter-spacing:4px;border:2px solid #000;padding:8px 16px;margin:10px 0}
    .info{font-size:11px;color:#666}</style></head>
    <body>
      <div style="font-size:12px;font-weight:bold">${item.product_name}</div>
      <div class="barcode">${fnsku}</div>
      <div class="info">FNSKU: ${fnsku}</div>
      <div class="info">状態: ${item.condition_type}</div>
      <div class="info">数量: ${item.quantity}</div>
      <div class="info" style="margin-top:8px">箱 #${item.box_number}</div>
      <script>window.print();window.close();</script>
    </body></html>
  `);
}

// ── Main Page ──────────────────────────────────────────────────
export default function FbaPage() {
  const [shipments, setShipments] = useState<FbaShipment[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // 新規プランフォーム
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    plan_name: "", destination: FBA_DESTINATIONS[0], box_count: 1, notes: "",
  });

  // 商品追加フォーム（shipment_idごと）
  const [addItemId, setAddItemId] = useState<number | null>(null);
  const [itemForm, setItemForm] = useState({
    purchase_id: "", product_name: "", asin: "",
    quantity: 1, box_number: 1, condition_type: "NewItem", notes: "",
  });

  // インライン編集
  const [editItemId, setEditItemId] = useState<number | null>(null);
  const [editItemForm, setEditItemForm] = useState<Partial<FbaShipmentItem>>({});

  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      getFbaShipments(),
      getPurchases({ status: "purchased" }),
    ]).then(([s, p]) => {
      setShipments(s);
      setPurchases(p);
    }).catch(() => toast("データ取得に失敗しました", "error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  // ── プラン作成 ────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.plan_name) { toast("プラン名を入力してください", "error"); return; }
    setSaving(true);
    try {
      const res = await createFbaShipment({
        plan_name: form.plan_name, destination: form.destination,
        box_count: form.box_count, notes: form.notes || undefined,
      });
      toast("納品プランを作成しました");
      setShowForm(false);
      setForm({ plan_name: "", destination: FBA_DESTINATIONS[0], box_count: 1, notes: "" });
      load();
      setExpanded(prev => new Set(prev).add(res.id));
    } catch { toast("作成に失敗しました", "error"); }
    finally { setSaving(false); }
  };

  // ── ステータス更新 ─────────────────────────────────────────────
  const handleStatusChange = async (id: number, status: string) => {
    await updateFbaShipment(id, { status });
    load();
    toast("ステータスを更新しました");
  };

  // ── プラン削除 ────────────────────────────────────────────────
  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    await deleteFbaShipment(id);
    toast("削除しました", "info");
    load();
  };

  // ── 商品追加 ──────────────────────────────────────────────────
  const handleAddItem = async (shipmentId: number) => {
    if (!itemForm.product_name && !itemForm.purchase_id) {
      toast("商品を選択または名前を入力してください", "error"); return;
    }
    setSaving(true);
    try {
      let name = itemForm.product_name;
      if (itemForm.purchase_id && !name) {
        const p = purchases.find(p => p.id === Number(itemForm.purchase_id));
        name = p?.product_name ?? "";
      }
      await addFbaShipmentItem(shipmentId, {
        purchase_id: itemForm.purchase_id ? Number(itemForm.purchase_id) : undefined,
        product_name: name, asin: itemForm.asin || undefined,
        quantity: itemForm.quantity, box_number: itemForm.box_number,
        condition_type: itemForm.condition_type, notes: itemForm.notes || undefined,
      });
      toast("商品を追加しました");
      setAddItemId(null);
      resetItemForm();
      load();
    } catch { toast("商品の追加に失敗しました", "error"); }
    finally { setSaving(false); }
  };

  const resetItemForm = () => setItemForm({
    purchase_id: "", product_name: "", asin: "",
    quantity: 1, box_number: 1, condition_type: "NewItem", notes: "",
  });

  // ── 商品削除 ──────────────────────────────────────────────────
  const handleDeleteItem = async (itemId: number, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    await deleteFbaShipmentItem(itemId);
    toast("削除しました", "info");
    load();
  };

  // ── 商品インライン編集 ─────────────────────────────────────────
  const startEditItem = (item: FbaShipmentItem) => {
    setEditItemId(item.id);
    setEditItemForm({ quantity: item.quantity, box_number: item.box_number, condition_type: item.condition_type, asin: item.asin, notes: item.notes });
  };
  const saveEditItem = async (itemId: number) => {
    await updateFbaShipmentItem(itemId, {
      quantity: editItemForm.quantity,
      box_number: editItemForm.box_number,
      condition_type: editItemForm.condition_type,
      asin: editItemForm.asin,
      notes: editItemForm.notes,
    });
    setEditItemId(null);
    load();
    toast("更新しました");
  };

  // ── サマリー ──────────────────────────────────────────────────
  const total = shipments.length;
  const byStatus = (s: string) => shipments.filter(sh => sh.status === s).length;

  return (
    <RequirePlan requiredPlan="STANDARD" featureName="FBA納品管理">
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>

      {/* ── ヘッダー ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: C.t1, margin: 0 }}>FBA納品管理</h1>
          <div style={{ fontSize: 12, color: C.t3, marginTop: 3 }}>
            納品プランの作成・商品登録・ラベル発行・発送管理
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={load} style={{ background: "transparent", border: `1px solid ${C.bd}`, borderRadius: 9, color: C.t3, padding: "9px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 13 }}>
            <RefreshCw size={13} /> 更新
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg,#1e1608,#2a1e08)", border: `1px solid ${C.bdSt}`, borderRadius: 10, color: C.gold, padding: "10px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
          >
            <Plus size={16} /> 納品プラン作成
          </button>
        </div>
      </div>

      {/* ── KPIカード ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "総プラン数", value: total, color: C.t2, icon: <BoxesIcon size={16} /> },
          { label: "発送準備中", value: byStatus("ready"), color: C.blue, icon: <Package size={16} /> },
          { label: "発送済み",   value: byStatus("sent"),     color: C.gold, icon: <Send size={16} /> },
          { label: "受領済み",   value: byStatus("received"), color: C.up,   icon: <CheckCircle size={16} /> },
        ].map(({ label, value, color, icon }) => (
          <div key={label} style={{ ...card, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color, marginBottom: 8 }}>
              {icon}
              <span style={{ fontSize: 11, fontWeight: 700 }}>{label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color, fontFamily: "monospace" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── 新規プランフォーム ── */}
      {showForm && (
        <div style={{ ...card, padding: "20px 24px", marginBottom: 16, border: `1px solid ${C.bdSt}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.t2, marginBottom: 14 }}>新規納品プラン作成</div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={lbl}>プラン名 *</label>
              <input style={inp} value={form.plan_name} onChange={e => setForm(p => ({ ...p, plan_name: e.target.value }))} placeholder="例: 2024-04 任天堂ゲーム機" autoFocus />
            </div>
            <div>
              <label style={lbl}>送付先倉庫</label>
              <select style={inp} value={form.destination} onChange={e => setForm(p => ({ ...p, destination: e.target.value }))}>
                {FBA_DESTINATIONS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>箱数</label>
              <input type="number" min="1" style={inp} value={form.box_count} onChange={e => setForm(p => ({ ...p, box_count: Number(e.target.value) }))} />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>メモ</label>
            <input style={inp} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="特記事項など" />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleCreate} disabled={saving} style={{ background: "linear-gradient(135deg,#1e1608,#2a1e08)", border: `1px solid ${C.bdSt}`, borderRadius: 8, color: C.gold, padding: "10px 24px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
              {saving ? "作成中..." : "プランを作成"}
            </button>
            <button onClick={() => setShowForm(false)} style={{ background: "transparent", border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 8, color: C.t3, padding: "10px 16px", cursor: "pointer" }}>
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* ── プラン一覧 ── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: C.t3 }}>読み込み中...</div>
      ) : shipments.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: 60 }}>
          <Package size={40} color="rgba(212,175,55,0.2)" style={{ margin: "0 auto 12px", display: "block" }} />
          <div style={{ color: C.t3, fontSize: 14, marginBottom: 16 }}>納品プランがありません</div>
          <button onClick={() => setShowForm(true)} style={{ background: "linear-gradient(135deg,#1e1608,#2a1e08)", border: `1px solid ${C.bdSt}`, borderRadius: 9, color: C.gold, padding: "10px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            最初の納品プランを作成 →
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {shipments.map(ship => {
            const st = STATUS_MAP[ship.status] ?? STATUS_MAP.draft;
            const isOpen = expanded.has(ship.id);
            const currentStepIdx = STATUS_FLOW.indexOf(ship.status as keyof typeof STATUS_MAP);
            const nextStatus = STATUS_FLOW[currentStepIdx + 1];

            return (
              <div key={ship.id} style={{ ...card, overflow: "hidden" }}>
                {/* ── プランヘッダー ── */}
                <div
                  style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
                  onClick={() => toggleExpand(ship.id)}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, padding: "3px 10px", borderRadius: 20, flexShrink: 0 }}>
                    {st.label}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: C.t1, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ship.plan_name}
                    </div>
                    <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>
                      {ship.destination} · 箱{ship.box_count}個 · 商品{ship.total_items}点 · {ship.created_at?.slice(0, 10)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    {/* ステータス進行ボタン */}
                    {nextStatus && (
                      <button
                        onClick={() => handleStatusChange(ship.id, nextStatus)}
                        style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(212,175,55,0.08)", border: `1px solid ${C.bdSt}`, borderRadius: 8, color: C.gold, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                      >
                        {nextStatus === "ready" && <><Package size={12} /> 準備完了</>}
                        {nextStatus === "sent"  && <><Send size={12} /> 発送する</>}
                        {nextStatus === "received" && <><CheckCircle size={12} /> 受領確認</>}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(ship.id, ship.plan_name)}
                      style={{ background: "transparent", border: "1px solid rgba(255,80,80,0.2)", borderRadius: 8, color: "#ff6666", padding: "6px 8px", cursor: "pointer" }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div style={{ color: C.t4, marginLeft: 4 }}>
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* ── プラン詳細（展開） ── */}
                {isOpen && (
                  <div style={{ borderTop: `1px solid ${C.bd}`, padding: "16px 18px" }}>

                    {/* ステータスバー */}
                    <div style={{ display: "flex", gap: 0, marginBottom: 18, borderRadius: 8, overflow: "hidden", border: `1px solid ${C.bd}` }}>
                      {STATUS_FLOW.map((s, i) => {
                        const cfg = STATUS_MAP[s];
                        const done = STATUS_FLOW.indexOf(ship.status as keyof typeof STATUS_MAP) >= i;
                        const current = ship.status === s;
                        return (
                          <div key={s} style={{ flex: 1, padding: "8px 0", textAlign: "center", background: done ? cfg.bg : "transparent", borderRight: i < 3 ? `1px solid ${C.bd}` : undefined, transition: "background 0.2s" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: done ? cfg.color : C.t4 }}>
                              {current && "▶ "}{cfg.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* 商品一覧 */}
                    {ship.items.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                          登録商品 ({ship.items.length}種)
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {ship.items.map(item => {
                            const isEditing = editItemId === item.id;
                            return (
                              <div key={item.id} style={{ background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 9, padding: "10px 14px" }}>
                                {isEditing ? (
                                  <div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                                      <div>
                                        <label style={lbl}>数量</label>
                                        <input type="number" min="1" style={{ ...inp, padding: "5px 8px", fontSize: 12 }} value={editItemForm.quantity ?? item.quantity} onChange={e => setEditItemForm(p => ({ ...p, quantity: Number(e.target.value) }))} />
                                      </div>
                                      <div>
                                        <label style={lbl}>箱番号</label>
                                        <input type="number" min="1" style={{ ...inp, padding: "5px 8px", fontSize: 12 }} value={editItemForm.box_number ?? item.box_number} onChange={e => setEditItemForm(p => ({ ...p, box_number: Number(e.target.value) }))} />
                                      </div>
                                      <div>
                                        <label style={lbl}>ASIN</label>
                                        <input style={{ ...inp, padding: "5px 8px", fontSize: 12 }} value={editItemForm.asin ?? ""} onChange={e => setEditItemForm(p => ({ ...p, asin: e.target.value }))} placeholder="B0..." />
                                      </div>
                                      <div>
                                        <label style={lbl}>状態</label>
                                        <select style={{ ...inp, padding: "5px 8px", fontSize: 12 }} value={editItemForm.condition_type ?? item.condition_type} onChange={e => setEditItemForm(p => ({ ...p, condition_type: e.target.value }))}>
                                          {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                                        </select>
                                      </div>
                                    </div>
                                    <div style={{ display: "flex", gap: 6 }}>
                                      <button onClick={() => saveEditItem(item.id)} style={{ display: "flex", alignItems: "center", gap: 4, background: "linear-gradient(135deg,#1e1608,#2a1e08)", border: `1px solid ${C.bdSt}`, borderRadius: 7, color: C.gold, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                        <Save size={11} /> 保存
                                      </button>
                                      <button onClick={() => setEditItemId(null)} style={{ background: "transparent", border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 7, color: C.t3, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>キャンセル</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <div style={{ background: C.bg0, border: `1px solid ${C.bd}`, borderRadius: 6, padding: "4px 8px", fontSize: 11, color: C.blue, fontFamily: "monospace", flexShrink: 0, whiteSpace: "nowrap" }}>
                                      箱{item.box_number}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontWeight: 600, color: C.t1, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {item.product_name}
                                      </div>
                                      <div style={{ fontSize: 11, color: C.t3, marginTop: 1, display: "flex", gap: 8 }}>
                                        {item.asin && <span>ASIN: {item.asin}</span>}
                                        <span>FNSKU: {item.fnsku ?? generateFnsku(item.shipment_id, item.id)}</span>
                                        <span style={{ color: C.t4 }}>·</span>
                                        <span>{item.condition_type}</span>
                                      </div>
                                    </div>
                                    <div style={{ fontFamily: "monospace", fontWeight: 700, color: C.t1, fontSize: 15, flexShrink: 0 }}>
                                      ×{item.quantity}
                                    </div>
                                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                                      <button onClick={() => printLabel(item)} title="ラベル印刷" style={{ background: "rgba(212,175,55,0.06)", border: `1px solid ${C.bd}`, borderRadius: 7, color: C.goldDm, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center" }}>
                                        <Printer size={12} />
                                      </button>
                                      <button onClick={() => startEditItem(item)} title="編集" style={{ background: "transparent", border: `1px solid ${C.bd}`, borderRadius: 7, color: C.t3, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center" }}>
                                        <Edit2 size={12} />
                                      </button>
                                      <button onClick={() => handleDeleteItem(item.id, item.product_name)} style={{ background: "transparent", border: "1px solid rgba(255,80,80,0.15)", borderRadius: 7, color: "#ff6666", padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center" }}>
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 商品追加フォーム */}
                    {addItemId === ship.id ? (
                      <div style={{ background: C.bg0, border: `1px solid ${C.bdSt}`, borderRadius: 10, padding: "14px 16px", marginBottom: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.t2, marginBottom: 10 }}>商品を追加</div>
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10, marginBottom: 10 }}>
                          <div>
                            <label style={lbl}>仕入れ商品から選択</label>
                            <select
                              style={inp}
                              value={itemForm.purchase_id}
                              onChange={e => {
                                const p = purchases.find(p => p.id === Number(e.target.value));
                                setItemForm(prev => ({
                                  ...prev,
                                  purchase_id: e.target.value,
                                  product_name: p?.product_name ?? prev.product_name,
                                }));
                              }}
                            >
                              <option value="">-- 仕入れ済み商品を選択 --</option>
                              {purchases.map(p => (
                                <option key={p.id} value={p.id}>{p.product_name}（¥{p.purchase_price.toLocaleString()}）</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label style={lbl}>または商品名を直接入力</label>
                            <input style={inp} value={itemForm.product_name} onChange={e => setItemForm(p => ({ ...p, product_name: e.target.value, purchase_id: "" }))} placeholder="商品名" />
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                          <div>
                            <label style={lbl}>ASIN</label>
                            <input style={inp} value={itemForm.asin} onChange={e => setItemForm(p => ({ ...p, asin: e.target.value }))} placeholder="B0XXXXXXXX" />
                          </div>
                          <div>
                            <label style={lbl}>数量</label>
                            <input type="number" min="1" style={inp} value={itemForm.quantity} onChange={e => setItemForm(p => ({ ...p, quantity: Number(e.target.value) }))} />
                          </div>
                          <div>
                            <label style={lbl}>箱番号</label>
                            <input type="number" min="1" max={ship.box_count} style={inp} value={itemForm.box_number} onChange={e => setItemForm(p => ({ ...p, box_number: Number(e.target.value) }))} />
                          </div>
                          <div>
                            <label style={lbl}>商品状態</label>
                            <select style={inp} value={itemForm.condition_type} onChange={e => setItemForm(p => ({ ...p, condition_type: e.target.value }))}>
                              {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                            </select>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => handleAddItem(ship.id)} disabled={saving} style={{ background: "linear-gradient(135deg,#1e1608,#2a1e08)", border: `1px solid ${C.bdSt}`, borderRadius: 8, color: C.gold, padding: "9px 20px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                            {saving ? "追加中..." : "商品を追加"}
                          </button>
                          <button onClick={() => { setAddItemId(null); resetItemForm(); }} style={{ background: "transparent", border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 8, color: C.t3, padding: "9px 14px", cursor: "pointer" }}>
                            キャンセル
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setAddItemId(ship.id); resetItemForm(); }}
                        style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(212,175,55,0.04)", border: `1px dashed ${C.bd}`, borderRadius: 9, color: C.t3, padding: "10px 16px", cursor: "pointer", width: "100%", fontSize: 13 }}
                      >
                        <Plus size={14} /> 商品を追加する
                      </button>
                    )}

                    {/* 一括ラベル印刷 */}
                    {ship.items.length > 0 && (
                      <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button
                          onClick={() => ship.items.forEach(printLabel)}
                          style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(212,175,55,0.06)", border: `1px solid ${C.bd}`, borderRadius: 8, color: C.goldDm, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                        >
                          <Printer size={13} /> 全ラベル印刷
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
    </RequirePlan>
  );
}

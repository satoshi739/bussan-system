"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  getInventory, getInventorySummary, createInventoryItem, updateInventoryItem, deleteInventoryItem,
  type InventoryItem, type InventoryItemCreate,
} from "@/lib/api";
import {
  Plus, Trash2, Search, X, AlertTriangle, CheckCircle,
  Package, Warehouse, TrendingDown, Edit2, Save, RefreshCw, ArrowUp, ArrowDown,
} from "lucide-react";
import { toast } from "@/components/Toast";

// ── Design tokens ──────────────────────────────────────────────
const C = {
  bg0: "#0a0a0b", bg1: "#141414", bg2: "#1c1c1e",
  t1: "#F5F0E8", t2: "#C8C0B0", t3: "#8A8278", t4: "#5A5248",
  gold: "#D4AF37", goldDm: "#9A7D25",
  bd: "rgba(212,175,55,0.15)", bdSt: "rgba(212,175,55,0.4)",
  up: "#22c55e", dn: "#ef4444", blue: "#66ccff", warn: "#ff9966",
};

const inp: React.CSSProperties = {
  background: "rgba(10,10,11,0.95)", border: "1px solid rgba(212,175,55,0.3)",
  borderRadius: 8, color: C.t1, padding: "8px 12px", fontSize: 13,
  width: "100%", outline: "none", boxSizing: "border-box",
};
const lbl: React.CSSProperties = {
  fontSize: 11, color: C.t3, fontWeight: 700, display: "block", marginBottom: 4,
};
const card: React.CSSProperties = {
  background: C.bg1, border: `1px solid ${C.bd}`, borderRadius: 14,
};

const emptyForm: InventoryItemCreate = {
  product_name: "", asin: "", sku: "", fnsku: "",
  quantity: 0, reserved_quantity: 0, daily_sales: 0,
  reorder_point: 5, location: "FBA", status: "active", unit_cost: 0,
};

type SortKey = "product_name" | "quantity" | "days_remaining" | "daily_sales";

// 在庫ステータス判定
function getStockStatus(item: InventoryItem): { label: string; color: string; bg: string; icon: React.ReactNode } {
  const avail = item.quantity - item.reserved_quantity;
  if (avail <= 0) return { label: "在庫切れ", color: C.dn, bg: "rgba(239,68,68,0.12)", icon: <AlertTriangle size={12} /> };
  if (avail <= item.reorder_point) return { label: "補充必要", color: C.warn, bg: "rgba(255,153,102,0.12)", icon: <TrendingDown size={12} /> };
  return { label: "正常", color: C.up, bg: "rgba(34,197,94,0.1)", icon: <CheckCircle size={12} /> };
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState({ total_items: 0, low_stock_count: 0, out_of_stock_count: 0, total_inventory_value: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "low" | "out">("all");
  const [sortKey, setSortKey] = useState<SortKey>("quantity");
  const [sortAsc, setSortAsc] = useState(true);

  // フォーム
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<InventoryItemCreate>(emptyForm);
  const [saving, setSaving] = useState(false);

  // インライン編集
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<InventoryItem>>({});

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getInventory(), getInventorySummary()])
      .then(([inv, sum]) => { setItems(inv); setSummary(sum); })
      .catch(() => toast("データ取得に失敗しました", "error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // フィルタ＋ソート
  const filtered = useMemo(() => {
    let list = items.filter(item => {
      if (search && !item.product_name.toLowerCase().includes(search.toLowerCase()) &&
          !item.asin?.toLowerCase().includes(search.toLowerCase()) &&
          !item.sku?.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus === "out") return item.quantity - item.reserved_quantity <= 0;
      if (filterStatus === "low") {
        const avail = item.quantity - item.reserved_quantity;
        return avail > 0 && avail <= item.reorder_point;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      let va: number | string = 0, vb: number | string = 0;
      if (sortKey === "product_name") { va = a.product_name; vb = b.product_name; }
      else if (sortKey === "quantity") { va = a.quantity - a.reserved_quantity; vb = b.quantity - b.reserved_quantity; }
      else if (sortKey === "days_remaining") { va = a.days_remaining ?? 9999; vb = b.days_remaining ?? 9999; }
      else if (sortKey === "daily_sales") { va = a.daily_sales; vb = b.daily_sales; }
      if (typeof va === "string" && typeof vb === "string") return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortAsc ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
    return list;
  }, [items, search, filterStatus, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(v => !v);
    else { setSortKey(key); setSortAsc(true); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (sortAsc ? <ArrowUp size={10} color={C.gold} /> : <ArrowDown size={10} color={C.gold} />) : null;

  // ── 追加 ──────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.product_name) { toast("商品名を入力してください", "error"); return; }
    setSaving(true);
    try {
      await createInventoryItem(form);
      toast("在庫を追加しました");
      setShowForm(false);
      setForm(emptyForm);
      load();
    } catch { toast("保存に失敗しました", "error"); }
    finally { setSaving(false); }
  };

  // ── インライン編集 ─────────────────────────────────────────────
  const startEdit = (item: InventoryItem) => {
    setEditId(item.id);
    setEditForm({
      quantity: item.quantity, reserved_quantity: item.reserved_quantity,
      daily_sales: item.daily_sales, reorder_point: item.reorder_point,
      unit_cost: item.unit_cost, location: item.location, asin: item.asin,
    });
  };

  const saveEdit = async (id: number) => {
    try {
      await updateInventoryItem(id, editForm);
      setEditId(null);
      load();
      toast("更新しました");
    } catch (e) {
      toast(e instanceof Error ? e.message : "更新に失敗しました", "error");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    try {
      await deleteInventoryItem(id);
      toast("削除しました", "info");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "削除に失敗しました", "error");
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>

      {/* ── ヘッダー ── */}
      <div className="inv-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: C.t1, margin: 0 }}>在庫管理</h1>
          <div style={{ fontSize: 12, color: C.t3, marginTop: 3 }}>
            FBA在庫の数量・販売速度・補充アラート
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
            <Plus size={16} /> 在庫追加
          </button>
        </div>
      </div>

      {/* ── KPIカード ── */}
      <div className="inv-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "総SKU数",       value: summary.total_items,              color: C.t2,  icon: <Package size={16} /> },
          { label: "補充必要",       value: summary.low_stock_count,          color: C.warn, icon: <AlertTriangle size={16} /> },
          { label: "在庫切れ",       value: summary.out_of_stock_count,       color: C.dn,  icon: <TrendingDown size={16} /> },
          { label: "在庫総額",       value: `¥${summary.total_inventory_value.toLocaleString()}`, color: C.gold, icon: <Warehouse size={16} /> },
        ].map(({ label, value, color, icon }) => (
          <div key={label} style={{ ...card, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color, marginBottom: 8 }}>
              {icon}
              <span style={{ fontSize: 11, fontWeight: 700 }}>{label}</span>
            </div>
            <div style={{ fontSize: typeof value === "string" ? 20 : 28, fontWeight: 900, color, fontFamily: "monospace" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── 補充アラートバナー ── */}
      {(summary.out_of_stock_count > 0 || summary.low_stock_count > 0) && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: summary.out_of_stock_count > 0 ? "rgba(239,68,68,0.07)" : "rgba(255,153,102,0.07)", border: `1px solid ${summary.out_of_stock_count > 0 ? "rgba(239,68,68,0.3)" : "rgba(255,153,102,0.3)"}`, borderRadius: 10, padding: "12px 18px", marginBottom: 16 }}>
          <AlertTriangle size={16} color={summary.out_of_stock_count > 0 ? C.dn : C.warn} />
          <div style={{ fontSize: 13, color: summary.out_of_stock_count > 0 ? "#ff9999" : C.warn, fontWeight: 600 }}>
            {summary.out_of_stock_count > 0
              ? `⚠️ ${summary.out_of_stock_count}件が在庫切れです。早急に補充してください。`
              : `${summary.low_stock_count}件が補充推奨数を下回っています。`
            }
          </div>
        </div>
      )}

      {/* ── 追加フォーム ── */}
      {showForm && (
        <div style={{ ...card, padding: "20px 24px", marginBottom: 16, border: `1px solid ${C.bdSt}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.t2, marginBottom: 14 }}>在庫商品を追加</div>
          <div className="inv-form-3col" style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={lbl}>商品名 *</label>
              <input style={inp} value={form.product_name} onChange={e => setForm(p => ({ ...p, product_name: e.target.value }))} placeholder="例: Nintendo Switch 本体" autoFocus />
            </div>
            <div>
              <label style={lbl}>ASIN</label>
              <input style={inp} value={form.asin} onChange={e => setForm(p => ({ ...p, asin: e.target.value }))} placeholder="B0XXXXXXXX" />
            </div>
            <div>
              <label style={lbl}>SKU</label>
              <input style={inp} value={form.sku} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))} placeholder="SKU-XXXX" />
            </div>
          </div>
          <div className="inv-form-5col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={lbl}>在庫数</label>
              <input type="number" min="0" style={inp} value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: Number(e.target.value) }))} />
            </div>
            <div>
              <label style={lbl}>引当済み</label>
              <input type="number" min="0" style={inp} value={form.reserved_quantity} onChange={e => setForm(p => ({ ...p, reserved_quantity: Number(e.target.value) }))} />
            </div>
            <div>
              <label style={lbl}>日次販売数</label>
              <input type="number" min="0" step="0.1" style={inp} value={form.daily_sales} onChange={e => setForm(p => ({ ...p, daily_sales: Number(e.target.value) }))} />
            </div>
            <div>
              <label style={lbl}>補充点 (個)</label>
              <input type="number" min="0" style={inp} value={form.reorder_point} onChange={e => setForm(p => ({ ...p, reorder_point: Number(e.target.value) }))} />
            </div>
            <div>
              <label style={lbl}>仕入れ単価 (円)</label>
              <input type="number" min="0" style={inp} value={form.unit_cost} onChange={e => setForm(p => ({ ...p, unit_cost: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="inv-btn-group" style={{ display: "flex", gap: 8 }}>
            <button onClick={handleCreate} disabled={saving} style={{ background: "linear-gradient(135deg,#1e1608,#2a1e08)", border: `1px solid ${C.bdSt}`, borderRadius: 8, color: C.gold, padding: "10px 24px", fontWeight: 700, cursor: "pointer", fontSize: 14, minHeight: 44 }}>
              {saving ? "保存中..." : "追加する"}
            </button>
            <button onClick={() => { setShowForm(false); setForm(emptyForm); }} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: C.t3, padding: "10px 16px", cursor: "pointer", minHeight: 44 }}>
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* ── フィルタ・検索 ── */}
      <div className="inv-filter-row" style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.t3, pointerEvents: "none" }} />
          <input
            style={{ ...inp, paddingLeft: 30 }}
            placeholder="商品名・ASIN・SKUで検索..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.t3, cursor: "pointer", padding: 2 }}>
              <X size={13} />
            </button>
          )}
        </div>
        {(["all", "low", "out"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilterStatus(f)}
            style={{ padding: "7px 14px", borderRadius: 20, border: `1px solid ${filterStatus === f ? C.bdSt : C.bd}`, background: filterStatus === f ? "rgba(212,175,55,0.12)" : "transparent", color: filterStatus === f ? C.gold : C.t3, fontWeight: 600, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            {f === "all" ? "すべて" : f === "low" ? "補充必要" : "在庫切れ"}
          </button>
        ))}
      </div>

      {/* ── 在庫テーブル ── */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ ...card, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ width: "55%", height: 14, borderRadius: 6, background: "rgba(212,175,55,0.07)", animation: "sk 1.6s ease-in-out infinite" }} />
                <div style={{ width: "35%", height: 11, borderRadius: 6, background: "rgba(212,175,55,0.07)", animation: "sk 1.6s ease-in-out infinite" }} />
              </div>
              <div style={{ width: 60, height: 20, borderRadius: 6, background: "rgba(212,175,55,0.07)", animation: "sk 1.6s ease-in-out infinite" }} />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: 48 }}>
          <Warehouse size={40} color="rgba(212,175,55,0.25)" style={{ margin: "0 auto 12px", display: "block" }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: "#C8C0B0", marginBottom: 8 }}>在庫データがありません</div>
          <div style={{ fontSize: 13, color: C.t3, marginBottom: 16 }}>在庫商品を追加して在庫数・補充アラートを管理しましょう</div>
          <button onClick={() => setShowForm(true)} style={{ background: "linear-gradient(135deg,#1e1608,#2a1e08)", border: `1px solid ${C.bdSt}`, borderRadius: 9, color: C.gold, padding: "10px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            在庫を追加する →
          </button>
        </div>
      ) : (
        <>
          {/* テーブルヘッダー */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 90px 90px 80px 100px", gap: 12, padding: "6px 14px", fontSize: 10, color: C.t4, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase" }}>
            <button style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 4, fontSize: "inherit", letterSpacing: "inherit", textTransform: "inherit", fontWeight: "inherit" }} onClick={() => toggleSort("product_name")}>
              商品 <SortIcon k="product_name" />
            </button>
            <button style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, fontSize: "inherit", letterSpacing: "inherit", textTransform: "inherit", fontWeight: "inherit" }} onClick={() => toggleSort("quantity")}>
              在庫数 <SortIcon k="quantity" />
            </button>
            <button style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, fontSize: "inherit", letterSpacing: "inherit", textTransform: "inherit", fontWeight: "inherit" }} onClick={() => toggleSort("daily_sales")}>
              日次販売 <SortIcon k="daily_sales" />
            </button>
            <button style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, fontSize: "inherit", letterSpacing: "inherit", textTransform: "inherit", fontWeight: "inherit" }} onClick={() => toggleSort("days_remaining")}>
              残日数 <SortIcon k="days_remaining" />
            </button>
            <div style={{ textAlign: "right" }}>ステータス</div>
            <div style={{ textAlign: "right" }}>操作</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {filtered.map(item => {
              const st = getStockStatus(item);
              const avail = item.quantity - item.reserved_quantity;
              const isEditing = editId === item.id;

              return (
                <div
                  key={item.id}
                  className="inv-row"
                  style={{ ...card, padding: isEditing ? "14px 18px" : "11px 14px", borderColor: avail <= 0 ? "rgba(239,68,68,0.2)" : avail <= item.reorder_point ? "rgba(255,153,102,0.2)" : C.bd }}
                >
                  {isEditing ? (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, marginBottom: 10 }}>編集中: {item.product_name}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                        <div>
                          <label style={lbl}>在庫数</label>
                          <input type="number" min="0" style={{ ...inp, padding: "6px 8px", fontSize: 12 }} value={editForm.quantity ?? 0} onChange={e => setEditForm(p => ({ ...p, quantity: Number(e.target.value) }))} />
                        </div>
                        <div>
                          <label style={lbl}>引当済み</label>
                          <input type="number" min="0" style={{ ...inp, padding: "6px 8px", fontSize: 12 }} value={editForm.reserved_quantity ?? 0} onChange={e => setEditForm(p => ({ ...p, reserved_quantity: Number(e.target.value) }))} />
                        </div>
                        <div>
                          <label style={lbl}>日次販売数</label>
                          <input type="number" min="0" step="0.1" style={{ ...inp, padding: "6px 8px", fontSize: 12 }} value={editForm.daily_sales ?? 0} onChange={e => setEditForm(p => ({ ...p, daily_sales: Number(e.target.value) }))} />
                        </div>
                        <div>
                          <label style={lbl}>補充点</label>
                          <input type="number" min="0" style={{ ...inp, padding: "6px 8px", fontSize: 12 }} value={editForm.reorder_point ?? 5} onChange={e => setEditForm(p => ({ ...p, reorder_point: Number(e.target.value) }))} />
                        </div>
                        <div>
                          <label style={lbl}>仕入れ単価</label>
                          <input type="number" min="0" style={{ ...inp, padding: "6px 8px", fontSize: 12 }} value={editForm.unit_cost ?? 0} onChange={e => setEditForm(p => ({ ...p, unit_cost: Number(e.target.value) }))} />
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => saveEdit(item.id)} style={{ display: "flex", alignItems: "center", gap: 4, background: "linear-gradient(135deg,#1e1608,#2a1e08)", border: `1px solid ${C.bdSt}`, borderRadius: 7, color: C.gold, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          <Save size={12} /> 保存
                        </button>
                        <button onClick={() => setEditId(null)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: C.t3, padding: "7px 12px", fontSize: 12, cursor: "pointer" }}>
                          Esc / キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 90px 90px 80px 100px", gap: 12, alignItems: "center" }}>
                      {/* 商品名 */}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: C.t1, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.product_name}
                        </div>
                        <div style={{ fontSize: 10, color: C.t4, marginTop: 1, display: "flex", gap: 8 }}>
                          {item.asin && <span>ASIN: {item.asin}</span>}
                          {item.sku && <span>SKU: {item.sku}</span>}
                          {!item.asin && !item.sku && <span>{item.location}</span>}
                        </div>
                      </div>

                      {/* 在庫数 */}
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 16, color: avail <= 0 ? C.dn : avail <= item.reorder_point ? C.warn : C.t1 }}>
                          {avail.toLocaleString()}
                        </div>
                        {item.reserved_quantity > 0 && (
                          <div style={{ fontSize: 10, color: C.t4 }}>引当{item.reserved_quantity}</div>
                        )}
                      </div>

                      {/* 日次販売 */}
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "monospace", fontSize: 13, color: item.daily_sales > 0 ? C.t2 : C.t4 }}>
                          {item.daily_sales > 0 ? `${item.daily_sales}/日` : "—"}
                        </div>
                      </div>

                      {/* 残日数 */}
                      <div style={{ textAlign: "right" }}>
                        {item.days_remaining != null ? (
                          <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 14, color: item.days_remaining <= 7 ? C.dn : item.days_remaining <= 14 ? C.warn : C.t2 }}>
                            {item.days_remaining}日
                          </div>
                        ) : (
                          <div style={{ color: C.t4, fontSize: 12 }}>—</div>
                        )}
                      </div>

                      {/* ステータス */}
                      <div style={{ textAlign: "right" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, padding: "3px 8px", borderRadius: 20 }}>
                          {st.icon} {st.label}
                        </span>
                      </div>

                      {/* 操作 */}
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                        <button onClick={() => startEdit(item)} title="編集" style={{ background: "transparent", border: `1px solid ${C.bd}`, borderRadius: 7, color: C.t3, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center" }}>
                          <Edit2 size={12} />
                        </button>
                        <button onClick={() => handleDelete(item.id, item.product_name)} style={{ background: "transparent", border: "1px solid rgba(255,80,80,0.15)", borderRadius: 7, color: "#ff6666", padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center" }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 10, fontSize: 11, color: C.t4, textAlign: "right" }}>
            {filtered.length !== items.length ? `${filtered.length}件表示 / 全${items.length}件` : `全${items.length}件`}
          </div>
        </>
      )}

      <style>{`
        @keyframes sk { 0%,100%{opacity:.9} 50%{opacity:.4} }
        .inv-row:hover { border-color: rgba(212,175,55,0.38) !important; }
        .inv-row { transition: border-color 0.15s; }
        @media (max-width: 768px) {
          .inv-header { flex-direction: column !important; align-items: flex-start !important; gap: 10px; }
          .inv-kpi-grid { grid-template-columns: repeat(2,1fr) !important; }
          .inv-form-3col { grid-template-columns: 1fr !important; }
          .inv-form-5col { grid-template-columns: 1fr 1fr !important; }
          .inv-filter-row { flex-direction: column !important; }
          .inv-btn-group { flex-direction: column !important; }
          .inv-btn-group button { width: 100% !important; min-height: 44px; }
          .inv-item-grid { grid-template-columns: 1fr !important; }
          .inv-table-wrap { overflow-x: auto; }
        }
      `}</style>
    </div>
  );
}

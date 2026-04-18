"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getPurchases, createPurchase, updatePurchaseStatus, deletePurchase,
  calcAllPlatforms, type Purchase,
} from "@/lib/api";
import { Plus, Trash2, ExternalLink, Search, DollarSign, X, TrendingUp, Package, ShoppingCart, CheckCircle, Download, AlertTriangle } from "lucide-react";
import { toast } from "@/components/Toast";
import { usePlan } from "@/lib/usePlan";
import Link from "next/link";

const FREE_PLAN_LIMIT = 30;

const inp: React.CSSProperties = { background: "rgba(10,10,11,0.95)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 8, color: "#F5F0E8", padding: "9px 12px", fontSize: 14, width: "100%", outline: "none", boxSizing: "border-box" };
const lbl: React.CSSProperties = { fontSize: 12, color: "#8A8278", fontWeight: 600, display: "block", marginBottom: 4 };

const STATUS = {
  purchased: { label: "仕入済み",  color: "#ffcc44", bg: "rgba(255,204,68,0.12)" },
  listed:    { label: "出品中",    color: "#66ccff", bg: "rgba(102,204,255,0.12)" },
  sold:      { label: "売却済み",  color: "#D4AF37", bg: "rgba(212,175,55,0.12)" },
  cancelled: { label: "キャンセル", color: "#ff6666", bg: "rgba(255,102,102,0.1)" },
};
const PLATFORMS = ["メルカリ", "eBay", "ヤフオク", "Amazon", "楽天", "ラクマ", "その他"];
const SELL_PLATFORMS = ["メルカリ", "ラクマ", "PayPayフリマ", "Yahoo!オークション", "Amazon", "eBay（輸出）", "Lazada"];
const today = new Date().toISOString().slice(0, 10);
const emptyForm = { product_name: "", platform: "ヤフオク", purchase_price: "", purchase_shipping: "", purchase_url: "", purchase_date: today, notes: "" };

export default function PurchasesPage() {
  const { plan } = usePlan();
  const [items, setItems] = useState<Purchase[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("purchased");
  const isFree = plan === "FREE";
  const allItemsCount = items.length; // 全件数（フィルター前）は別途取得が理想だが簡易実装
  const [search, setSearch] = useState("");

  // 売却モーダル
  const [quickSell, setQuickSell] = useState<Purchase | null>(null);
  const [sellPrice, setSellPrice] = useState("");
  const [sellPlatform, setSellPlatform] = useState("メルカリ");
  const [comparison, setComparison] = useState<Record<string, { gross_profit: number; profit_rate: number; emoji: string }> | null>(null);

  const load = useCallback(() => getPurchases().then(setItems).catch(console.error), []);
  useEffect(() => { load(); }, [load]);

  // 全体サマリー
  const byStatus = (s: string) => items.filter(i => i.status === s);
  const totalCostAll = items.filter(i => i.status !== "cancelled").reduce((s, i) => s + i.purchase_price + i.purchase_shipping, 0);

  const filtered = items
    .filter(i => !filter || i.status === filter)
    .filter(i => !search || i.product_name.toLowerCase().includes(search.toLowerCase()) || i.platform.includes(search));

  const upd = (key: keyof typeof form, val: string) => setForm(n => ({ ...n, [key]: val }));

  const handleSubmit = async () => {
    if (!form.product_name || !form.purchase_price) { toast("商品名と仕入れ価格は必須です", "error"); return; }
    setLoading(true);
    try {
      await createPurchase({ product_name: form.product_name, platform: form.platform, purchase_price: Number(form.purchase_price), purchase_shipping: Number(form.purchase_shipping) || 0, purchase_url: form.purchase_url || undefined, purchase_date: form.purchase_date, notes: form.notes || undefined, image_data: undefined });
      toast("仕入れを追加しました ✅");
      setForm(emptyForm); setShowForm(false); load();
    } catch { toast("保存に失敗しました", "error"); }
    finally { setLoading(false); }
  };

  const handleStatusChange = async (id: number, status: string) => {
    await updatePurchaseStatus(id, status);
    load();
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    await deletePurchase(id); toast("削除しました", "info"); load();
  };

  const openSell = (item: Purchase) => {
    setQuickSell(item); setSellPrice(""); setComparison(null); setSellPlatform("メルカリ");
  };

  const handleSellPriceChange = useCallback(async (val: string, item: Purchase) => {
    setSellPrice(val);
    if (!val || Number(val) <= 0) { setComparison(null); return; }
    try {
      const r = await calcAllPlatforms({ purchase_price: item.purchase_price, purchase_shipping: item.purchase_shipping, selling_price: Number(val) });
      setComparison(r);
    } catch { /* ignore */ }
  }, []);

  const handleQuickSell = async () => {
    if (!quickSell || !sellPrice) { toast("売却価格を入力してください", "error"); return; }
    setLoading(true);
    try {
      const { createSaleSImple } = await import("@/lib/api");
      const res = await createSaleSImple({ purchase_id: quickSell.id, sale_price: Number(sellPrice), sell_platform: sellPlatform });
      toast(`売却完了！純利益 ¥${Math.round(res.net_profit).toLocaleString()}`);
      setQuickSell(null); setSellPrice(""); setComparison(null); load();
    } catch { toast("売却記録に失敗しました", "error"); }
    finally { setLoading(false); }
  };

  const sortedComparison = comparison
    ? Object.entries(comparison).sort((a, b) => b[1].gross_profit - a[1].gross_profit)
    : [];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>

      {/* ── ヘッダー ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#F5F0E8", margin: 0 }}>仕入れ管理</h1>
          <div style={{ fontSize: 12, color: "#8A8278", marginTop: 3 }}>仕入れた商品の一覧・ステータス管理</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href="http://localhost:8000/api/purchases/export/csv" download style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0,40,15,0.8)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 10, color: "#8A8278", padding: "10px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", textDecoration: "none" }}>
            <Download size={14} /> CSV
          </a>
          <button
            onClick={() => {
              if (isFree && allItemsCount >= FREE_PLAN_LIMIT) {
                window.location.href = "/pricing";
                return;
              }
              setShowForm(!showForm);
            }}
            style={{ display: "flex", alignItems: "center", gap: 6, background: isFree && allItemsCount >= FREE_PLAN_LIMIT ? "rgba(20,18,8,0.7)" : "linear-gradient(135deg,#1e1608,#2a1e08)", border: `1px solid ${isFree && allItemsCount >= FREE_PLAN_LIMIT ? "rgba(255,80,50,0.3)" : "rgba(212,175,55,0.4)"}`, borderRadius: 10, color: isFree && allItemsCount >= FREE_PLAN_LIMIT ? "#ff9977" : "#D4AF37", padding: "10px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            <Plus size={16} /> {isFree && allItemsCount >= FREE_PLAN_LIMIT ? "上限到達（アップグレード）" : "仕入れ追加"}
          </button>
        </div>
      </div>

      {/* ── フリープラン制限バナー ── */}
      {isFree && (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: allItemsCount >= FREE_PLAN_LIMIT ? "rgba(255,80,50,0.08)" : "rgba(255,180,0,0.06)",
          border: `1px solid ${allItemsCount >= FREE_PLAN_LIMIT ? "rgba(255,80,50,0.3)" : "rgba(255,180,0,0.25)"}`,
          borderRadius: 10,
          padding: "12px 18px",
          marginBottom: 16,
          gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={15} color={allItemsCount >= FREE_PLAN_LIMIT ? "#ff6644" : "#ffcc44"} />
            <span style={{ fontSize: 13, color: allItemsCount >= FREE_PLAN_LIMIT ? "#ff9977" : "#ffcc66", fontWeight: 600 }}>
              {allItemsCount >= FREE_PLAN_LIMIT
                ? `フリープランの上限（${FREE_PLAN_LIMIT}件）に達しました`
                : `フリープラン：${allItemsCount} / ${FREE_PLAN_LIMIT} 件使用中`}
            </span>
          </div>
          <Link href="/pricing" style={{
            fontSize: 12,
            color: "#D4AF37",
            fontWeight: 700,
            textDecoration: "none",
            background: "rgba(0,60,20,0.8)",
            border: "1px solid rgba(212,175,55,0.3)",
            borderRadius: 6,
            padding: "5px 12px",
            flexShrink: 0,
          }}>
            プロにアップグレード →
          </Link>
        </div>
      )}

      {/* ── サマリーカード ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { key: "purchased", label: "仕入済み", icon: <Package size={18} />, color: "#ffcc44", extra: `合計 ¥${byStatus("purchased").reduce((s,i)=>s+i.purchase_price+i.purchase_shipping,0).toLocaleString()}` },
          { key: "listed",    label: "出品中",   icon: <ShoppingCart size={18} />, color: "#66ccff", extra: `${byStatus("listed").length}件` },
          { key: "sold",      label: "売却済み", icon: <CheckCircle size={18} />, color: "#D4AF37", extra: `${byStatus("sold").length}件` },
          { key: "",          label: "総仕入れコスト", icon: <TrendingUp size={18} />, color: "#aa88ff", extra: `¥${Math.round(totalCostAll).toLocaleString()}` },
        ].map(({ key, label, icon, color, extra }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{ background: filter === key ? `${color}18` : "rgba(20,20,22,0.9)", border: `1px solid ${filter === key ? color + "55" : "rgba(212,175,55,0.1)"}`, borderRadius: 12, padding: "14px 16px", cursor: key ? "pointer" : "default", textAlign: "left", transition: "all 0.15s" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, color, marginBottom: 6 }}>{icon}<span style={{ fontSize: 11, fontWeight: 700 }}>{label}</span></div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#F5F0E8", fontFamily: "monospace" }}>{key ? byStatus(key).length : ""}<span style={{ fontSize: 11, color: "#8A8278", marginLeft: 2 }}>{key ? "件" : ""}</span></div>
            <div style={{ fontSize: 11, color, marginTop: 2 }}>{extra}</div>
          </button>
        ))}
      </div>

      {/* ── 追加フォーム ── */}
      {showForm && (
        <div style={{ background: "rgba(20,20,22,0.9)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 14, padding: "20px 24px", marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#C8C0B0", marginBottom: 16 }}>新規仕入れ登録</div>
          <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={lbl}>商品名 *</label><input style={inp} value={form.product_name} onChange={e => upd("product_name", e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} placeholder="例: Nintendo Switch 本体" autoFocus /></div>
            <div><label style={lbl}>仕入れ元</label><select style={inp} value={form.platform} onChange={e => upd("platform", e.target.value)}>{PLATFORMS.map(p => <option key={p}>{p}</option>)}</select></div>
            <div><label style={lbl}>仕入れ日</label><input type="date" style={inp} value={form.purchase_date} onChange={e => upd("purchase_date", e.target.value)} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 12, marginBottom: 12 }}>
            <div><label style={lbl}>仕入れ価格 (円) *</label><input type="number" style={inp} value={form.purchase_price} onChange={e => upd("purchase_price", e.target.value)} placeholder="0" /></div>
            <div><label style={lbl}>仕入れ送料 (円)</label><input type="number" style={inp} value={form.purchase_shipping} onChange={e => upd("purchase_shipping", e.target.value)} placeholder="0" /></div>
            <div><label style={lbl}>URL</label><input style={inp} value={form.purchase_url} onChange={e => upd("purchase_url", e.target.value)} placeholder="https://..." /></div>
          </div>
          <div style={{ marginBottom: 14 }}><label style={lbl}>メモ</label><input style={inp} value={form.notes} onChange={e => upd("notes", e.target.value)} placeholder="状態・注意点など" /></div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleSubmit} disabled={loading} style={{ background: "linear-gradient(135deg,#1e1608,#2a1e08)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 8, color: "#D4AF37", padding: "10px 28px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>{loading ? "保存中..." : "保存する"}</button>
            <button onClick={() => setShowForm(false)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#8A8278", padding: "10px 16px", cursor: "pointer" }}>キャンセル</button>
          </div>
        </div>
      )}

      {/* ── 検索バー ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#8A8278" }} />
          <input style={{ ...inp, paddingLeft: 32 }} placeholder="商品名・仕入れ元で検索..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {(["purchased", "listed", "sold", ""] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{ padding: "7px 14px", borderRadius: 20, border: `1px solid ${filter === s ? "rgba(212,175,55,0.4)" : "rgba(212,175,55,0.12)"}`, background: filter === s ? "rgba(212,175,55,0.12)" : "transparent", color: filter === s ? "#D4AF37" : "#8A8278", fontWeight: 600, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
              {s === "" ? "すべて" : STATUS[s as keyof typeof STATUS]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 売却モーダル ── */}
      {quickSell && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={e => e.target === e.currentTarget && setQuickSell(null)}>
          <div style={{ background: "#0a0a0b", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 16, padding: 28, width: 560, maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
            <button onClick={() => setQuickSell(null)} style={{ position: "absolute", top: 14, right: 14, background: "transparent", border: "none", color: "#8A8278", cursor: "pointer" }}><X size={18} /></button>

            <div style={{ fontSize: 16, fontWeight: 800, color: "#F5F0E8", marginBottom: 4 }}>💰 売却記録</div>
            <div style={{ background: "rgba(10,10,11,0.8)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, border: "1px solid rgba(212,175,55,0.1)" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#F5F0E8" }}>{quickSell.product_name}</div>
              <div style={{ fontSize: 12, color: "#8A8278", marginTop: 2 }}>仕入れ: {quickSell.platform} · コスト ¥{(quickSell.purchase_price + quickSell.purchase_shipping).toLocaleString()}</div>
            </div>

            {/* 売却価格入力 */}
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>売却価格 (円)</label>
              <input type="number" style={{ ...inp, fontSize: 22, fontFamily: "monospace", textAlign: "center" }} value={sellPrice} onChange={e => handleSellPriceChange(e.target.value, quickSell)} autoFocus placeholder="0" />
            </div>

            {/* プラットフォーム比較 */}
            {sortedComparison.length > 0 ? (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "#8A8278", fontWeight: 700, marginBottom: 8 }}>どこで売ると一番儲かるか</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {sortedComparison.map(([name, data], i) => {
                    const isBest = i === 0 && data.gross_profit > 0;
                    const isSelected = name === sellPlatform;
                    const profit = Math.round(data.gross_profit);
                    return (
                      <button key={name} onClick={() => setSellPlatform(name)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 14px", borderRadius: 9, border: isSelected ? "1px solid rgba(212,175,55,0.5)" : isBest ? "1px solid rgba(212,175,55,0.2)" : "1px solid rgba(212,175,55,0.07)", background: isSelected ? "rgba(212,175,55,0.08)" : isBest ? "rgba(212,175,55,0.04)" : "rgba(10,10,11,0.5)", cursor: "pointer", width: "100%" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {isSelected && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#D4AF37" }} />}
                          <span style={{ fontSize: 13, color: "#F5F0E8" }}>{data.emoji} {name}</span>
                          {isBest && <span style={{ fontSize: 10, background: "rgba(212,175,55,0.2)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 10, padding: "1px 6px", color: "#D4AF37" }}>最高</span>}
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: profit >= 0 ? "#D4AF37" : "#ff6666", fontFamily: "monospace" }}>
                            {profit >= 0 ? "+" : ""}¥{profit.toLocaleString()}
                          </span>
                          <span style={{ fontSize: 11, color: "#8A8278", marginLeft: 6 }}>({data.profit_rate.toFixed(1)}%)</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", fontSize: 12, color: "#8A8278", marginBottom: 14, padding: "16px 0" }}>
                売却価格を入力するとプラットフォーム別利益が表示されます
              </div>
            )}

            {/* 選択中のプラットフォーム表示 */}
            {sellPrice && (
              <div style={{ marginBottom: 14, padding: "8px 12px", background: "rgba(212,175,55,0.06)", borderRadius: 8, border: "1px solid rgba(212,175,55,0.2)", fontSize: 12, color: "#8A8278" }}>
                選択中: <span style={{ color: "#D4AF37", fontWeight: 700 }}>{sellPlatform}</span>
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleQuickSell} disabled={loading || !sellPrice} style={{ flex: 1, background: "linear-gradient(135deg,#1e1608,#2a1e08)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 8, color: "#D4AF37", padding: "12px", fontWeight: 700, cursor: "pointer", fontSize: 14, opacity: (!sellPrice || loading) ? 0.5 : 1 }}>
                {loading ? "記録中..." : "売却を記録する"}
              </button>
              <button onClick={() => setQuickSell(null)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#8A8278", padding: "12px 16px", cursor: "pointer" }}>キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 商品リスト ── */}
      {filtered.length === 0 ? (
        <div style={{ background: "rgba(20,20,22,0.9)", border: "1px solid rgba(212,175,55,0.1)", borderRadius: 14, textAlign: "center", padding: 60 }}>
          <Package size={36} color="rgba(212,175,55,0.2)" style={{ margin: "0 auto 12px", display: "block" }} />
          <div style={{ color: "#8A8278", fontSize: 14 }}>
            {search || filter ? "該当する商品がありません" : "「仕入れ追加」から登録してください"}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.map(item => {
            const st = STATUS[item.status as keyof typeof STATUS] ?? STATUS.purchased;
            const cost = item.purchase_price + item.purchase_shipping;
            return (
              <div key={item.id} style={{ background: "rgba(20,20,22,0.9)", border: "1px solid rgba(212,175,55,0.1)", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, transition: "border-color 0.15s" }}>

                {/* ステータス */}
                <select value={item.status} onChange={e => handleStatusChange(item.id, e.target.value)} style={{ background: st.bg, border: `1px solid ${st.color}44`, borderRadius: 20, color: st.color, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", appearance: "none", flexShrink: 0 }}>
                  {Object.entries(STATUS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
                </select>

                {/* 商品名・仕入れ元 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: "#F5F0E8", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.product_name}</div>
                  <div style={{ fontSize: 11, color: "#8A8278", marginTop: 2, display: "flex", gap: 8 }}>
                    <span>{item.platform}</span>
                    <span style={{ opacity: 0.6 }}>·</span>
                    <span>{item.purchase_date}</span>
                    {item.notes && <><span style={{ opacity: 0.6 }}>·</span><span>{item.notes}</span></>}
                  </div>
                </div>

                {/* コスト */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontFamily: "monospace", fontWeight: 700, color: "#F5F0E8", fontSize: 15 }}>¥{cost.toLocaleString()}</div>
                  {item.purchase_shipping > 0 && <div style={{ fontSize: 10, color: "#8A8278" }}>+送料¥{item.purchase_shipping.toLocaleString()}</div>}
                </div>

                {/* アクション */}
                <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                  {item.status !== "sold" && item.status !== "cancelled" && (
                    <button onClick={() => openSell(item)} style={{ background: "rgba(0,80,30,0.7)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 8, color: "#9A7D25", cursor: "pointer", padding: "6px 12px", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                      <DollarSign size={12} /> 売却
                    </button>
                  )}
                  {item.purchase_url && (
                    <a href={item.purchase_url} target="_blank" rel="noreferrer" style={{ background: "transparent", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 8, color: "#8A8278", padding: "6px 10px", display: "flex", alignItems: "center" }}>
                      <ExternalLink size={12} />
                    </a>
                  )}
                  <button onClick={() => handleDelete(item.id, item.product_name)} style={{ background: "transparent", border: "1px solid rgba(255,80,80,0.15)", borderRadius: 8, color: "#ff6666", cursor: "pointer", padding: "6px 8px" }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 11, color: "#2a5a3a", textAlign: "right" }}>
          表示 {filtered.length}件 / 全{items.length}件
        </div>
      )}
    </div>
  );
}

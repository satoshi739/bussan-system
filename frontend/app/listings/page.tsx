"use client";

import { useEffect, useState, useCallback } from "react";
import { getListings, getPurchases, createListing, createSaleSImple, calcAllPlatforms, type Listing, type Purchase } from "@/lib/api";
import { Plus, DollarSign, X, Tag, TrendingUp, Zap } from "lucide-react";
import { toast } from "@/components/Toast";

const inp: React.CSSProperties = { background: "rgba(0,12,4,0.95)", border: "1px solid rgba(0,255,80,0.3)", borderRadius: 8, color: "#e8f5eb", padding: "8px 12px", fontSize: 14, width: "100%", outline: "none", boxSizing: "border-box" };
const lbl: React.CSSProperties = { fontSize: 12, color: "#8ab89a", fontWeight: 600, display: "block", marginBottom: 4 };

const SELL_PLATFORMS = [
  { key: "メルカリ",          flag: "🏪", fee: "10%",   area: "国内" },
  { key: "ラクマ",            flag: "🛍️", fee: "6%",    area: "国内" },
  { key: "PayPayフリマ",      flag: "💛", fee: "5%",    area: "国内" },
  { key: "Yahoo!オークション", flag: "🔨", fee: "8.8%",  area: "国内" },
  { key: "Amazon",            flag: "📦", fee: "8〜15%", area: "国内" },
  { key: "eBay（輸出）",      flag: "🌏", fee: "13.25%", area: "海外" },
  { key: "Lazada",            flag: "🇸🇬", fee: "2〜4%", area: "海外" },
  { key: "Shopee",            flag: "🛒", fee: "3%",    area: "海外" },
];

const today = new Date().toISOString().slice(0, 10);
const emptyForm = { purchase_id: "", selling_platform: "メルカリ", listing_price: "", category: "その他", listed_date: today };

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  // プラットフォーム比較（出品フォーム内）
  const [formComparison, setFormComparison] = useState<Record<string, { gross_profit: number; profit_rate: number; emoji: string }> | null>(null);
  const [compLoading, setCompLoading] = useState(false);

  // 売却モーダル
  const [sellModal, setSellModal] = useState<Listing | null>(null);
  const [sellPrice, setSellPrice] = useState("");
  const [sellPlatform, setSellPlatform] = useState("メルカリ");
  const [sellComparison, setSellComparison] = useState<Record<string, { gross_profit: number; profit_rate: number; emoji: string }> | null>(null);

  const load = useCallback(() => {
    getListings().then(setListings).catch(console.error);
    getPurchases({ status: "purchased" }).then(setPurchases).catch(console.error);
  }, []);
  useEffect(() => { load(); }, [load]);

  // 出品フォームで商品 or 価格が変わったら比較更新
  const updateFormComparison = useCallback(async (purchaseId: string, price: string) => {
    if (!purchaseId || !price || Number(price) <= 0) { setFormComparison(null); return; }
    const purchase = purchases.find(p => p.id === Number(purchaseId));
    if (!purchase) return;
    setCompLoading(true);
    try {
      const r = await calcAllPlatforms({ purchase_price: purchase.purchase_price, purchase_shipping: purchase.purchase_shipping, selling_price: Number(price) });
      setFormComparison(r);
    } catch { /* ignore */ }
    finally { setCompLoading(false); }
  }, [purchases]);

  const setFormField = (key: keyof typeof form, val: string) => {
    const next = { ...form, [key]: val };
    setForm(next);
    if (key === "purchase_id" || key === "listing_price") {
      updateFormComparison(next.purchase_id, next.listing_price);
    }
  };

  const handleList = async () => {
    if (!form.purchase_id || !form.listing_price) { toast("商品と価格を入力してください", "error"); return; }
    setLoading(true);
    try {
      await createListing({ purchase_id: Number(form.purchase_id), selling_platform: form.selling_platform, listing_price: Number(form.listing_price), amazon_shipping: 0, use_fba: 0, category: form.category, listed_date: form.listed_date });
      toast("出品を追加しました ✅");
      setForm(emptyForm); setShowForm(false); setFormComparison(null); load();
    } catch { toast("保存に失敗しました", "error"); }
    finally { setLoading(false); }
  };

  // 売却モーダルの比較更新
  const handleSellPriceChange = useCallback(async (val: string, item: Listing) => {
    setSellPrice(val);
    if (!val || Number(val) <= 0) { setSellComparison(null); return; }
    try {
      const r = await calcAllPlatforms({ purchase_price: item.purchase_price, purchase_shipping: item.purchase_shipping, selling_price: Number(val) });
      setSellComparison(r);
    } catch { /* ignore */ }
  }, []);

  const handleSell = async () => {
    if (!sellModal || !sellPrice) { toast("売却価格を入力してください", "error"); return; }
    setLoading(true);
    try {
      const res = await createSaleSImple({ purchase_id: sellModal.purchase_id, sale_price: Number(sellPrice), sell_platform: sellPlatform });
      toast(`売却完了！純利益 ¥${Math.round(res.net_profit).toLocaleString()}`);
      setSellModal(null); setSellPrice(""); setSellComparison(null); load();
    } catch { toast("売却記録に失敗しました", "error"); }
    finally { setLoading(false); }
  };

  const openSell = (item: Listing) => {
    setSellModal(item); setSellPrice(""); setSellComparison(null); setSellPlatform(item.selling_platform);
  };

  const sortedComp = (comp: typeof formComparison) =>
    comp ? Object.entries(comp).sort((a, b) => b[1].gross_profit - a[1].gross_profit) : [];

  const active = listings.filter(l => l.status !== "sold");
  const sold = listings.filter(l => l.status === "sold");

  // 出品フォームの比較で自動でベストプラットフォームをセット
  const bestPlatform = sortedComp(formComparison)[0]?.[0] ?? null;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>

      {/* ── ヘッダー ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#e8f5eb", margin: 0 }}>出品管理</h1>
          <div style={{ fontSize: 12, color: "#4a8a5a", marginTop: 3 }}>
            出品中 <span style={{ color: "#66ccff", fontWeight: 700 }}>{active.length}件</span>
            　売却済 <span style={{ color: "#00ff80", fontWeight: 700 }}>{sold.length}件</span>
          </div>
        </div>
        <button onClick={() => { setShowForm(!showForm); setFormComparison(null); }} style={{ display: "flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg,#004d1f,#006629)", border: "1px solid rgba(0,255,80,0.4)", borderRadius: 10, color: "#00ff80", padding: "10px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          <Plus size={16} /> 出品追加
        </button>
      </div>

      {/* ── 出品フォーム ── */}
      {showForm && (
        <div style={{ background: "rgba(0,14,5,0.9)", border: "1px solid rgba(0,255,80,0.3)", borderRadius: 14, padding: "20px 24px", marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#b8dcc4", marginBottom: 16 }}>新規出品登録</div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={lbl}>仕入れ商品 *</label>
              <select style={inp} value={form.purchase_id} onChange={e => setFormField("purchase_id", e.target.value)}>
                <option value="">-- 商品を選択 --</option>
                {purchases.map(p => <option key={p.id} value={p.id}>{p.product_name}（仕入れ ¥{p.purchase_price.toLocaleString()}）</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>出品価格 (円) *</label>
              <input type="number" style={inp} value={form.listing_price} onChange={e => setFormField("listing_price", e.target.value)} placeholder="0" />
            </div>
            <div>
              <label style={lbl}>出品日</label>
              <input type="date" style={inp} value={form.listed_date} onChange={e => setFormField("listed_date", e.target.value)} />
            </div>
          </div>

          {/* プラットフォーム比較 */}
          {(formComparison || compLoading) && (
            <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Zap size={13} color="#ffcc44" />
                <span style={{ fontSize: 12, color: "#ffcc44", fontWeight: 700 }}>どのプラットフォームで売ると最も利益が出るか</span>
                {compLoading && <span style={{ fontSize: 11, color: "#4a8a5a" }}>計算中...</span>}
              </div>
              {!compLoading && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {sortedComp(formComparison).map(([name, data], i) => {
                    const isBest = i === 0 && data.gross_profit > 0;
                    const isSelected = form.selling_platform === name;
                    const profit = Math.round(data.gross_profit);
                    return (
                      <button key={name} onClick={() => setFormField("selling_platform", name)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 8, border: isSelected ? "1px solid rgba(0,255,80,0.5)" : isBest ? "1px solid rgba(255,204,68,0.3)" : "1px solid rgba(0,255,80,0.07)", background: isSelected ? "rgba(0,255,80,0.08)" : isBest ? "rgba(255,204,68,0.04)" : "transparent", cursor: "pointer", width: "100%", transition: "all 0.12s" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {isSelected && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#00ff80", flexShrink: 0 }} />}
                          <span style={{ fontSize: 13, color: "#e8f5eb" }}>{data.emoji} {name}</span>
                          {isBest && <span style={{ fontSize: 10, background: "rgba(255,204,68,0.2)", border: "1px solid rgba(255,204,68,0.4)", borderRadius: 10, padding: "1px 6px", color: "#ffcc44" }}>最高利益</span>}
                        </div>
                        <div>
                          <span style={{ fontSize: 14, fontWeight: 700, color: profit >= 0 ? "#00ff80" : "#ff6666", fontFamily: "monospace" }}>
                            {profit >= 0 ? "+" : ""}¥{profit.toLocaleString()}
                          </span>
                          <span style={{ fontSize: 11, color: "#4a8a5a", marginLeft: 6 }}>{data.profit_rate.toFixed(1)}%</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {bestPlatform && !compLoading && (
                <div style={{ marginTop: 10, fontSize: 12, color: "#4a8a5a" }}>
                  クリックでプラットフォームを選択できます。現在: <span style={{ color: "#00ff80", fontWeight: 700 }}>{form.selling_platform}</span>
                </div>
              )}
            </div>
          )}

          {!formComparison && !compLoading && form.purchase_id && !form.listing_price && (
            <div style={{ fontSize: 12, color: "#4a8a5a", marginBottom: 14, padding: "10px 14px", background: "rgba(0,0,0,0.2)", borderRadius: 8 }}>
              出品価格を入力すると、プラットフォーム別の利益比較が表示されます
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleList} disabled={loading} style={{ background: "linear-gradient(135deg,#004d1f,#006629)", border: "1px solid rgba(0,255,80,0.4)", borderRadius: 8, color: "#00ff80", padding: "10px 28px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
              {loading ? "保存中..." : `${form.selling_platform} に出品登録`}
            </button>
            <button onClick={() => { setShowForm(false); setFormComparison(null); }} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#8ab89a", padding: "10px 16px", cursor: "pointer" }}>キャンセル</button>
          </div>
        </div>
      )}

      {/* ── 売却モーダル ── */}
      {sellModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={e => e.target === e.currentTarget && setSellModal(null)}>
          <div style={{ background: "#060f08", border: "1px solid rgba(0,255,80,0.3)", borderRadius: 16, padding: 28, width: 520, maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
            <button onClick={() => setSellModal(null)} style={{ position: "absolute", top: 14, right: 14, background: "transparent", border: "none", color: "#8ab89a", cursor: "pointer" }}><X size={18} /></button>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#e8f5eb", marginBottom: 4 }}>売却記録</div>
            <div style={{ background: "rgba(0,12,4,0.8)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, border: "1px solid rgba(0,255,80,0.1)" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#e8f5eb" }}>{sellModal.product_name}</div>
              <div style={{ fontSize: 11, color: "#4a8a5a", marginTop: 2 }}>出品価格 ¥{sellModal.listing_price.toLocaleString()} · {sellModal.selling_platform}</div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>実際の売却価格 (円)</label>
              <input type="number" style={{ ...inp, fontSize: 22, fontFamily: "monospace", textAlign: "center" }} value={sellPrice} onChange={e => handleSellPriceChange(e.target.value, sellModal)} autoFocus placeholder="0" />
            </div>
            {sortedComp(sellComparison).length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: "#4a8a5a", fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <TrendingUp size={12} /> プラットフォーム別利益
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {sortedComp(sellComparison).map(([name, data], i) => {
                    const isBest = i === 0 && data.gross_profit > 0;
                    const isSelected = sellPlatform === name;
                    const profit = Math.round(data.gross_profit);
                    return (
                      <button key={name} onClick={() => setSellPlatform(name)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 8, border: isSelected ? "1px solid rgba(0,255,80,0.5)" : "1px solid rgba(0,255,80,0.07)", background: isSelected ? "rgba(0,255,80,0.08)" : "transparent", cursor: "pointer", width: "100%" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 13, color: "#e8f5eb" }}>{data.emoji} {name}</span>
                          {isBest && <span style={{ fontSize: 10, background: "rgba(0,255,80,0.15)", borderRadius: 10, padding: "1px 6px", color: "#00ff80" }}>最高</span>}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: profit >= 0 ? "#00ff80" : "#ff6666", fontFamily: "monospace" }}>
                          {profit >= 0 ? "+" : ""}¥{profit.toLocaleString()} <span style={{ fontSize: 11, color: "#4a8a5a" }}>({data.profit_rate.toFixed(1)}%)</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleSell} disabled={loading || !sellPrice} style={{ flex: 1, background: "linear-gradient(135deg,#004d1f,#006629)", border: "1px solid rgba(0,255,80,0.4)", borderRadius: 8, color: "#00ff80", padding: "12px", fontWeight: 700, cursor: "pointer", fontSize: 14, opacity: (!sellPrice || loading) ? 0.5 : 1 }}>
                {loading ? "記録中..." : "売却を記録する"}
              </button>
              <button onClick={() => setSellModal(null)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#8ab89a", padding: "12px 16px", cursor: "pointer" }}>キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 出品中一覧 ── */}
      {active.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#66ccff", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <Tag size={13} /> 出品中 ({active.length}件)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {active.map(item => {
              const pf = SELL_PLATFORMS.find(p => p.key === item.selling_platform);
              return (
                <div key={item.id} style={{ background: "rgba(0,14,5,0.9)", border: "1px solid rgba(100,200,255,0.12)", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: "#e8f5eb", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.product_name}</div>
                    <div style={{ fontSize: 11, color: "#4a8a5a", marginTop: 2, display: "flex", gap: 8 }}>
                      <span>{item.platform} → {pf?.flag ?? ""} {item.selling_platform}</span>
                      {pf && <span style={{ color: "#4a6a7a" }}>手数料 {pf.fee}</span>}
                      {item.listed_date && <span>出品日 {item.listed_date}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: "monospace", fontWeight: 700, color: "#66ccff", fontSize: 15 }}>¥{item.listing_price.toLocaleString()}</div>
                    <div style={{ fontSize: 10, color: "#4a8a5a" }}>出品価格</div>
                  </div>
                  <button onClick={() => openSell(item)} style={{ background: "rgba(0,80,30,0.7)", border: "1px solid rgba(0,255,80,0.3)", borderRadius: 8, color: "#4ddc80", cursor: "pointer", padding: "7px 14px", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <DollarSign size={12} /> 売れた
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 売却済み ── */}
      {sold.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#4a8a5a", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <TrendingUp size={13} /> 売却済み ({sold.length}件)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {sold.map(item => (
              <div key={item.id} style={{ background: "rgba(0,14,5,0.7)", border: "1px solid rgba(0,255,80,0.06)", borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, opacity: 0.7 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "#a8d8b8", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.product_name}</div>
                  <div style={{ fontSize: 11, color: "#3a6a4a" }}>{item.platform} → {item.selling_platform}</div>
                </div>
                <div style={{ fontFamily: "monospace", color: "#4a8a5a", fontSize: 13 }}>¥{item.listing_price.toLocaleString()}</div>
                <span style={{ background: "rgba(0,255,80,0.08)", border: "1px solid rgba(0,255,80,0.15)", borderRadius: 20, padding: "2px 10px", fontSize: 11, color: "#4a8a5a", flexShrink: 0 }}>売却済</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {listings.length === 0 && !showForm && (
        <div style={{ background: "rgba(0,14,5,0.9)", border: "1px solid rgba(0,255,80,0.1)", borderRadius: 14, textAlign: "center", padding: 60 }}>
          <Tag size={34} color="rgba(0,255,80,0.2)" style={{ margin: "0 auto 12px", display: "block" }} />
          <div style={{ color: "#4a8a5a", fontSize: 14 }}>「出品追加」から出品を登録してください</div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { getListings, getPurchases, createListing, createSaleSimple, calcAllPlatforms, type Listing, type ListingCreate, type Purchase } from "@/lib/api";
import { Plus, DollarSign, X, Tag, TrendingUp, Zap, Copy, Sparkles, FileText } from "lucide-react";
import { toast } from "@/components/Toast";
import { errMsg } from "@/lib/errors";

type CopyDraft = { title: string; description: string; keywords: string[]; price_tip?: string };
const COPY_PLATFORMS: { key: string; label: string; api_value: string }[] = [
  { key: "ebay",    label: "eBay（英語）", api_value: "eBay" },
  { key: "mercari", label: "メルカリ",      api_value: "メルカリ" },
  { key: "amazon",  label: "Amazon",        api_value: "Amazon" },
];

const inp: React.CSSProperties = { background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", padding: "8px 12px", fontSize: 14, width: "100%", outline: "none", boxSizing: "border-box" };
const lbl: React.CSSProperties = { fontSize: 12, color: "var(--text-3)", fontWeight: 600, display: "block", marginBottom: 4 };

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
const emptyForm = { purchase_id: "", selling_platform: "Amazon", listing_price: "", category: "その他", listed_date: today, asin: "", use_fba: false };

function generateSku(productName: string, purchaseId: number | string): string {
  const clean = productName.replace(/[^\w぀-鿿]/g, "").slice(0, 6).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `SKU-${clean || "PROD"}-${purchaseId}-${rand}`;
}

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [listLoading, setListLoading] = useState(false);
  const [sellLoading, setSellLoading] = useState(false);

  // プラットフォーム比較（出品フォーム内）
  const [formComparison, setFormComparison] = useState<Record<string, { gross_profit: number; profit_rate: number; emoji: string }> | null>(null);
  const [compLoading, setCompLoading] = useState(false);

  // 売却モーダル
  const [sellModal, setSellModal] = useState<Listing | null>(null);
  const [sellPrice, setSellPrice] = useState("");
  const [sellPlatform, setSellPlatform] = useState("メルカリ");
  const [sellComparison, setSellComparison] = useState<Record<string, { gross_profit: number; profit_rate: number; emoji: string }> | null>(null);

  // 出品文コピーモーダル
  const [copyModal, setCopyModal] = useState<Listing | null>(null);
  const [copyPlatform, setCopyPlatform] = useState<string>("mercari");
  const [copyDrafts, setCopyDrafts] = useState<Record<string, CopyDraft>>({});
  const [copyLoading, setCopyLoading] = useState(false);

  const openCopyModal = (item: Listing) => {
    setCopyModal(item);
    setCopyDrafts({});
    setCopyPlatform("mercari");
  };

  const generateDraft = useCallback(async (platformKey: string) => {
    if (!copyModal) return;
    const pf = COPY_PLATFORMS.find(p => p.key === platformKey);
    if (!pf) return;
    setCopyLoading(true);
    try {
      const res = await fetch("/api/ai/listing-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name: copyModal.product_name,
          buy_price: copyModal.purchase_price,
          sell_platform: pf.api_value,
          condition: "中古",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setCopyDrafts(prev => ({ ...prev, [platformKey]: data.draft }));
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setCopyLoading(false);
    }
  }, [copyModal]);

  const doCopy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${what}をコピーしました`);
    } catch {
      toast("コピーに失敗しました", "error");
    }
  };

  const copyAll = (d: CopyDraft, price: number) => {
    const text = `${d.title}\n\n${d.description}\n\n価格: ¥${price.toLocaleString()}${d.keywords?.length ? `\n\nキーワード: ${d.keywords.join(", ")}` : ""}`;
    doCopy(text, "出品文すべて");
  };

  const load = useCallback(() => {
    getListings().then(setListings).catch(e => toast(errMsg(e), "error"));
    getPurchases({ status: "purchased" }).then(setPurchases).catch(e => toast(errMsg(e), "error"));
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

  const setFormField = (key: keyof Omit<typeof emptyForm, "use_fba">, val: string) => {
    const next = { ...form, [key]: val };
    setForm(next);
    if (key === "purchase_id" || key === "listing_price") {
      updateFormComparison(next.purchase_id, next.listing_price);
    }
  };

  const handleList = async () => {
    if (!form.purchase_id || !form.listing_price) { toast("商品と価格を入力してください", "error"); return; }
    setListLoading(true);
    try {
      const purchase = purchases.find(p => p.id === Number(form.purchase_id));
      const autoSku = generateSku(purchase?.product_name ?? "PROD", form.purchase_id);
      const body: ListingCreate = {
        purchase_id: Number(form.purchase_id),
        selling_platform: form.selling_platform,
        listing_price: Number(form.listing_price),
        amazon_shipping: 0,
        use_fba: form.use_fba ? 1 : 0,
        category: form.category,
        listed_date: form.listed_date,
        asin: form.asin || undefined,
      };
      await createListing(body);
      toast(`出品を追加しました SKU: ${autoSku}`);
      setForm(emptyForm); setShowForm(false); setFormComparison(null); load();
    } catch { toast("保存に失敗しました", "error"); }
    finally { setListLoading(false); }
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
    setSellLoading(true);
    try {
      const res = await createSaleSimple({ purchase_id: sellModal.purchase_id, sale_price: Number(sellPrice), sell_platform: sellPlatform });
      toast(`売却完了！純利益 ¥${Math.round(res.net_profit).toLocaleString()}`);
      setSellModal(null); setSellPrice(""); setSellComparison(null); load();
    } catch { toast("売却記録に失敗しました", "error"); }
    finally { setSellLoading(false); }
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
      <style>{`
        .listing-row:hover { border-color: rgba(212,175,55,0.38) !important; }
        .listing-row { transition: border-color 0.15s; }
        @media (max-width: 768px) {
          .listing-header { flex-direction: column !important; align-items: flex-start !important; gap: 10px; }
          .listing-form-3col { grid-template-columns: 1fr !important; }
          .listing-form-3col-2 { grid-template-columns: 1fr 1fr !important; }
          .listing-item-row { flex-direction: column !important; align-items: flex-start !important; gap: 8px; }
          .listing-item-row button { width: 100% !important; justify-content: center !important; min-height: 44px; }
        }
      `}</style>

      {/* ── ヘッダー ── */}
      <div className="listing-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", margin: 0 }}>出品管理</h1>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3 }}>
            出品中 <span style={{ color: "#66ccff", fontWeight: 700 }}>{active.length}件</span>
            　売却済 <span style={{ color: "var(--blue)", fontWeight: 700 }}>{sold.length}件</span>
          </div>
        </div>
        <button onClick={() => { setShowForm(!showForm); setFormComparison(null); }} style={{ display: "flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg,#1e1608,#2a1e08)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 10, color: "var(--blue)", padding: "10px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          <Plus size={16} /> 出品追加
        </button>
      </div>

      {/* ── マルチチャンネル接続ステータス（iOS風） ── */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: "20px 22px", marginBottom: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.01em" }}>マルチチャンネル同時出品</div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>1出品で3チャンネル公開、最初に売れた瞬間に他を自動取下げ</div>
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "#34C759", fontWeight: 600 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34C759" }} /> 稼働中
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {[
            { name: "eBay",     fee: "13%" },
            { name: "ヤフオク",  fee: "10%" },
            { name: "Amazon",   fee: "15%" },
          ].map(c => (
            <div key={c.name} style={{ padding: "12px 14px", background: "var(--surface-2)", borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{c.name}</div>
                <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>手数料 {c.fee}</div>
              </div>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#34C759" }} />
            </div>
          ))}
        </div>
      </div>

      {/* ── 出品フォーム ── */}
      {showForm && (
        <div style={{ background: "rgba(20,20,22,0.9)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 14, padding: "20px 24px", marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#C8C0B0", marginBottom: 16 }}>新規出品登録</div>

          <div className="listing-form-3col" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
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
          <div className="listing-form-3col-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={lbl}>ASIN（Amazon商品ID）</label>
              <input style={inp} value={form.asin} onChange={e => setForm(p => ({ ...p, asin: e.target.value }))} placeholder="B0XXXXXXXXXX" />
            </div>
            <div>
              <label style={lbl}>SKU（自動生成）</label>
              <div style={{ ...inp, color: "#5A5248", fontSize: 12, cursor: "not-allowed" }}>
                {form.purchase_id
                  ? generateSku(purchases.find(p => p.id === Number(form.purchase_id))?.product_name ?? "PROD", form.purchase_id)
                  : "商品を選択後に自動生成"
                }
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 4 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form.use_fba}
                  onChange={e => setForm(p => ({ ...p, use_fba: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: "#D4AF37", cursor: "pointer" }}
                />
                <span style={{ fontSize: 13, color: "#C8C0B0", fontWeight: 600 }}>FBA出品（フルフィルメント by Amazon）</span>
              </label>
            </div>
          </div>

          {/* プラットフォーム比較 */}
          {(formComparison || compLoading) && (
            <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Zap size={13} color="#ffcc44" />
                <span style={{ fontSize: 12, color: "#ffcc44", fontWeight: 700 }}>どのプラットフォームで売ると最も利益が出るか</span>
                {compLoading && <span style={{ fontSize: 11, color: "var(--text-3)" }}>計算中...</span>}
              </div>
              {!compLoading && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {sortedComp(formComparison).map(([name, data], i) => {
                    const isBest = i === 0 && data.gross_profit > 0;
                    const isSelected = form.selling_platform === name;
                    const profit = Math.round(data.gross_profit);
                    return (
                      <button key={name} onClick={() => setFormField("selling_platform", name)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 8, border: isSelected ? "1px solid rgba(212,175,55,0.5)" : isBest ? "1px solid rgba(255,204,68,0.3)" : "1px solid rgba(212,175,55,0.07)", background: isSelected ? "rgba(212,175,55,0.08)" : isBest ? "rgba(255,204,68,0.04)" : "transparent", cursor: "pointer", width: "100%", transition: "all 0.12s" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {isSelected && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#D4AF37", flexShrink: 0 }} />}
                          <span style={{ fontSize: 13, color: "var(--text)" }}>{data.emoji} {name}</span>
                          {isBest && <span style={{ fontSize: 10, background: "rgba(255,204,68,0.2)", border: "1px solid rgba(255,204,68,0.4)", borderRadius: 10, padding: "1px 6px", color: "#ffcc44" }}>最高利益</span>}
                        </div>
                        <div>
                          <span style={{ fontSize: 14, fontWeight: 700, color: profit >= 0 ? "#D4AF37" : "#ff6666", fontFamily: "monospace" }}>
                            {profit >= 0 ? "+" : ""}¥{profit.toLocaleString()}
                          </span>
                          <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: 6 }}>{data.profit_rate.toFixed(1)}%</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {bestPlatform && !compLoading && (
                <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-3)" }}>
                  クリックでプラットフォームを選択できます。現在: <span style={{ color: "var(--blue)", fontWeight: 700 }}>{form.selling_platform}</span>
                </div>
              )}
            </div>
          )}

          {!formComparison && !compLoading && form.purchase_id && !form.listing_price && (
            <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 14, padding: "10px 14px", background: "rgba(0,0,0,0.2)", borderRadius: 8 }}>
              出品価格を入力すると、プラットフォーム別の利益比較が表示されます
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleList} disabled={listLoading} style={{ background: "linear-gradient(135deg,#1e1608,#2a1e08)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 8, color: "var(--blue)", padding: "10px 28px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
              {listLoading ? "保存中..." : `${form.selling_platform} に出品登録`}
            </button>
            <button onClick={() => { setShowForm(false); setFormComparison(null); }} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text-3)", padding: "10px 16px", cursor: "pointer" }}>キャンセル</button>
          </div>
        </div>
      )}

      {/* ── 売却モーダル ── */}
      {sellModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={e => e.target === e.currentTarget && setSellModal(null)}>
          <div style={{ background: "#0a0a0b", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 16, padding: 28, width: 520, maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
            <button onClick={() => setSellModal(null)} style={{ position: "absolute", top: 14, right: 14, background: "transparent", border: "none", color: "var(--text-3)", cursor: "pointer" }}><X size={18} /></button>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>売却記録</div>
            <div style={{ background: "rgba(10,10,11,0.8)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, border: "1px solid rgba(212,175,55,0.1)" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{sellModal.product_name}</div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>出品価格 ¥{sellModal.listing_price.toLocaleString()} · {sellModal.selling_platform}</div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>実際の売却価格 (円)</label>
              <input type="number" style={{ ...inp, fontSize: 22, fontFamily: "monospace", textAlign: "center" }} value={sellPrice} onChange={e => handleSellPriceChange(e.target.value, sellModal)} autoFocus placeholder="0" />
            </div>
            {sortedComp(sellComparison).length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <TrendingUp size={12} /> プラットフォーム別利益
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {sortedComp(sellComparison).map(([name, data], i) => {
                    const isBest = i === 0 && data.gross_profit > 0;
                    const isSelected = sellPlatform === name;
                    const profit = Math.round(data.gross_profit);
                    return (
                      <button key={name} onClick={() => setSellPlatform(name)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 8, border: isSelected ? "1px solid rgba(212,175,55,0.5)" : "1px solid rgba(212,175,55,0.07)", background: isSelected ? "rgba(212,175,55,0.08)" : "transparent", cursor: "pointer", width: "100%" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 13, color: "var(--text)" }}>{data.emoji} {name}</span>
                          {isBest && <span style={{ fontSize: 10, background: "rgba(212,175,55,0.15)", borderRadius: 10, padding: "1px 6px", color: "var(--blue)" }}>最高</span>}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: profit >= 0 ? "#D4AF37" : "#ff6666", fontFamily: "monospace" }}>
                          {profit >= 0 ? "+" : ""}¥{profit.toLocaleString()} <span style={{ fontSize: 11, color: "var(--text-3)" }}>({data.profit_rate.toFixed(1)}%)</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleSell} disabled={sellLoading || !sellPrice} style={{ flex: 1, background: "linear-gradient(135deg,#1e1608,#2a1e08)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 8, color: "var(--blue)", padding: "12px", fontWeight: 700, cursor: "pointer", fontSize: 14, opacity: (!sellPrice || sellLoading) ? 0.5 : 1 }}>
                {sellLoading ? "記録中..." : "売却を記録する"}
              </button>
              <button onClick={() => setSellModal(null)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text-3)", padding: "12px 16px", cursor: "pointer" }}>キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 出品文コピーモーダル ── */}
      {copyModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={e => e.target === e.currentTarget && setCopyModal(null)}>
          <div style={{ background: "#0a0a0b", border: "1px solid rgba(64,170,223,0.35)", borderRadius: 16, padding: 28, width: 640, maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
            <button onClick={() => setCopyModal(null)} style={{ position: "absolute", top: 14, right: 14, background: "transparent", border: "none", color: "var(--text-3)", cursor: "pointer" }}><X size={18} /></button>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Sparkles size={16} color="#60BFEF" />
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)" }}>AI出品文 ワンクリックコピー</div>
            </div>
            <div style={{ background: "rgba(10,10,11,0.8)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, border: "1px solid rgba(64,170,223,0.15)" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{copyModal.product_name}</div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>仕入 ¥{copyModal.purchase_price.toLocaleString()} · 出品価格 ¥{copyModal.listing_price.toLocaleString()}</div>
            </div>

            {/* 販路タブ */}
            <div style={{ display: "flex", gap: 6, marginBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 8 }}>
              {COPY_PLATFORMS.map(p => (
                <button key={p.key} onClick={() => setCopyPlatform(p.key)} style={{
                  flex: 1,
                  background: copyPlatform === p.key ? "rgba(64,170,223,0.15)" : "transparent",
                  border: copyPlatform === p.key ? "1px solid rgba(64,170,223,0.4)" : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  color: copyPlatform === p.key ? "#60BFEF" : "var(--text-3)",
                  padding: "8px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}>
                  {p.label}
                </button>
              ))}
            </div>

            {/* 生成ボタン or 結果表示 */}
            {!copyDrafts[copyPlatform] ? (
              <div style={{ textAlign: "center", padding: "32px 16px" }}>
                <div style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 16 }}>
                  AIが「{COPY_PLATFORMS.find(p => p.key === copyPlatform)?.label}」向けに最適化された<br />
                  タイトル・説明文・キーワードを自動生成します
                </div>
                <button
                  onClick={() => generateDraft(copyPlatform)}
                  disabled={copyLoading}
                  style={{ background: "linear-gradient(135deg,#006FE6,#3B8EEA)", border: "none", borderRadius: 10, color: "#FFFFFF", padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: copyLoading ? "wait" : "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}
                >
                  <Sparkles size={14} />
                  {copyLoading ? "生成中..." : "AI出品文を生成"}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* タイトル */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.06em" }}>タイトル</span>
                    <button onClick={() => doCopy(copyDrafts[copyPlatform].title, "タイトル")} style={{ background: "rgba(64,170,223,0.12)", border: "1px solid rgba(64,170,223,0.3)", borderRadius: 6, color: "#60BFEF", padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Copy size={10} /> コピー
                    </button>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>
                    {copyDrafts[copyPlatform].title}
                  </div>
                </div>

                {/* 説明文 */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.06em" }}>説明文</span>
                    <button onClick={() => doCopy(copyDrafts[copyPlatform].description, "説明文")} style={{ background: "rgba(64,170,223,0.12)", border: "1px solid rgba(64,170,223,0.3)", borderRadius: 6, color: "#60BFEF", padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Copy size={10} /> コピー
                    </button>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "var(--text)", lineHeight: 1.65, whiteSpace: "pre-wrap", maxHeight: 200, overflowY: "auto" }}>
                    {copyDrafts[copyPlatform].description}
                  </div>
                </div>

                {/* 価格 */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.06em" }}>推奨価格</span>
                    <button onClick={() => doCopy(String(copyModal.listing_price), "価格")} style={{ background: "rgba(64,170,223,0.12)", border: "1px solid rgba(64,170,223,0.3)", borderRadius: 6, color: "#60BFEF", padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Copy size={10} /> コピー
                    </button>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 12px", fontSize: 18, fontWeight: 700, color: "#60BFEF", fontFamily: "monospace" }}>
                    ¥{copyModal.listing_price.toLocaleString()}
                  </div>
                  {copyDrafts[copyPlatform].price_tip && (
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4, fontStyle: "italic" }}>💡 {copyDrafts[copyPlatform].price_tip}</div>
                  )}
                </div>

                {/* キーワード */}
                {copyDrafts[copyPlatform].keywords?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.06em", marginBottom: 6 }}>関連キーワード</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {copyDrafts[copyPlatform].keywords.map((kw, i) => (
                        <span key={i} style={{ background: "rgba(64,170,223,0.08)", border: "1px solid rgba(64,170,223,0.2)", borderRadius: 12, padding: "3px 10px", fontSize: 11, color: "#60BFEF" }}>
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 全部コピー + 再生成 */}
                <div style={{ display: "flex", gap: 8, marginTop: 8, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <button onClick={() => copyAll(copyDrafts[copyPlatform], copyModal.listing_price)} style={{ flex: 1, background: "linear-gradient(135deg,#006FE6,#3B8EEA)", border: "none", borderRadius: 8, color: "#FFFFFF", padding: "10px", fontSize: 13, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Copy size={13} /> 全部まとめてコピー
                  </button>
                  <button onClick={() => generateDraft(copyPlatform)} disabled={copyLoading} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "var(--text-3)", padding: "10px 14px", fontSize: 12, cursor: copyLoading ? "wait" : "pointer" }}>
                    {copyLoading ? "..." : "再生成"}
                  </button>
                </div>
              </div>
            )}
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
                <div key={item.id} className="listing-row" style={{ background: "rgba(20,20,22,0.9)", border: "1px solid rgba(100,200,255,0.12)", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: "var(--text)", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.product_name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2, display: "flex", gap: 8 }}>
                      <span>{item.platform} → {pf?.flag ?? ""} {item.selling_platform}</span>
                      {pf && <span style={{ color: "#4a6a7a" }}>手数料 {pf.fee}</span>}
                      {item.listed_date && <span>出品日 {item.listed_date}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: "monospace", fontWeight: 700, color: "#66ccff", fontSize: 15 }}>¥{item.listing_price.toLocaleString()}</div>
                    <div style={{ fontSize: 10, color: "var(--text-3)" }}>出品価格</div>
                  </div>
                  <button onClick={() => openCopyModal(item)} style={{ background: "rgba(0,40,80,0.7)", border: "1px solid rgba(64,170,223,0.3)", borderRadius: 8, color: "#60BFEF", cursor: "pointer", padding: "7px 12px", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <FileText size={12} /> 文章コピー
                  </button>
                  <button onClick={() => openSell(item)} style={{ background: "rgba(0,80,30,0.7)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 8, color: "#9A7D25", cursor: "pointer", padding: "7px 14px", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
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
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-3)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <TrendingUp size={13} /> 売却済み ({sold.length}件)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {sold.map(item => (
              <div key={item.id} style={{ background: "rgba(20,20,22,0.7)", border: "1px solid rgba(212,175,55,0.06)", borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, opacity: 0.7 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "#a8d8b8", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.product_name}</div>
                  <div style={{ fontSize: 11, color: "#3a6a4a" }}>{item.platform} → {item.selling_platform}</div>
                </div>
                <div style={{ fontFamily: "monospace", color: "var(--text-3)", fontSize: 13 }}>¥{item.listing_price.toLocaleString()}</div>
                <span style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 20, padding: "2px 10px", fontSize: 11, color: "var(--text-3)", flexShrink: 0 }}>売却済</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {listings.length === 0 && !showForm && (
        <div style={{ background: "rgba(20,20,22,0.9)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 14, textAlign: "center", padding: 48 }}>
          <Tag size={36} color="rgba(212,175,55,0.25)" style={{ margin: "0 auto 16px", display: "block" }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: "#C8C0B0", marginBottom: 8 }}>出品データがありません</div>
          <div style={{ color: "var(--text-3)", fontSize: 13, marginBottom: 16 }}>仕入れた商品をどのプラットフォームに出品するか登録できます</div>
          <button onClick={() => setShowForm(true)} style={{ background: "linear-gradient(135deg,#1e1608,#2a1e08)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 9, color: "var(--blue)", padding: "10px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            出品を登録する →
          </button>
        </div>
      )}
    </div>
  );
}

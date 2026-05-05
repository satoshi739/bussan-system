"use client";

import RequirePlan from "@/components/RequirePlan";
import { useEffect, useState } from "react";
import { getWatchlist, addWatchlist, removeWatchlist, calcMaxPurchase } from "@/lib/api";
import Link from "next/link";
import { Plus, Trash2, Target, Search } from "lucide-react";
import { toast } from "@/components/Toast";
import { errMsg } from "@/lib/errors";

const card: React.CSSProperties = { background: "rgba(20,20,22,0.9)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 14, padding: "20px 24px" };
const inp: React.CSSProperties = { background: "rgba(10,10,11,0.95)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 8, color: "#F5F0E8", padding: "9px 12px", fontSize: 14, width: "100%", outline: "none" };
const lbl: React.CSSProperties = { fontSize: 12, color: "#8A8278", fontWeight: 600, display: "block", marginBottom: 4 };

const SELL_PLATFORMS = ["メルカリ", "Amazon", "ラクマ", "PayPayフリマ", "Yahoo!オークション", "Lazada", "eBay（輸出）"];

type WatchItem = { keyword: string; sell_platform: string; target_rate: number; memo: string };

const watchlistStyles = `
  @keyframes sk { 0%,100%{opacity:.9} 50%{opacity:.4} }
  .wl-row:hover { border-color: rgba(212,175,55,0.38) !important; }
  .wl-row { transition: all 0.15s; }
  @media (max-width: 768px) {
    .wl-header { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
    .wl-form-grid { grid-template-columns: 1fr !important; }
    .wl-inline-row { flex-direction: column !important; align-items: flex-start !important; }
    .wl-inline-row input { width: 100% !important; }
    .wl-btn-group { flex-direction: column !important; }
    .wl-btn-group button, .wl-btn-group a { width: 100% !important; justify-content: center !important; min-height: 44px; }
  }
`;

function WatchlistPageContent() {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ keyword: "", sell_platform: "メルカリ", target_rate: "20", memo: "" });
  const [maxPrices, setMaxPrices] = useState<Record<string, number>>({});
  const [sellPriceInputs, setSellPriceInputs] = useState<Record<string, string>>({});

  const load = () => {
    getWatchlist().then(data => setItems(data)).catch(e => toast(errMsg(e), "error"));
  };
  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.keyword) { toast("キーワードを入力してください", "error"); return; }
    try {
      await addWatchlist({ keyword: form.keyword, sell_platform: form.sell_platform, target_rate: Number(form.target_rate) || 20, memo: form.memo });
      toast("ウォッチリストに追加しました");
      setForm({ keyword: "", sell_platform: "メルカリ", target_rate: "20", memo: "" });
      setShowForm(false);
      load();
    } catch (e) { toast(errMsg(e), "error"); }
  };

  const handleDelete = async (keyword: string) => {
    try {
      await removeWatchlist(keyword);
      toast("削除しました", "info");
      load();
    } catch (e) { toast(errMsg(e), "error"); }
  };

  const calcMax = async (item: WatchItem, sellPrice: string) => {
    if (!sellPrice || Number(sellPrice) <= 0) return;
    try {
      const r = await calcMaxPurchase({ selling_price: Number(sellPrice), target_profit_rate: item.target_rate, selling_platform: item.sell_platform });
      setMaxPrices(prev => ({ ...prev, [item.keyword]: r.max_purchase_price }));
    } catch (e) { toast(errMsg(e), "error"); }
  };

  return (
    <div>
      <style>{watchlistStyles}</style>
      <div className="wl-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#F5F0E8", margin: 0 }}>ウォッチリスト</h1>
          <div style={{ fontSize: 12, color: "#8A8278", marginTop: 3 }}>仕入れたい商品キーワードを登録して、見つけた時の目標仕入れ価格を確認できます</div>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ display: "flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg,#1e1608,#2a1e08)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 10, color: "#D4AF37", padding: "10px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer", minHeight: 44 }}>
          <Plus size={16} /> 追加
        </button>
      </div>

      {showForm && (
        <div style={{ ...card, marginBottom: 16, borderColor: "rgba(212,175,55,0.3)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#C8C0B0", marginBottom: 14 }}>新規ウォッチ登録</div>
          <div className="wl-form-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={lbl}>キーワード（商品名）</label><input style={inp} value={form.keyword} onChange={e => setForm({ ...form, keyword: e.target.value })} onKeyDown={e => e.key === "Enter" && handleAdd()} placeholder="例: Nintendo Switch 本体" autoFocus /></div>
            <div><label style={lbl}>販売先</label>
              <select style={inp} value={form.sell_platform} onChange={e => setForm({ ...form, sell_platform: e.target.value })}>
                {SELL_PLATFORMS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div><label style={lbl}>目標利益率 (%)</label><input type="number" style={inp} value={form.target_rate} onChange={e => setForm({ ...form, target_rate: e.target.value })} /></div>
          </div>
          <div style={{ marginBottom: 14 }}><label style={lbl}>メモ</label><input style={inp} value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} placeholder="相場感・注意点など" /></div>
          <div className="wl-btn-group" style={{ display: "flex", gap: 8 }}>
            <button onClick={handleAdd} style={{ background: "linear-gradient(135deg,#1e1608,#2a1e08)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 8, color: "#D4AF37", padding: "10px 24px", fontWeight: 700, cursor: "pointer", minHeight: 44 }}>追加</button>
            <button onClick={() => setShowForm(false)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#8A8278", padding: "10px 16px", cursor: "pointer", minHeight: 44 }}>キャンセル</button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div style={{ background: "rgba(20,20,22,0.9)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 14, textAlign: "center", padding: 48 }}>
          <div style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 50, width: 64, height: 64, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Search size={28} color="rgba(212,175,55,0.5)" />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#C8C0B0", marginBottom: 8 }}>ウォッチリストが空です</div>
          <div style={{ fontSize: 13, color: "#8A8278", marginBottom: 16 }}>
            仕入れたい商品を登録すると、<br />「いくらまでなら仕入れていいか」をすぐ確認できます
          </div>
          <button onClick={() => setShowForm(true)} style={{ background: "linear-gradient(135deg,#1e1608,#2a1e08)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 10, color: "#D4AF37", padding: "12px 24px", fontWeight: 700, cursor: "pointer" }}>
            最初の商品を登録する
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map(item => {
            const maxP = maxPrices[item.keyword];
            const sellInput = sellPriceInputs[item.keyword] ?? "";
            return (
              <div key={item.keyword} className="wl-row" style={card}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: "#F5F0E8" }}>{item.keyword}</span>
                      <span style={{ fontSize: 11, background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 20, padding: "2px 8px", color: "#D4AF37" }}>{item.sell_platform}</span>
                      <span style={{ fontSize: 11, color: "#8A8278" }}>目標利益率 {item.target_rate}%</span>
                    </div>
                    {item.memo && <div style={{ fontSize: 12, color: "#8A8278", marginBottom: 8 }}>📝 {item.memo}</div>}

                    {/* 仕入れ価格逆算 */}
                    <div className="wl-inline-row" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                      <span style={{ fontSize: 12, color: "#8A8278", flexShrink: 0 }}>相場価格:</span>
                      <input type="number" value={sellInput} onChange={e => { setSellPriceInputs(prev => ({ ...prev, [item.keyword]: e.target.value })); calcMax(item, e.target.value); }} style={{ ...inp, width: 120, padding: "5px 10px", fontSize: 13 }} placeholder="¥0" />
                      <span style={{ fontSize: 12, color: "#8A8278" }}>円で売れるなら</span>
                      {maxP !== undefined && sellInput ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Target size={14} color="#D4AF37" />
                          <span style={{ fontSize: 14, fontWeight: 800, color: "#D4AF37", fontFamily: "monospace" }}>
                            ¥{Math.floor(maxP).toLocaleString()} まで仕入れOK
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: "#2a5a3a" }}>← 相場を入力すると最大仕入れ価格を表示</span>
                      )}
                    </div>
                  </div>

                  <div className="wl-btn-group" style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <Link
                      href={`/search?q=${encodeURIComponent(item.keyword)}`}
                      style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(0,30,50,0.6)", border: "1px solid rgba(100,170,255,0.2)", borderRadius: 8, color: "#66aaff", cursor: "pointer", padding: "6px 10px", textDecoration: "none", fontSize: 12, fontWeight: 600 }}
                      title="相場を検索"
                    >
                      <Search size={13} /> 相場
                    </Link>
                    <button onClick={() => handleDelete(item.keyword)} style={{ background: "transparent", border: "1px solid rgba(255,80,80,0.15)", borderRadius: 8, color: "#ff6666", cursor: "pointer", padding: "6px 8px" }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function WatchlistPage() {
  return (
    <RequirePlan requiredPlan="STANDARD" featureName="ウォッチリスト">
      <WatchlistPageContent />
    </RequirePlan>
  );
}

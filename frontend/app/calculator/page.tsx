"use client";

import { useEffect, useState, useCallback } from "react";
import {
  calcProfit, calcMaxPurchase, calcAllPlatforms,
  getPlatforms, getCategories,
  type ProfitResult, type PlatformInfo,
} from "@/lib/api";

const card: React.CSSProperties = { background: "rgba(20,20,22,0.9)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 14, padding: "20px 24px" };
const inp: React.CSSProperties = { background: "rgba(10,10,11,0.95)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 8, color: "#F5F0E8", padding: "10px 12px", fontSize: 15, width: "100%", outline: "none", fontFamily: "monospace" };
const lbl: React.CSSProperties = { fontSize: 12, color: "#8A8278", fontWeight: 600, display: "block", marginBottom: 4 };

type Tab = "profit" | "reverse" | "compare" | "bulk";

export default function CalculatorPage() {
  const [tab, setTab] = useState<Tab>("profit");
  const [platforms, setPlatforms] = useState<Record<string, PlatformInfo>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [apiError, setApiError] = useState(false);

  useEffect(() => {
    Promise.all([getPlatforms(), getCategories()])
      .then(([p, c]) => { setPlatforms(p); setCategories(c); })
      .catch(() => setApiError(true));
  }, []);

  const domestic = Object.entries(platforms).filter(([, v]) => v.area === "国内");
  const overseas = Object.entries(platforms).filter(([, v]) => v.area === "海外");

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: "#F5F0E8", marginBottom: 20 }}>利益計算</h1>
      {apiError && (
        <div style={{ background: "rgba(255,120,50,0.08)", border: "1px solid rgba(255,120,50,0.3)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span style={{ color: "#ff9966" }}>バックエンドに接続できません。プラットフォーム情報を読み込めませんでした。</span>
          <button onClick={() => window.location.reload()} style={{ marginLeft: "auto", background: "transparent", border: "1px solid rgba(255,120,50,0.4)", borderRadius: 6, color: "#ff9966", padding: "4px 12px", fontSize: 12, cursor: "pointer" }}>再読み込み</button>
        </div>
      )}

      {/* タブ */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, background: "rgba(0,10,3,0.8)", border: "1px solid rgba(212,175,55,0.12)", borderRadius: 12, padding: 5, width: "fit-content" }}>
        {([
          { id: "profit", label: "🧮 利益計算" },
          { id: "reverse", label: "🔁 最大仕入れ価格" },
          { id: "compare", label: "📊 プラットフォーム比較" },
          { id: "bulk", label: "📦 数量シミュレーション" },
        ] as { id: Tab; label: string }[]).map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: tab === id ? "linear-gradient(135deg,#1e1608,#2a1e08)" : "transparent", color: tab === id ? "#D4AF37" : "#7aaa8a", fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.15s" }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "profit" && <ProfitTab domestic={domestic} overseas={overseas} categories={categories} />}
      {tab === "reverse" && <ReverseTab domestic={domestic} overseas={overseas} categories={categories} />}
      {tab === "compare" && <CompareTab />}
      {tab === "bulk" && <BulkSimTab domestic={domestic} overseas={overseas} />}
    </div>
  );
}

/* ── 利益計算タブ ── */
function ProfitTab({ domestic, overseas, categories }: { domestic: [string, PlatformInfo][]; overseas: [string, PlatformInfo][]; categories: string[] }) {
  const [form, setForm] = useState({ purchase_price: "", selling_price: "", purchase_shipping: "", shipping_to_platform: "", selling_platform: "メルカリ", category: "その他" });
  const [result, setResult] = useState<ProfitResult | null>(null);

  const recalc = useCallback(async (f: typeof form) => {
    if (!f.purchase_price || !f.selling_price) { setResult(null); return; }
    try {
      setResult(await calcProfit({ purchase_price: Number(f.purchase_price), selling_price: Number(f.selling_price), purchase_shipping: Number(f.purchase_shipping) || 0, shipping_to_platform: Number(f.shipping_to_platform) || 0, selling_platform: f.selling_platform, category: f.category }));
    } catch { /* ignore */ }
  }, []);

  const upd = (key: keyof typeof form, val: string) => { const n = { ...form, [key]: val }; setForm(n); recalc(n); };
  const profitColor = result ? (result.gross_profit >= 0 ? "#D4AF37" : "#ff6666") : "#F5F0E8";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#C8C0B0", marginBottom: 14 }}>📥 仕入れ</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>仕入れ価格 (円)</label><input type="number" style={inp} value={form.purchase_price} onChange={e => upd("purchase_price", e.target.value)} placeholder="0" /></div>
            <div><label style={lbl}>仕入れ送料 (円)</label><input type="number" style={inp} value={form.purchase_shipping} onChange={e => upd("purchase_shipping", e.target.value)} placeholder="0" /></div>
          </div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#C8C0B0", marginBottom: 14 }}>📤 販売</div>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>販売プラットフォーム</label>
            <select style={{ ...inp, fontSize: 13 }} value={form.selling_platform} onChange={e => upd("selling_platform", e.target.value)}>
              <optgroup label="国内">{domestic.map(([k, v]) => <option key={k} value={k}>{v.emoji} {k} — {v.note}</option>)}</optgroup>
              <optgroup label="海外">{overseas.map(([k, v]) => <option key={k} value={k}>{v.emoji} {k} — {v.note}</option>)}</optgroup>
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>販売価格 (円)</label><input type="number" style={inp} value={form.selling_price} onChange={e => upd("selling_price", e.target.value)} placeholder="0" /></div>
            <div><label style={lbl}>配送料 (円)</label><input type="number" style={inp} value={form.shipping_to_platform} onChange={e => upd("shipping_to_platform", e.target.value)} placeholder="0" /></div>
          </div>
          {form.selling_platform === "Amazon" && (
            <div style={{ marginTop: 12 }}>
              <label style={lbl}>Amazonカテゴリー</label>
              <select style={{ ...inp, fontSize: 13 }} value={form.category} onChange={e => upd("category", e.target.value)}>{categories.map(c => <option key={c}>{c}</option>)}</select>
            </div>
          )}
        </div>
        <div style={{ ...card, fontSize: 12, color: "#8A8278" }}>入力するたびに自動計算されます</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {result ? (
          <>
            <div style={{ ...card, textAlign: "center", padding: "28px 24px" }}>
              <div style={{ fontSize: 12, color: "#8A8278", marginBottom: 6 }}>純利益</div>
              <div style={{ fontSize: 52, fontWeight: 900, color: profitColor, fontFamily: "monospace", lineHeight: 1 }}>¥{Math.round(result.gross_profit).toLocaleString()}</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 28, marginTop: 16 }}>
                <div><div style={{ fontSize: 11, color: "#8A8278" }}>利益率</div><div style={{ fontSize: 22, fontWeight: 800, color: profitColor, fontFamily: "monospace" }}>{result.profit_rate.toFixed(1)}%</div></div>
                <div style={{ width: 1, background: "rgba(212,175,55,0.1)" }} />
                <div><div style={{ fontSize: 11, color: "#8A8278" }}>ROI</div><div style={{ fontSize: 22, fontWeight: 800, color: profitColor, fontFamily: "monospace" }}>{result.roi.toFixed(1)}%</div></div>
              </div>
            </div>
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#C8C0B0", marginBottom: 14 }}>内訳</div>
              {[
                { label: "販売価格", value: result.selling_price, color: "#66ccff", sign: "+" },
                { label: "仕入れコスト", value: result.purchase_total, color: "#ff9966", sign: "−" },
                { label: "プラットフォーム手数料", value: result.platform_fees, color: "#ff9966", sign: "−" },
                { label: "配送料", value: result.shipping_cost, color: "#ff9966", sign: "−" },
              ].map(({ label, value, color, sign }) => value > 0 && (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(212,175,55,0.05)", fontSize: 13 }}>
                  <span style={{ color: "#a8d8b8" }}>{label}</span>
                  <span style={{ color, fontFamily: "monospace", fontWeight: 600 }}>{sign}¥{Math.round(value).toLocaleString()}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", fontSize: 15, fontWeight: 800 }}>
                <span style={{ color: "#F5F0E8" }}>純利益</span>
                <span style={{ color: profitColor, fontFamily: "monospace" }}>¥{Math.round(result.gross_profit).toLocaleString()}</span>
              </div>
            </div>
          </>
        ) : (
          <div style={{ ...card, textAlign: "center", padding: 60, color: "#3a6a4a" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🧮</div>
            仕入れ価格と販売価格を入力すると<br />自動計算されます
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 最大仕入れ価格タブ ── */
function ReverseTab({ domestic, overseas, categories }: { domestic: [string, PlatformInfo][]; overseas: [string, PlatformInfo][]; categories: string[] }) {
  const [form, setForm] = useState({ selling_price: "", target_profit_rate: "20", selling_platform: "メルカリ", category: "その他", shipping_to_platform: "" });
  const [result, setResult] = useState<number | null>(null);

  const recalc = useCallback(async (f: typeof form) => {
    if (!f.selling_price) { setResult(null); return; }
    try {
      const r = await calcMaxPurchase({ selling_price: Number(f.selling_price), target_profit_rate: Number(f.target_profit_rate) || 20, selling_platform: f.selling_platform, category: f.category, shipping_to_platform: Number(f.shipping_to_platform) || 0 });
      setResult(r.max_purchase_price);
    } catch { /* ignore */ }
  }, []);

  const upd = (key: keyof typeof form, val: string) => { const n = { ...form, [key]: val }; setForm(n); recalc(n); };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#C8C0B0", marginBottom: 4 }}>🔁 最大仕入れ価格を逆算</div>
          <div style={{ fontSize: 12, color: "#8A8278", marginBottom: 16 }}>「この値段で売りたい」→「いくらまで仕入れていい？」を計算します</div>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>販売プラットフォーム</label>
            <select style={{ ...inp, fontSize: 13 }} value={form.selling_platform} onChange={e => upd("selling_platform", e.target.value)}>
              <optgroup label="国内">{domestic.map(([k, v]) => <option key={k} value={k}>{v.emoji} {k}</option>)}</optgroup>
              <optgroup label="海外">{overseas.map(([k, v]) => <option key={k} value={k}>{v.emoji} {k}</option>)}</optgroup>
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={lbl}>販売価格 (円)</label><input type="number" style={inp} value={form.selling_price} onChange={e => upd("selling_price", e.target.value)} placeholder="例: 5000" autoFocus /></div>
            <div><label style={lbl}>目標利益率 (%)</label><input type="number" style={inp} value={form.target_profit_rate} onChange={e => upd("target_profit_rate", e.target.value)} placeholder="20" /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>配送料 (円)</label><input type="number" style={inp} value={form.shipping_to_platform} onChange={e => upd("shipping_to_platform", e.target.value)} placeholder="0" /></div>
            {form.selling_platform === "Amazon" && (
              <div><label style={lbl}>カテゴリー</label><select style={{ ...inp, fontSize: 13 }} value={form.category} onChange={e => upd("category", e.target.value)}>{categories.map(c => <option key={c}>{c}</option>)}</select></div>
            )}
          </div>
        </div>
      </div>

      <div>
        {result !== null ? (
          <div style={{ ...card, textAlign: "center", padding: "36px 24px" }}>
            <div style={{ fontSize: 13, color: "#8A8278", marginBottom: 8 }}>最大仕入れ価格</div>
            <div style={{ fontSize: 56, fontWeight: 900, color: "#D4AF37", fontFamily: "monospace", lineHeight: 1 }}>
              ¥{Math.floor(result).toLocaleString()}
            </div>
            <div style={{ marginTop: 16, fontSize: 13, color: "#8A8278" }}>
              これより安く仕入れれば<br />利益率 {form.target_profit_rate}% 以上を確保できます
            </div>
            {form.selling_price && (
              <div style={{ marginTop: 20, display: "flex", gap: 16, justifyContent: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#8A8278" }}>販売価格</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#66ccff", fontFamily: "monospace" }}>¥{Number(form.selling_price).toLocaleString()}</div>
                </div>
                <div style={{ color: "#8A8278", alignSelf: "center" }}>→</div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#8A8278" }}>目標利益率</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#D4AF37", fontFamily: "monospace" }}>{form.target_profit_rate}%</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ ...card, textAlign: "center", padding: 60, color: "#3a6a4a" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔁</div>
            販売価格を入力すると<br />最大仕入れ価格が表示されます
          </div>
        )}
      </div>
    </div>
  );
}

/* ── プラットフォーム比較タブ ── */
function CompareTab() {
  const [form, setForm] = useState({ purchase_price: "", purchase_shipping: "", selling_price: "" });
  const [results, setResults] = useState<Record<string, { gross_profit: number; profit_rate: number; platform_fees: number; emoji: string; area: string }> | null>(null);
  const [loading, setLoading] = useState(false);

  const recalc = useCallback(async (f: typeof form) => {
    if (!f.purchase_price || !f.selling_price) { setResults(null); return; }
    setLoading(true);
    try {
      setResults(await calcAllPlatforms({ purchase_price: Number(f.purchase_price), purchase_shipping: Number(f.purchase_shipping) || 0, selling_price: Number(f.selling_price) }));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  const upd = (key: keyof typeof form, val: string) => { const n = { ...form, [key]: val }; setForm(n); recalc(n); };

  const sorted = results ? Object.entries(results).sort((a, b) => b[1].gross_profit - a[1].gross_profit) : [];
  const maxProfit = sorted.length ? sorted[0][1].gross_profit : 0;

  return (
    <div>
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#C8C0B0", marginBottom: 4 }}>📊 全プラットフォームで比較</div>
        <div style={{ fontSize: 12, color: "#8A8278", marginBottom: 16 }}>同じ商品をどこで売ると一番儲かるか一覧で確認できます</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div><label style={lbl}>仕入れ価格 (円)</label><input type="number" style={inp} value={form.purchase_price} onChange={e => upd("purchase_price", e.target.value)} placeholder="例: 2000" autoFocus /></div>
          <div><label style={lbl}>仕入れ送料 (円)</label><input type="number" style={inp} value={form.purchase_shipping} onChange={e => upd("purchase_shipping", e.target.value)} placeholder="0" /></div>
          <div><label style={lbl}>販売価格 (円)</label><input type="number" style={inp} value={form.selling_price} onChange={e => upd("selling_price", e.target.value)} placeholder="例: 4000" /></div>
        </div>
      </div>

      {loading && <div style={{ color: "#8A8278", textAlign: "center", padding: 20 }}>計算中...</div>}

      {sorted.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* 国内 */}
          <div style={{ fontSize: 12, color: "#8A8278", fontWeight: 700, padding: "4px 0" }}>🏯 国内プラットフォーム</div>
          {sorted.filter(([, v]) => v.area === "国内").map(([name, data], i) => {
            const isTop = data.gross_profit === maxProfit && data.gross_profit > 0;
            const barWidth = maxProfit > 0 ? Math.max(0, (data.gross_profit / maxProfit) * 100) : 0;
            return (
              <div key={name} style={{ ...card, padding: "14px 18px", border: isTop ? "1px solid rgba(212,175,55,0.5)" : "1px solid rgba(212,175,55,0.12)", position: "relative", overflow: "hidden" }}>
                {isTop && <div style={{ position: "absolute", top: 8, right: 12, fontSize: 11, background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 20, padding: "2px 8px", color: "#D4AF37", fontWeight: 700 }}>最高利益</div>}
                <div style={{ position: "absolute", bottom: 0, left: 0, height: 3, width: `${barWidth}%`, background: data.gross_profit >= 0 ? "rgba(212,175,55,0.3)" : "rgba(255,80,80,0.3)", transition: "width 0.3s" }} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 18 }}>{data.emoji}</span>
                    <div>
                      <div style={{ fontWeight: 700, color: "#F5F0E8", fontSize: 14 }}>{name}</div>
                      <div style={{ fontSize: 11, color: "#8A8278" }}>手数料 ¥{Math.round(data.platform_fees).toLocaleString()}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: data.gross_profit >= 0 ? "#D4AF37" : "#ff6666", fontFamily: "monospace" }}>
                      ¥{Math.round(data.gross_profit).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 12, color: data.gross_profit >= 0 ? "#9A7D25" : "#ff9966" }}>{data.profit_rate.toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            );
          })}
          {/* 海外 */}
          <div style={{ fontSize: 12, color: "#8A8278", fontWeight: 700, padding: "8px 0 4px" }}>🌏 海外プラットフォーム</div>
          {sorted.filter(([, v]) => v.area === "海外").map(([name, data]) => {
            const isTop = data.gross_profit === maxProfit && data.gross_profit > 0;
            const barWidth = maxProfit > 0 ? Math.max(0, (data.gross_profit / maxProfit) * 100) : 0;
            return (
              <div key={name} style={{ ...card, padding: "14px 18px", border: isTop ? "1px solid rgba(212,175,55,0.5)" : "1px solid rgba(212,175,55,0.12)", position: "relative", overflow: "hidden" }}>
                {isTop && <div style={{ position: "absolute", top: 8, right: 12, fontSize: 11, background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 20, padding: "2px 8px", color: "#D4AF37", fontWeight: 700 }}>最高利益</div>}
                <div style={{ position: "absolute", bottom: 0, left: 0, height: 3, width: `${barWidth}%`, background: data.gross_profit >= 0 ? "rgba(212,175,55,0.3)" : "rgba(255,80,80,0.3)" }} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 18 }}>{data.emoji}</span>
                    <div>
                      <div style={{ fontWeight: 700, color: "#F5F0E8", fontSize: 14 }}>{name}</div>
                      <div style={{ fontSize: 11, color: "#8A8278" }}>手数料 ¥{Math.round(data.platform_fees).toLocaleString()}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: data.gross_profit >= 0 ? "#D4AF37" : "#ff6666", fontFamily: "monospace" }}>¥{Math.round(data.gross_profit).toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: data.gross_profit >= 0 ? "#9A7D25" : "#ff9966" }}>{data.profit_rate.toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!results && !loading && (
        <div style={{ ...card, textAlign: "center", padding: 60, color: "#3a6a4a" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
          仕入れ価格と販売価格を入力すると<br />全プラットフォームの利益を比較できます
        </div>
      )}
    </div>
  );
}

/* ── 数量シミュレーションタブ ── */
function BulkSimTab({ domestic, overseas }: { domestic: [string, PlatformInfo][]; overseas: [string, PlatformInfo][] }) {
  const [form, setForm] = useState({
    purchase_price: "", purchase_shipping: "", selling_price: "",
    selling_platform: "メルカリ", quantity: "10",
  });
  const [perItem, setPerItem] = useState<ProfitResult | null>(null);
  const [loading, setLoading] = useState(false);

  const recalc = useCallback(async (f: typeof form) => {
    if (!f.purchase_price || !f.selling_price || !f.quantity) { setPerItem(null); return; }
    setLoading(true);
    try {
      const r = await calcProfit({
        purchase_price: Number(f.purchase_price),
        selling_price: Number(f.selling_price),
        purchase_shipping: Number(f.purchase_shipping) || 0,
        selling_platform: f.selling_platform,
      });
      setPerItem(r);
    } catch { setPerItem(null); }
    finally { setLoading(false); }
  }, []);

  const upd = (key: keyof typeof form, val: string) => { const n = { ...form, [key]: val }; setForm(n); recalc(n); };

  const qty = Number(form.quantity) || 0;
  const totalCost = qty * ((Number(form.purchase_price) || 0) + (Number(form.purchase_shipping) || 0));
  const profitPerItem = perItem ? perItem.gross_profit : 0;

  // 損益分岐点
  const breakEvenQty = perItem && profitPerItem > 0
    ? Math.ceil((Number(form.purchase_price) + (Number(form.purchase_shipping) || 0)) / profitPerItem)
    : null;

  const SCENARIOS = [30, 50, 70, 100];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#C8C0B0", marginBottom: 4 }}>📦 数量シミュレーション</div>
          <div style={{ fontSize: 12, color: "#8A8278", marginBottom: 16 }}>N個仕入れて何%売れた場合の利益を試算します</div>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>販売プラットフォーム</label>
            <select style={{ ...inp, fontSize: 13 }} value={form.selling_platform} onChange={e => upd("selling_platform", e.target.value)}>
              <optgroup label="国内">{domestic.map(([k, v]) => <option key={k} value={k}>{v.emoji} {k}</option>)}</optgroup>
              <optgroup label="海外">{overseas.map(([k, v]) => <option key={k} value={k}>{v.emoji} {k}</option>)}</optgroup>
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={lbl}>仕入れ価格 (円)</label><input type="number" style={inp} value={form.purchase_price} onChange={e => upd("purchase_price", e.target.value)} placeholder="0" /></div>
            <div><label style={lbl}>仕入れ送料 (円)</label><input type="number" style={inp} value={form.purchase_shipping} onChange={e => upd("purchase_shipping", e.target.value)} placeholder="0" /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>販売価格 (円)</label><input type="number" style={inp} value={form.selling_price} onChange={e => upd("selling_price", e.target.value)} placeholder="0" /></div>
            <div><label style={lbl}>仕入れ数量 (個)</label><input type="number" style={inp} value={form.quantity} onChange={e => upd("quantity", e.target.value)} placeholder="10" min="1" /></div>
          </div>
        </div>

        {perItem && (
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#C8C0B0", marginBottom: 12 }}>1個あたりの利益</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8, padding: "6px 0", borderBottom: "1px solid rgba(212,175,55,0.06)" }}>
              <span style={{ color: "#a8d8b8" }}>純利益</span>
              <span style={{ fontFamily: "monospace", fontWeight: 700, color: profitPerItem >= 0 ? "#D4AF37" : "#ff6666" }}>
                ¥{Math.round(profitPerItem).toLocaleString()}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: "1px solid rgba(212,175,55,0.06)" }}>
              <span style={{ color: "#a8d8b8" }}>利益率</span>
              <span style={{ fontFamily: "monospace", color: "#66ccff" }}>{perItem.profit_rate.toFixed(1)}%</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: "1px solid rgba(212,175,55,0.06)" }}>
              <span style={{ color: "#a8d8b8" }}>総投資額</span>
              <span style={{ fontFamily: "monospace", color: "#ffcc44" }}>¥{totalCost.toLocaleString()}</span>
            </div>
            {breakEvenQty && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0" }}>
                <span style={{ color: "#a8d8b8" }}>損益分岐点</span>
                <span style={{ fontFamily: "monospace", color: "#ff9966" }}>{breakEvenQty}個</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        {loading && <div style={{ ...card, textAlign: "center", padding: 40, color: "#8A8278" }}>計算中...</div>}

        {perItem && !loading && (
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#C8C0B0", marginBottom: 16 }}>販売率別シミュレーション ({qty}個仕入れ)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SCENARIOS.map(pct => {
                const sold = Math.floor(qty * pct / 100);
                const profit = sold * profitPerItem;
                const roi = totalCost > 0 ? profit / totalCost * 100 : 0;
                const isBreakEven = breakEvenQty !== null && sold >= breakEvenQty;
                return (
                  <div key={pct} style={{
                    background: profit >= 0 ? "rgba(212,175,55,0.04)" : "rgba(255,80,80,0.04)",
                    border: `1px solid ${profit >= 0 ? "rgba(212,175,55,0.18)" : "rgba(255,80,80,0.2)"}`,
                    borderRadius: 10,
                    padding: "12px 16px",
                    position: "relative",
                  }}>
                    {pct === 100 && <div style={{ position: "absolute", top: 8, right: 10, fontSize: 11, color: "#D4AF37", fontWeight: 700 }}>全量売却</div>}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#F5F0E8" }}>{pct}% 売れた場合</div>
                        <div style={{ fontSize: 12, color: "#8A8278", marginTop: 2 }}>
                          {sold}個販売 {isBreakEven ? <span style={{ color: "#D4AF37" }}>✓ 黒字</span> : breakEvenQty && sold < breakEvenQty ? <span style={{ color: "#ff9966" }}>あと{breakEvenQty - sold}個で黒字</span> : ""}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 20, fontWeight: 900, fontFamily: "monospace", color: profit >= 0 ? "#D4AF37" : "#ff6666" }}>
                          ¥{Math.round(profit).toLocaleString()}
                        </div>
                        <div style={{ fontSize: 11, color: "#8A8278" }}>ROI {roi.toFixed(1)}%</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 8, background: "rgba(0,0,0,0.2)", borderRadius: 4, height: 6, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: profit >= 0 ? "linear-gradient(90deg,#1e1608,#D4AF37)" : "linear-gradient(90deg,#500,#ff4444)", borderRadius: 4 }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {breakEvenQty && breakEvenQty <= qty && (
              <div style={{ marginTop: 12, fontSize: 12, color: "#8A8278", background: "rgba(212,175,55,0.04)", borderRadius: 8, padding: "8px 12px" }}>
                {qty}個中{breakEvenQty}個（{Math.ceil(breakEvenQty / qty * 100)}%）売れれば黒字になります
              </div>
            )}
          </div>
        )}

        {!perItem && !loading && (
          <div style={{ ...card, textAlign: "center", padding: 60, color: "#3a6a4a" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
            各項目を入力すると<br />数量シミュレーションが表示されます
          </div>
        )}
      </div>
    </div>
  );
}


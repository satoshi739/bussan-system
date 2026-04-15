"use client";

import RequirePlan from "@/components/RequirePlan";
import { useState, useCallback, useRef } from "react";
import { searchMarket, getPriceHistory, calcMaxPurchase } from "@/lib/api";
import { Search, ExternalLink, TrendingDown, TrendingUp, Minus, Camera, X, RefreshCw } from "lucide-react";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const card: React.CSSProperties = { background: "rgba(0,14,5,0.9)", border: "1px solid rgba(0,255,80,0.15)", borderRadius: 14, padding: "20px 24px" };
const inp: React.CSSProperties = { background: "rgba(0,12,4,0.95)", border: "1px solid rgba(0,255,80,0.3)", borderRadius: 8, color: "#e8f5eb", padding: "10px 14px", fontSize: 15, width: "100%", outline: "none" };

type MarketResult = { source: string; name: string; price: number; url: string; image: string; condition: string };
type Stats = { min: number; max: number; avg: number; count: number };
type HistoryRow = { date: string; avg_price: number; min_price: number; max_price: number; count: number };

const SELL_PLATFORMS = ["メルカリ", "Amazon", "ラクマ", "Yahoo!オークション", "Lazada", "eBay（輸出）"];

function SearchPageContent() {
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MarketResult[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [sellPlatform, setSellPlatform] = useState("メルカリ");
  const [targetRate, setTargetRate] = useState("20");
  const [maxPrice, setMaxPrice] = useState<number | null>(null);

  // 画像識別
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);
  const [imgError, setImgError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = useCallback(async (file: File) => {
    setImgError("");
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      setImgLoading(true);
      try {
        const res = await fetch(`${BASE}/api/image/identify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_data: dataUrl }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setKeyword(data.product_name);
        doSearch(data.product_name);
      } catch (e) {
        setImgError(String(e).includes("未設定") ? "Claude APIキーが未設定です（設定ページで登録）" : "識別に失敗しました");
      } finally {
        setImgLoading(false);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleImageUpload(file);
  }, [handleImageUpload]);

  const clearImage = () => {
    setImagePreview(null);
    setImgError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const doSearch = useCallback(async (kw: string) => {
    if (!kw.trim()) return;
    setLoading(true);
    setMaxPrice(null);
    try {
      const [market, hist] = await Promise.all([
        searchMarket(kw, 10),
        getPriceHistory(kw),
      ]);
      setResults(market.results);
      setStats(market.stats);
      setHistory(hist);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") doSearch(keyword);
  };

  const calcMax = async () => {
    if (!stats) return;
    const r = await calcMaxPurchase({ selling_price: stats.avg, target_profit_rate: Number(targetRate), selling_platform: sellPlatform });
    setMaxPrice(r.max_purchase_price);
  };

  const priceChange = history.length >= 2
    ? history[0].avg_price - history[history.length - 1].avg_price
    : null;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: "#e8f5eb", marginBottom: 6 }}>相場検索</h1>
      <div style={{ fontSize: 12, color: "#4a8a5a", marginBottom: 20 }}>メルカリ・ラクマ・Yahoo!オークションの現在価格を一括取得します</div>

      {/* 画像アップロード */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        style={{ marginBottom: 16, border: "1px dashed rgba(0,255,80,0.25)", borderRadius: 10, padding: "14px 16px", background: "rgba(0,12,4,0.7)", cursor: "pointer", position: "relative" }}
        onClick={() => !imagePreview && fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
        {imagePreview ? (
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src={imagePreview} alt="preview" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              {imgLoading && <div style={{ fontSize: 12, color: "#66ccff" }}>AI識別中...</div>}
              {imgError && <div style={{ fontSize: 12, color: "#ff6666" }}>{imgError}</div>}
              {!imgLoading && !imgError && keyword && <div style={{ fontSize: 12, color: "#00ff80" }}>識別完了: {keyword}</div>}
            </div>
            <button onClick={e => { e.stopPropagation(); clearImage(); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#8ab89a", padding: 4 }}><X size={16} /></button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#4a8a5a" }}>
            <Camera size={18} />
            <span style={{ fontSize: 12 }}>商品画像をドロップ、またはクリックしてアップロード（AIが商品名を識別します）</span>
          </div>
        )}
      </div>

      {/* 検索バー */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#4a8a5a" }} />
          <input style={{ ...inp, paddingLeft: 38 }} value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={handleKeyDown} placeholder="例: Nintendo Switch、iPhone 15、エアジョーダン..." autoFocus />
        </div>
        <button onClick={() => doSearch(keyword)} disabled={loading || !keyword} style={{ background: "linear-gradient(135deg,#004d1f,#006629)", border: "1px solid rgba(0,255,80,0.4)", borderRadius: 10, color: "#00ff80", padding: "10px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: loading || !keyword ? 0.5 : 1, whiteSpace: "nowrap" }}>
          {loading ? "検索中..." : "検索"}
        </button>
      </div>

      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
          {[
            { label: "最安値", value: `¥${stats.min.toLocaleString()}`, color: "#00ff80" },
            { label: "最高値", value: `¥${stats.max.toLocaleString()}`, color: "#ff9966" },
            { label: "平均価格", value: `¥${stats.avg.toLocaleString()}`, color: "#66ccff" },
            { label: "取得件数", value: `${stats.count} 件`, color: "#e8f5eb" },
          ].map(({ label, value, color }) => (
            <div key={label} style={card}>
              <div style={{ fontSize: 11, color: "#8ab89a", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color, fontFamily: "monospace" }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          {/* 最大仕入れ価格の逆算 */}
          <div style={{ ...card }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#b8dcc4", marginBottom: 12 }}>🎯 最大仕入れ価格（相場から逆算）</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: "#8ab89a", marginBottom: 4 }}>販売プラットフォーム</div>
                <select style={{ ...inp, fontSize: 13, padding: "7px 10px" }} value={sellPlatform} onChange={e => setSellPlatform(e.target.value)}>
                  {SELL_PLATFORMS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#8ab89a", marginBottom: 4 }}>目標利益率 (%)</div>
                <input type="number" style={{ ...inp, fontSize: 13, padding: "7px 10px" }} value={targetRate} onChange={e => setTargetRate(e.target.value)} />
              </div>
            </div>
            <button onClick={calcMax} style={{ width: "100%", background: "rgba(0,60,20,0.7)", border: "1px solid rgba(0,255,80,0.3)", borderRadius: 8, color: "#4ddc80", padding: "9px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
              平均価格({`¥${stats.avg.toLocaleString()}`})で計算
            </button>
            {maxPrice !== null && (
              <div style={{ marginTop: 14, textAlign: "center" }}>
                <div style={{ fontSize: 12, color: "#8ab89a", marginBottom: 4 }}>これより安く仕入れればOK</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: "#00ff80", fontFamily: "monospace" }}>¥{Math.floor(maxPrice).toLocaleString()}</div>
              </div>
            )}
          </div>

          {/* 価格履歴グラフ */}
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#b8dcc4" }}>📈 価格履歴</div>
              {priceChange !== null && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                  {priceChange > 0 ? <TrendingUp size={14} color="#ff6666" /> : priceChange < 0 ? <TrendingDown size={14} color="#00ff80" /> : <Minus size={14} color="#8ab89a" />}
                  <span style={{ color: priceChange > 0 ? "#ff6666" : priceChange < 0 ? "#00ff80" : "#8ab89a", fontWeight: 700 }}>
                    {priceChange > 0 ? "+" : ""}{priceChange.toLocaleString()}円
                  </span>
                </div>
              )}
            </div>
            {history.length === 0 ? (
              <div style={{ color: "#4a8a5a", textAlign: "center", padding: 30, fontSize: 12 }}>
                検索するたびに価格が記録されます<br />履歴が溜まるとグラフが表示されます
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={[...history].reverse()}>
                  <XAxis dataKey="date" tick={{ fill: "#8ab89a", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#8ab89a", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `¥${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: "#060f08", border: "1px solid rgba(0,255,80,0.3)", borderRadius: 8, color: "#e8f5eb", fontSize: 12 }} formatter={(v) => [`¥${Number(v).toLocaleString()}`, "平均"]} />
                  <Line type="monotone" dataKey="avg_price" stroke="#00ff80" strokeWidth={2} dot={{ fill: "#00ff80", r: 3 }} />
                  <Line type="monotone" dataKey="min_price" stroke="#4ddc80" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* 検索結果 */}
      {results.length > 0 && (
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#b8dcc4", marginBottom: 14 }}>検索結果（安い順）</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {results.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: i === 0 ? "rgba(0,255,80,0.05)" : "transparent", borderRadius: 8, border: i === 0 ? "1px solid rgba(0,255,80,0.15)" : "1px solid transparent" }}>
                {r.image && <img src={r.image} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} onError={e => (e.currentTarget.style.display = "none")} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "#e8f5eb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: "#4a8a5a", marginTop: 2 }}>{r.source}{r.condition && ` · ${r.condition}`}</div>
                </div>
                <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 16, color: i === 0 ? "#00ff80" : "#e8f5eb", flexShrink: 0 }}>
                  ¥{r.price.toLocaleString()}
                </div>
                {r.url && (
                  <a href={r.url} target="_blank" rel="noreferrer" style={{ color: "#4a8a5a", flexShrink: 0 }}><ExternalLink size={14} /></a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && results.length === 0 && keyword && (
        <div style={{ ...card, textAlign: "center", padding: 40, color: "#4a8a5a" }}>商品名を入力してEnterまたは検索ボタンを押してください</div>
      )}

      {!keyword && (
        <div style={{ ...card, textAlign: "center", padding: 60, color: "#3a6a4a" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 14, marginBottom: 8 }}>商品名を入力して相場を調べましょう</div>
          <div style={{ fontSize: 12 }}>メルカリ・ラクマ・Yahoo!オークションの現在価格を一括取得します</div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <RequirePlan requiredPlan="PRO" featureName="相場検索">
      <SearchPageContent />
    </RequirePlan>
  );
}

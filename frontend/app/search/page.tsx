"use client";

import RequirePlan from "@/components/RequirePlan";
import { useState, useCallback, useRef } from "react";
import { searchMarket, getPriceHistory, calcMaxPurchase } from "@/lib/api";
import { Search, Globe, ExternalLink, TrendingDown, TrendingUp, Minus, Camera, X, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const BASE = "/api/proxy";
const req = async <T,>(path: string, opts?: RequestInit): Promise<T> => {
  const r = await fetch(`${BASE}${path}`, { headers: { "Content-Type": "application/json" }, ...opts });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};

const card: React.CSSProperties = { background: "rgba(20,20,22,0.9)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 14, padding: "20px 24px" };
const inp: React.CSSProperties = { background: "rgba(10,10,11,0.95)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 8, color: "#F5F0E8", padding: "10px 14px", fontSize: 15, width: "100%", outline: "none", boxSizing: "border-box" as const };

// ─── 国内相場 型定義 ─────────────────────────────────────────
type MarketResult = { source: string; name: string; price: number; url: string; image: string; condition: string };
type Stats = { min: number; max: number; avg: number; count: number };
type HistoryRow = { date: string; avg_price: number; min_price: number; max_price: number; count: number };

// ─── グローバル 型定義 ────────────────────────────────────────
type GlobalItem = { name: string; price_local: number; price_jpy: number; url: string; image: string; condition: string };
type Profit = { net_profit_jpy: number; profit_rate: number; fee_jpy: number; intl_shipping: number; is_profitable: boolean; rating?: string };
type PlatformData = {
  platform_key: string; name: string; flag: string; currency: string; area: string; fee_rate: number;
  avg_price_local: number; min_price_local: number; max_price_local: number;
  avg_price_jpy: number; item_count: number; items: GlobalItem[]; profit?: Profit;
};
type SearchResult = { keyword: string; buy_price: number | null; platforms: PlatformData[] };

const SELL_PLATFORMS = ["メルカリ", "Amazon", "ラクマ", "Yahoo!オークション", "Lazada", "eBay（輸出）"];

const RATING_COLOR: Record<string, string> = {
  excellent: "#D4AF37", good: "#F0D060", ok: "#ffcc44", marginal: "#ff9944", loss: "#ff4444",
};
const RATING_LABEL: Record<string, string> = {
  excellent: "優秀", good: "良い", ok: "まあまあ", marginal: "ギリギリ", loss: "赤字",
};

function fmtPrice(price: number, currency: string) {
  if (currency === "JPY") return `¥${Math.round(price).toLocaleString()}`;
  const sym: Record<string, string> = {
    USD: "$", SGD: "S$", MYR: "RM", THB: "฿", PHP: "₱", IDR: "Rp", TWD: "NT$", GBP: "£", EUR: "€",
  };
  return `${sym[currency] ?? currency}${price.toLocaleString(undefined, { maximumFractionDigits: currency === "IDR" ? 0 : 2 })}`;
}

// ─── 画像アップロードUI（共通） ───────────────────────────────
function ImageUploadArea({
  imagePreview, imgLoading, imgError, keyword, fileRef,
  onDrop, onClick, onChange, onClear,
}: {
  imagePreview: string | null; imgLoading: boolean; imgError: string; keyword: string;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onDrop: (e: React.DragEvent) => void; onClick: () => void;
  onChange: (f: File) => void; onClear: () => void;
}) {
  return (
    <div
      onDrop={onDrop}
      onDragOver={e => e.preventDefault()}
      style={{ marginBottom: 16, border: "1px dashed rgba(212,175,55,0.25)", borderRadius: 10, padding: "14px 16px", background: "rgba(10,10,11,0.7)", cursor: "pointer", position: "relative" }}
      onClick={() => !imagePreview && onClick()}
    >
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && onChange(e.target.files[0])} />
      {imagePreview ? (
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src={imagePreview} alt="preview" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            {imgLoading && <div style={{ fontSize: 12, color: "#66ccff" }}>AI識別中...</div>}
            {imgError && <div style={{ fontSize: 12, color: "#ff6666" }}>{imgError}</div>}
            {!imgLoading && !imgError && keyword && <div style={{ fontSize: 12, color: "#D4AF37" }}>識別完了: {keyword}</div>}
          </div>
          <button onClick={e => { e.stopPropagation(); onClear(); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#8A8278", padding: 4 }}><X size={16} /></button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#8A8278" }}>
          <Camera size={18} />
          <span style={{ fontSize: 12 }}>商品画像をドロップ、またはクリックしてアップロード（AIが商品名を識別します）</span>
        </div>
      )}
    </div>
  );
}

// ─── グローバル: プラットフォーム行 ──────────────────────────
function PlatformRow({ p, rank, hasBuyPrice }: { p: PlatformData; rank: number; hasBuyPrice: boolean }) {
  const [open, setOpen] = useState(false);
  const profitColor = p.profit
    ? (RATING_COLOR[p.profit.rating ?? (p.profit.is_profitable ? "ok" : "loss")] ?? "#F5F0E8")
    : "#8A8278";

  return (
    <>
      <tr
        onClick={() => p.items.length > 0 && setOpen(!open)}
        style={{ cursor: p.items.length > 0 ? "pointer" : "default", borderBottom: "1px solid rgba(212,175,55,0.07)", background: open ? "rgba(212,175,55,0.03)" : "transparent", transition: "background 0.12s" }}
      >
        <td style={{ padding: "14px 10px", textAlign: "center", fontWeight: 700, color: rank <= 3 && hasBuyPrice ? "#D4AF37" : "#3a6a4a", width: 40 }}>
          {hasBuyPrice ? (rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank) : rank}
        </td>
        <td style={{ padding: "14px 10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>{p.flag}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#F5F0E8" }}>{p.name}</div>
              <div style={{ fontSize: 11, color: "#8A8278" }}>{p.area} · {(p.fee_rate * 100).toFixed(1)}%手数料</div>
            </div>
          </div>
        </td>
        <td style={{ padding: "14px 10px", textAlign: "right" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#66aaff" }}>{fmtPrice(p.min_price_local, p.currency)}</div>
          {p.currency !== "JPY" && <div style={{ fontSize: 11, color: "#8A8278" }}>≈ ¥{Math.round(p.items.find(i => i.price_local === p.min_price_local)?.price_jpy ?? 0).toLocaleString()}</div>}
        </td>
        <td style={{ padding: "14px 10px", textAlign: "right" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#F5F0E8" }}>{fmtPrice(p.avg_price_local, p.currency)}</div>
          {p.currency !== "JPY" && <div style={{ fontSize: 11, color: "#8A8278" }}>≈ ¥{p.avg_price_jpy.toLocaleString()}</div>}
          <div style={{ fontSize: 11, color: "#8A8278", marginTop: 2 }}>{p.item_count}件</div>
        </td>
        <td style={{ padding: "14px 10px", textAlign: "right", color: "#ff9944", fontSize: 14 }}>
          {fmtPrice(p.max_price_local, p.currency)}
        </td>
        {hasBuyPrice ? (
          <td style={{ padding: "14px 10px", textAlign: "right" }}>
            {p.profit ? (
              <>
                <div style={{ fontSize: 16, fontWeight: 800, color: profitColor }}>
                  {p.profit.net_profit_jpy >= 0 ? "+" : ""}¥{p.profit.net_profit_jpy.toLocaleString()}
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: profitColor, background: `${profitColor}18`, border: `1px solid ${profitColor}44`, borderRadius: 20, padding: "2px 8px", display: "inline-block", marginTop: 3 }}>
                  {p.profit.profit_rate > 0 ? "+" : ""}{p.profit.profit_rate}%{p.profit.rating && ` · ${RATING_LABEL[p.profit.rating]}`}
                </span>
              </>
            ) : <span style={{ color: "#3a6a4a", fontSize: 12 }}>—</span>}
          </td>
        ) : null}
        <td style={{ padding: "14px 10px", textAlign: "center", color: "#3a6a4a", width: 32 }}>
          {p.items.length > 0 && (open ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={hasBuyPrice ? 7 : 6} style={{ padding: "0 10px 16px", background: "rgba(212,175,55,0.02)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 10 }}>
              {p.items.map((item, idx) => (
                <a key={idx} href={item.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(10,10,11,0.7)", borderRadius: 8, padding: "8px 12px", textDecoration: "none", border: "1px solid rgba(212,175,55,0.08)" }}>
                  {item.image && <img src={item.image} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "#F5F0E8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                    {item.condition && <div style={{ fontSize: 11, color: "#8A8278" }}>{item.condition}</div>}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#66aaff" }}>{fmtPrice(item.price_local, p.currency)}</div>
                    {p.currency !== "JPY" && <div style={{ fontSize: 11, color: "#8A8278" }}>≈ ¥{Math.round(item.price_jpy).toLocaleString()}</div>}
                  </div>
                  <ExternalLink size={12} color="#3a6a4a" style={{ flexShrink: 0 }} />
                </a>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── メインコンポーネント ─────────────────────────────────────
function SearchPageContent() {
  const [tab, setTab] = useState<"domestic" | "global">("domestic");
  const [keyword, setKeyword] = useState("");

  // 国内相場 state
  const [domLoading, setDomLoading] = useState(false);
  const [domError, setDomError] = useState("");
  const [results, setResults] = useState<MarketResult[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [sellPlatform, setSellPlatform] = useState("メルカリ");
  const [targetRate, setTargetRate] = useState("20");
  const [maxPrice, setMaxPrice] = useState<number | null>(null);

  // グローバル state
  const [buyPrice, setBuyPrice] = useState("");
  const [globLoading, setGlobLoading] = useState(false);
  const [globResult, setGlobResult] = useState<SearchResult | null>(null);
  const [globError, setGlobError] = useState("");

  // 画像識別 state（共通）
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);
  const [imgError, setImgError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const clearImage = () => {
    setImagePreview(null);
    setImgError("");
    if (fileRef.current) fileRef.current.value = "";
  };

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
        if (tab === "domestic") doDomSearch(data.product_name);
        else doGlobSearch(data.product_name, buyPrice);
      } catch (e) {
        setImgError(String(e).includes("未設定") ? "Claude APIキーが未設定です（設定ページで登録）" : "識別に失敗しました");
      } finally {
        setImgLoading(false);
      }
    };
    reader.readAsDataURL(file);
  }, [tab, buyPrice]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleImageUpload(file);
  }, [handleImageUpload]);

  // ─── 国内相場 検索 ───────────────────────────────────────────
  const doDomSearch = useCallback(async (kw: string) => {
    if (!kw.trim()) return;
    setDomLoading(true);
    setDomError("");
    setMaxPrice(null);
    try {
      const [market, hist] = await Promise.all([searchMarket(kw, 10), getPriceHistory(kw)]);
      setResults(market.results);
      setStats(market.stats);
      setHistory(hist);
    } catch {
      setDomError("検索に失敗しました。APIサーバーが起動しているか確認してください。");
    } finally {
      setDomLoading(false);
    }
  }, []);

  const calcMax = async () => {
    if (!stats) return;
    const r = await calcMaxPurchase({ selling_price: stats.avg, target_profit_rate: Number(targetRate), selling_platform: sellPlatform });
    setMaxPrice(r.max_purchase_price);
  };

  const priceChange = history.length >= 2 ? history[0].avg_price - history[history.length - 1].avg_price : null;

  // ─── グローバル 検索 ─────────────────────────────────────────
  const doGlobSearch = useCallback(async (kw = keyword, bp = buyPrice) => {
    if (!kw.trim()) return;
    setGlobLoading(true);
    setGlobError("");
    setGlobResult(null);
    try {
      const data = await req<SearchResult>("/api/global/all-platforms", {
        method: "POST",
        body: JSON.stringify({ keyword: kw.trim(), buy_price_jpy: bp ? parseFloat(bp) : null, limit: 5 }),
      });
      setGlobResult(data);
    } catch {
      setGlobError("検索に失敗しました。APIサーバーが起動しているか確認してください。");
    } finally {
      setGlobLoading(false);
    }
  }, [keyword, buyPrice]);

  const hasBuyPrice = !!(globResult?.buy_price && globResult.buy_price > 0);
  const bestPlatform = hasBuyPrice ? globResult?.platforms.find(p => p.profit?.is_profitable) : globResult?.platforms[0];

  const handleSearch = () => {
    if (tab === "domestic") doDomSearch(keyword);
    else doGlobSearch(keyword, buyPrice);
  };

  const loading = tab === "domestic" ? domLoading : globLoading;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: "#F5F0E8", marginBottom: 4 }}>相場検索</h1>
      <div style={{ fontSize: 12, color: "#8A8278", marginBottom: 20 }}>国内・海外プラットフォームの現在価格を一括取得します</div>

      {/* タブ */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, borderBottom: "1px solid rgba(212,175,55,0.12)", paddingBottom: 0 }}>
        {([["domestic", "🇯🇵 国内相場", "メルカリ・ラクマ・Yahoo!オークション"], ["global", "🌏 全プラットフォーム比較", "国内＋海外を一括比較"]] as const).map(([key, label, sub]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "10px 18px", borderBottom: tab === key ? "2px solid #D4AF37" : "2px solid transparent",
              color: tab === key ? "#D4AF37" : "#8A8278", fontWeight: tab === key ? 700 : 500,
              fontSize: 13, transition: "all 0.15s", marginBottom: -1,
              display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2,
            }}
          >
            <span>{label}</span>
            <span style={{ fontSize: 10, fontWeight: 400, color: tab === key ? "#9A7D25" : "#3a5a4a" }}>{sub}</span>
          </button>
        ))}
      </div>

      {/* 画像アップロード */}
      <ImageUploadArea
        imagePreview={imagePreview} imgLoading={imgLoading} imgError={imgError} keyword={keyword}
        fileRef={fileRef} onDrop={handleDrop} onClick={() => fileRef.current?.click()}
        onChange={handleImageUpload} onClear={clearImage}
      />

      {/* 検索バー */}
      <div style={{ display: "flex", gap: 10, marginBottom: tab === "global" ? 12 : 24, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 2, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#8A8278" }} />
          <input
            style={{ ...inp, paddingLeft: 38 }}
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="例: Nintendo Switch、iPhone 15、ポケモンカード..."
            autoFocus
          />
        </div>
        {tab === "global" && (
          <div style={{ flex: 1, minWidth: 140 }}>
            <input
              style={inp}
              type="number"
              value={buyPrice}
              onChange={e => setBuyPrice(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="仕入れ価格（円）任意"
            />
          </div>
        )}
        <button
          onClick={handleSearch}
          disabled={loading || !keyword}
          style={{ background: "linear-gradient(135deg,#1e1608,#2a1e08)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 10, color: "#D4AF37", padding: "10px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: loading || !keyword ? 0.5 : 1, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 8 }}
        >
          {loading
            ? <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> 検索中...</>
            : tab === "domestic" ? <><Search size={14} /> 検索</> : <><Globe size={14} /> 全プラットフォーム検索</>}
        </button>
      </div>
      {tab === "global" && buyPrice && (
        <div style={{ fontSize: 12, color: "#8A8278", marginBottom: 20 }}>
          ✦ 仕入れ価格 ¥{parseInt(buyPrice).toLocaleString()} を入力中 — 各プラットフォームでの利益も計算します
        </div>
      )}

      {/* ══ 国内相場タブ ══ */}
      {tab === "domestic" && (
        <>
          {domError && <div style={{ ...card, borderColor: "rgba(255,80,80,0.3)", color: "#ff6644", marginBottom: 20 }}>{domError}</div>}
          {stats && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
              {[
                { label: "最安値",  value: `¥${stats.min.toLocaleString()}`, color: "#D4AF37" },
                { label: "最高値",  value: `¥${stats.max.toLocaleString()}`, color: "#ff9966" },
                { label: "平均価格", value: `¥${stats.avg.toLocaleString()}`, color: "#66ccff" },
                { label: "取得件数", value: `${stats.count} 件`,             color: "#F5F0E8" },
              ].map(({ label, value, color }) => (
                <div key={label} style={card}>
                  <div style={{ fontSize: 11, color: "#8A8278", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color, fontFamily: "monospace" }}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {stats && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <div style={card}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#C8C0B0", marginBottom: 12 }}>🎯 最大仕入れ価格（相場から逆算）</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#8A8278", marginBottom: 4 }}>販売プラットフォーム</div>
                    <select style={{ ...inp, fontSize: 13, padding: "7px 10px" }} value={sellPlatform} onChange={e => setSellPlatform(e.target.value)}>
                      {SELL_PLATFORMS.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#8A8278", marginBottom: 4 }}>目標利益率 (%)</div>
                    <input type="number" style={{ ...inp, fontSize: 13, padding: "7px 10px" }} value={targetRate} onChange={e => setTargetRate(e.target.value)} />
                  </div>
                </div>
                <button onClick={calcMax} style={{ width: "100%", background: "rgba(0,60,20,0.7)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 8, color: "#9A7D25", padding: "9px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                  平均価格（¥{stats.avg.toLocaleString()}）で計算
                </button>
                {maxPrice !== null && (
                  <div style={{ marginTop: 14, textAlign: "center" }}>
                    <div style={{ fontSize: 12, color: "#8A8278", marginBottom: 4 }}>これより安く仕入れればOK</div>
                    <div style={{ fontSize: 36, fontWeight: 900, color: "#D4AF37", fontFamily: "monospace" }}>¥{Math.floor(maxPrice).toLocaleString()}</div>
                  </div>
                )}
              </div>

              <div style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#C8C0B0" }}>📈 価格履歴</div>
                  {priceChange !== null && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                      {priceChange > 0 ? <TrendingUp size={14} color="#ff6666" /> : priceChange < 0 ? <TrendingDown size={14} color="#D4AF37" /> : <Minus size={14} color="#8A8278" />}
                      <span style={{ color: priceChange > 0 ? "#ff6666" : priceChange < 0 ? "#D4AF37" : "#8A8278", fontWeight: 700 }}>
                        {priceChange > 0 ? "+" : ""}{priceChange.toLocaleString()}円
                      </span>
                    </div>
                  )}
                </div>
                {history.length === 0 ? (
                  <div style={{ color: "#8A8278", textAlign: "center", padding: 30, fontSize: 12 }}>検索するたびに価格が記録されます<br />履歴が溜まるとグラフが表示されます</div>
                ) : (
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={[...history].reverse()}>
                      <XAxis dataKey="date" tick={{ fill: "#8A8278", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#8A8278", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `¥${(v / 1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={{ background: "#0a0a0b", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 8, color: "#F5F0E8", fontSize: 12 }} formatter={(v) => [`¥${Number(v).toLocaleString()}`, "平均"]} />
                      <Line type="monotone" dataKey="avg_price" stroke="#D4AF37" strokeWidth={2} dot={{ fill: "#D4AF37", r: 3 }} />
                      <Line type="monotone" dataKey="min_price" stroke="#9A7D25" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#C8C0B0", marginBottom: 14 }}>検索結果（安い順）</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {results.map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: i === 0 ? "rgba(212,175,55,0.05)" : "transparent", borderRadius: 8, border: i === 0 ? "1px solid rgba(212,175,55,0.15)" : "1px solid transparent" }}>
                    {r.image && <img src={r.image} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} onError={e => (e.currentTarget.style.display = "none")} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: "#F5F0E8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: "#8A8278", marginTop: 2 }}>{r.source}{r.condition && ` · ${r.condition}`}</div>
                    </div>
                    <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 16, color: i === 0 ? "#D4AF37" : "#F5F0E8", flexShrink: 0 }}>¥{r.price.toLocaleString()}</div>
                    {r.url && <a href={r.url} target="_blank" rel="noreferrer" style={{ color: "#8A8278", flexShrink: 0 }}><ExternalLink size={14} /></a>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!domLoading && results.length === 0 && keyword && (
            <div style={{ ...card, textAlign: "center", padding: 40, color: "#8A8278" }}>商品名を入力してEnterまたは検索ボタンを押してください</div>
          )}
          {!keyword && (
            <div style={{ ...card, textAlign: "center", padding: 60, color: "#3a6a4a" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
              <div style={{ fontSize: 14, marginBottom: 8 }}>商品名を入力して相場を調べましょう</div>
              <div style={{ fontSize: 12 }}>メルカリ・ラクマ・Yahoo!オークションの現在価格を一括取得します</div>
            </div>
          )}
        </>
      )}

      {/* ══ 全プラットフォームタブ ══ */}
      {tab === "global" && (
        <>
          {globError && <div style={{ ...card, borderColor: "rgba(255,80,80,0.3)", color: "#ff6644", marginBottom: 20 }}>{globError}</div>}

          {globLoading && (
            <div style={{ ...card, textAlign: "center", padding: "48px 24px" }}>
              <RefreshCw size={32} color="#D4AF37" style={{ animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
              <div style={{ color: "#F5F0E8", fontWeight: 700, fontSize: 16, marginBottom: 6 }}>全プラットフォームを検索中...</div>
              <div style={{ color: "#8A8278", fontSize: 13 }}>メルカリ・ヤフオク・ラクマ・eBay・Shopee・Lazada を同時に検索しています</div>
            </div>
          )}

          {globResult && !globLoading && (
            <>
              <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
                <div style={{ ...card, flex: 1, minWidth: 180, padding: "14px 20px" }}>
                  <div style={{ fontSize: 11, color: "#8A8278", marginBottom: 4 }}>検索キーワード</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#F5F0E8" }}>「{globResult.keyword}」</div>
                </div>
                <div style={{ ...card, flex: 1, minWidth: 160, padding: "14px 20px" }}>
                  <div style={{ fontSize: 11, color: "#8A8278", marginBottom: 4 }}>データ取得プラットフォーム</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#D4AF37" }}>{globResult.platforms.length} サイト</div>
                </div>
                {bestPlatform && (
                  <div style={{ ...card, flex: 2, minWidth: 260, padding: "14px 20px", borderColor: "rgba(212,175,55,0.4)" }}>
                    <div style={{ fontSize: 11, color: "#8A8278", marginBottom: 4 }}>
                      {hasBuyPrice ? "🥇 最も利益が出るプラットフォーム" : "💰 最も高く売れるプラットフォーム"}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 24 }}>{bestPlatform.flag}</span>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#D4AF37" }}>{bestPlatform.name}</div>
                        <div style={{ fontSize: 13, color: "#F5F0E8" }}>
                          平均 {fmtPrice(bestPlatform.avg_price_local, bestPlatform.currency)}
                          {bestPlatform.currency !== "JPY" && ` ≈ ¥${bestPlatform.avg_price_jpy.toLocaleString()}`}
                          {hasBuyPrice && bestPlatform.profit && (
                            <span style={{ color: "#D4AF37", fontWeight: 700, marginLeft: 10 }}>
                              利益 +¥{bestPlatform.profit.net_profit_jpy.toLocaleString()} ({bestPlatform.profit.profit_rate}%)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={card}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <TrendingUp size={16} color="#D4AF37" />
                  <span style={{ fontWeight: 700, color: "#F5F0E8", fontSize: 15 }}>
                    {hasBuyPrice ? "利益ランキング" : "販売相場一覧"}
                  </span>
                  <span style={{ fontSize: 12, color: "#8A8278" }}>
                    {hasBuyPrice ? `仕入れ ¥${parseInt(String(globResult.buy_price)).toLocaleString()} ベースで計算` : "行をクリックで実際の商品を確認"}
                  </span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(212,175,55,0.2)" }}>
                        <th style={{ padding: "8px 10px", color: "#8A8278", fontWeight: 600, textAlign: "center", width: 40 }}>#</th>
                        <th style={{ padding: "8px 10px", color: "#8A8278", fontWeight: 600, textAlign: "left" }}>プラットフォーム</th>
                        <th style={{ padding: "8px 10px", color: "#8A8278", fontWeight: 600, textAlign: "right" }}>最安値</th>
                        <th style={{ padding: "8px 10px", color: "#8A8278", fontWeight: 600, textAlign: "right" }}>平均価格</th>
                        <th style={{ padding: "8px 10px", color: "#8A8278", fontWeight: 600, textAlign: "right" }}>最高値</th>
                        {hasBuyPrice && <th style={{ padding: "8px 10px", color: "#8A8278", fontWeight: 600, textAlign: "right" }}>利益（推定）</th>}
                        <th style={{ width: 32 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {globResult.platforms.map((p, i) => (
                        <PlatformRow key={p.platform_key} p={p} rank={i + 1} hasBuyPrice={hasBuyPrice} />
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: 14, fontSize: 11, color: "#3a6a4a" }}>
                  * 行をクリックすると実際の商品一覧を表示 / 価格は現時点の相場 / 海外の利益には国際送料を含む
                </div>
              </div>
            </>
          )}

          {!globResult && !globLoading && !globError && (
            <div style={{ ...card, textAlign: "center", padding: "56px 24px", borderStyle: "dashed" }}>
              <Globe size={40} color="#1a4a2a" style={{ margin: "0 auto 16px" }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: "#8A8278", marginBottom: 8 }}>商品名を入力して検索してください</div>
              <div style={{ fontSize: 13, color: "#3a5a4a", marginBottom: 20 }}>
                日本（メルカリ・ヤフオク・ラクマ）と海外（eBay・Shopee・Lazada）の<br />現在の販売価格を同時に取得して比較します
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                {["Nintendo Switch", "ポケモンカード", "AirPods Pro", "LEGO"].map(kw => (
                  <button key={kw} onClick={() => { setKeyword(kw); doGlobSearch(kw, buyPrice); }}
                    style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 20, color: "#8A8278", padding: "6px 16px", fontSize: 13, cursor: "pointer" }}>
                    {kw}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function SearchPage() {
  return (
    <RequirePlan requiredPlan="STANDARD" featureName="相場検索">
      <SearchPageContent />
    </RequirePlan>
  );
}

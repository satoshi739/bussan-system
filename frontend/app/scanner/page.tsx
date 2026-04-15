"use client";

import RequirePlan from "@/components/RequirePlan";
import { useState, useCallback, useMemo } from "react";
import { Radar, Plus, Trash2, Play, ExternalLink, ShoppingCart, RefreshCw, Zap, SlidersHorizontal, TrendingUp, ArrowUpDown, X, Sparkles, ChevronDown, ChevronUp, BarChart2, Activity } from "lucide-react";

// ── おすすめジャンル ────────────────────────────────────────────────
const GENRES = [
  { keyword: "ノートパソコン 中古",          platform: "eBay",      maxPrice: 30000, label: "コンピュータ",         reason: "北米需要が高い",     color: "#66aaff" },
  { keyword: "フィルムカメラ 中古",          platform: "eBay",      maxPrice: 15000, label: "家電・AV・カメラ",      reason: "ヴィンテージ復活",   color: "#aaccff" },
  { keyword: "レコード LP 中古",            platform: "eBay",      maxPrice: 5000,  label: "音楽",                 reason: "アナログ人気再燃",   color: "#ff88cc" },
  { keyword: "初版本 漫画 希少",            platform: "eBay",      maxPrice: 5000,  label: "本・雑誌",              reason: "希少本は高値",       color: "#aa88ff" },
  { keyword: "VHS ビデオ レトロ",          platform: "eBay",      maxPrice: 3000,  label: "映画・ビデオ",          reason: "レトロ需要あり",     color: "#cc88ff" },
  { keyword: "ポケモンカード",              platform: "eBay",      maxPrice: 5000,  label: "おもちゃ・ゲーム",      reason: "海外需要 No.1",      color: "#ffcc44" },
  { keyword: "LEGO レゴ 廃盤",             platform: "eBay",      maxPrice: 12000, label: "ホビー・カルチャー",    reason: "廃番品が高値",       color: "#ffdd44" },
  { keyword: "骨董品 アンティーク",         platform: "eBay",      maxPrice: 20000, label: "アンティーク・コレクション", reason: "一品物は高利益", color: "#ddaa44" },
  { keyword: "アウトドア キャンプ 中古",    platform: "eBay",      maxPrice: 10000, label: "スポーツ・レジャー",    reason: "海外でも人気",       color: "#44ddaa" },
  { keyword: "ミニカー トミカ 旧車",        platform: "eBay",      maxPrice: 5000,  label: "自動車・オートバイ",    reason: "旧車ミニカー高値",   color: "#ff9944" },
  { keyword: "ブランド 財布 中古",          platform: "eBay",      maxPrice: 50000, label: "ファッション",          reason: "高利益率",           color: "#ff66aa" },
  { keyword: "腕時計 セイコー 中古",        platform: "eBay",      maxPrice: 20000, label: "アクセサリー・時計",    reason: "SEIKOは海外評価高",  color: "#00ff80" },
  { keyword: "美顔器 美容機器 中古",        platform: "Shopee_SG", maxPrice: 8000,  label: "ビューティー・ヘルスケア", reason: "アジア女性需要高",  color: "#ff88aa" },
  { keyword: "日本酒 ウイスキー 希少",      platform: "eBay",      maxPrice: 10000, label: "食品・飲料",            reason: "和酒は海外高値",     color: "#ffaa66" },
  { keyword: "陶器 花瓶 和風",             platform: "eBay",      maxPrice: 8000,  label: "住まい・インテリア",    reason: "和風インテリア人気", color: "#88ccaa" },
  { keyword: "ペット用品 国産 人気",        platform: "Shopee_SG", maxPrice: 5000,  label: "ペット・生き物",        reason: "アジアでペット急増", color: "#88ddcc" },
  { keyword: "万年筆 高級 中古",           platform: "eBay",      maxPrice: 10000, label: "事務・店舗用品",        reason: "文具コレクター多い", color: "#99aacc" },
  { keyword: "盆栽 道具 和",              platform: "eBay",      maxPrice: 8000,  label: "花・園芸",              reason: "BONSAI海外人気",     color: "#66cc88" },
  { keyword: "商品券 金券 未使用",         platform: "メルカリ",   maxPrice: 3000,  label: "チケット・金券",        reason: "額面以下で仕入れ可", color: "#cccc44" },
  { keyword: "ベビー おもちゃ 日本製",     platform: "Shopee_SG", maxPrice: 5000,  label: "ベビー用品",            reason: "日本製は安全性で人気",color: "#ffccaa" },
  { keyword: "アイドル グッズ 限定品",      platform: "eBay",      maxPrice: 5000,  label: "タレントグッズ",        reason: "限定品は稀少価値",   color: "#ff6699" },
  { keyword: "フィギュア アニメ 限定",      platform: "eBay",      maxPrice: 8000,  label: "コミック・アニメグッズ", reason: "コレクター需要高",  color: "#cc66ff" },
] as const;

const PLATFORMS = [
  { key: "eBay",               label: "eBay",       flag: "🌏" },
  { key: "Amazon.com",         label: "Amazon US",  flag: "🇺🇸" },
  { key: "Shopee_SG",          label: "Shopee SG",  flag: "🇸🇬" },
  { key: "Shopee_MY",          label: "Shopee MY",  flag: "🇲🇾" },
  { key: "Shopee_TH",          label: "Shopee TH",  flag: "🇹🇭" },
  { key: "Lazada_SG",          label: "Lazada SG",  flag: "🇸🇬" },
  { key: "Lazada_MY",          label: "Lazada MY",  flag: "🇲🇾" },
  { key: "メルカリ",             label: "メルカリ",   flag: "🏪" },
  { key: "Yahoo!オークション",   label: "ヤフオク",   flag: "🔨" },
  { key: "ラクマ",               label: "ラクマ",     flag: "🛍️" },
];

const RATING = {
  excellent: { label: "優秀",     color: "#00ff80", bg: "rgba(0,255,128,0.12)" },
  good:      { label: "良い",     color: "#66ffaa", bg: "rgba(102,255,170,0.1)" },
  ok:        { label: "まあまあ", color: "#ffcc44", bg: "rgba(255,204,68,0.1)" },
  marginal:  { label: "ギリギリ", color: "#ff9944", bg: "rgba(255,153,68,0.1)" },
  loss:      { label: "赤字",     color: "#ff4444", bg: "rgba(255,68,68,0.08)" },
};

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const api = async <T,>(path: string, opts?: RequestInit): Promise<T> => {
  const r = await fetch(`${BASE}${path}`, { headers: { "Content-Type": "application/json" }, ...opts });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};

const inp: React.CSSProperties = { background: "rgba(0,12,4,0.95)", border: "1px solid rgba(0,255,80,0.25)", borderRadius: 7, color: "#e8f5eb", padding: "8px 11px", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" };

type ScanKeyword = { keyword: string; target_sell_platform: string; max_buy_price: number | null; min_profit_rate: number; memo: string; last_scanned: string | null; best_profit_rate: number | null };
type ScanResult  = { name: string; buy_price: number; buy_url: string; buy_image: string; buy_source: string; condition: string; sell_platform: string; sell_platform_name: string; sell_platform_flag: string; sell_currency: string; est_sell_price_local: number; est_sell_price_jpy: number; net_profit_jpy: number; profit_rate: number; roi: number; intl_shipping_jpy: number; platform_fee_jpy: number; rating: string; score: number; scanned_at: string; scan_keyword?: string };
type DemandData  = { demand_score: number; market_prices: Record<string, { avg: number; avg_local?: number; min: number; max: number; count: number; flag: string; currency: string }>; velocity: { level: string; label: string; weekly: string; color: string }; total_listings: number; avg_market_jpy: number };
type DeepLink    = { label: string; flag: string; url: string; note: string; category: string; recommended: boolean; price_display: string };

// ── スコアゲージコンポーネント ──
function ScoreGauge({ score, color, profitRate, roi, netProfit, open, onToggle }: {
  score: number; color: string;
  profitRate: number; roi: number; netProfit: number;
  open: boolean; onToggle: () => void;
}) {
  const r = 18; const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const pt1 = +(profitRate * 1.5).toFixed(1);
  const pt2 = +(Math.min(roi, 60) * 0.5).toFixed(1);
  const pt3 = +Math.min(netProfit / 100, 20).toFixed(1);

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <svg width={44} height={44} style={{ cursor: "pointer", display: "block" }}
        onClick={e => { e.stopPropagation(); onToggle(); }}>
        <circle cx={22} cy={22} r={r} fill="none" stroke="rgba(0,255,80,0.08)" strokeWidth={4} />
        <circle cx={22} cy={22} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }} />
        <text x={22} y={26} textAnchor="middle" fontSize={11} fontWeight={800} fill={color}>{Math.round(score)}</text>
      </svg>

      {open && (
        <div style={{
          position: "absolute", top: 50, left: 0, zIndex: 100,
          background: "#050e07", border: `1px solid ${color}55`,
          borderRadius: 12, padding: "14px 16px", width: 220,
          boxShadow: "0 12px 32px rgba(0,0,0,0.7)",
        }} onClick={e => e.stopPropagation()}>
          <div style={{ fontSize: 12, fontWeight: 800, color, marginBottom: 10 }}>
            スコア {Math.round(score)} の計算内訳
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { label: "利益率",         formula: `${profitRate}% × 1.5`,                pt: pt1, note: "利益率を最重視", barW: Math.min(100, (pt1 / 60) * 100) },
              { label: "ROI",            formula: `min(${roi.toFixed(0)}%, 60) × 0.5`,   pt: pt2, note: "上限60%でキャップ", barW: Math.min(100, (pt2 / 30) * 100) },
              { label: "利益額ボーナス", formula: `min(¥${Math.round(netProfit)}÷100, 20)`, pt: pt3, note: "最大+20pt",  barW: Math.min(100, (pt3 / 20) * 100) },
            ].map(row => (
              <div key={row.label}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                  <div>
                    <span style={{ fontSize: 11, color: "#c0dcd0", fontWeight: 700 }}>{row.label}</span>
                    <span style={{ fontSize: 9, color: "#4a6a5a", fontFamily: "monospace", marginLeft: 6 }}>{row.formula}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 900, color, fontFamily: "monospace" }}>+{row.pt}</span>
                </div>
                <div style={{ height: 3, background: "rgba(0,255,80,0.08)", borderRadius: 2 }}>
                  <div style={{ height: "100%", width: `${row.barW}%`, background: color, borderRadius: 2, opacity: 0.7 }} />
                </div>
                <div style={{ fontSize: 9, color: "#3a6a4a", marginTop: 2 }}>{row.note}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${color}22`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 10, color: "#4a8a5a" }}>合計（最大 100）</span>
            <span style={{ fontSize: 18, fontWeight: 900, color, fontFamily: "monospace" }}>{Math.round(score)}</span>
          </div>

          <div style={{ marginTop: 8, fontSize: 9, color: "#3a5a4a", lineHeight: 1.5 }}>
            ※ 100点 = 利益率40%超 + ROI60%以上 + 利益¥2,000以上の理想的な商品
          </div>
        </div>
      )}
    </div>
  );
}

// ── 需要ゲージ ──
function DemandGauge({ score, color }: { score: number; color: string }) {
  const r = 13; const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width={32} height={32} style={{ display: "block" }}>
      <circle cx={16} cy={16} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3} />
      <circle cx={16} cy={16} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }} />
      <text x={16} y={20} textAnchor="middle" fontSize={8} fontWeight={800} fill={color}>{Math.round(score)}</text>
    </svg>
  );
}

// ── 利益バー ──
function ProfitBar({ rate, color }: { rate: number; color: string }) {
  const w = Math.max(0, Math.min(100, rate));
  return (
    <div style={{ height: 3, background: "rgba(0,255,80,0.08)", borderRadius: 2, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${w}%`, background: color, borderRadius: 2, transition: "width 0.5s ease" }} />
    </div>
  );
}

function ScannerPageContent() {
  const [keywords, setKeywords]     = useState<ScanKeyword[]>([]);
  const [results, setResults]       = useState<ScanResult[]>([]);
  const [scanning, setScanning]     = useState(false);
  const [scanMsg, setScanMsg]       = useState("");
  const [loaded, setLoaded]         = useState(false);

  // キーワード追加フォーム
  const [showAdd, setShowAdd]       = useState(false);
  const [newKw, setNewKw]           = useState("");
  const [newPlatform, setNewPlatform] = useState("eBay");
  const [newMaxPrice, setNewMaxPrice] = useState("");
  const [newMinRate, setNewMinRate]  = useState("20");

  // フィルター & ソート
  const [sortBy, setSortBy]         = useState<"score"|"profit"|"roi"|"price">("score");
  const [filterRating, setFilterRating] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");

  // スコア内訳
  const [openScore, setOpenScore]       = useState<number | null>(null);

  // 需要チェック
  const [demandData, setDemandData]     = useState<Record<number, DemandData & { loading: boolean }>>({});
  const [expandedDemand, setExpandedDemand] = useState<Set<number>>(new Set());

  // AI分析
  const [aiAnalysis, setAiAnalysis]     = useState<Record<number, { verdict: string; analysis: string; loading: boolean }>>({});
  const [expandedAi, setExpandedAi]     = useState<Set<number>>(new Set());

  // AI キーワード提案
  const [aiKwGenre, setAiKwGenre]       = useState("");
  const [aiKwLoading, setAiKwLoading]   = useState(false);
  const [aiKwSuggestions, setAiKwSuggestions] = useState<{ keyword: string; max_price: number; reason: string }[]>([]);

  // 出品モーダル
  const [listingItem, setListingItem]   = useState<ScanResult | null>(null);
  const [listingLinks, setListingLinks] = useState<Record<string, DeepLink>>({});
  const [listingLoading, setListingLoading] = useState(false);
  const [checked, setChecked]           = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    const [kws, res] = await Promise.all([
      api<ScanKeyword[]>("/api/scanner/keywords"),
      api<{ results: ScanResult[] }>("/api/scanner/results"),
    ]);
    setKeywords(kws);
    setResults(res.results || []);
    setLoaded(true);
  }, []);

  if (!loaded) { loadData(); }

  const runScan = async (keyword?: string, platform?: string) => {
    setScanning(true);
    setScanMsg(keyword ? `「${keyword}」をスキャン中...` : "全キーワードをスキャン中...");
    try {
      const p = new URLSearchParams();
      if (keyword) { p.set("keyword", keyword); p.set("platform", platform || "eBay"); }
      const r = await api<{ count: number; results: ScanResult[] }>(`/api/scanner/run?${p}`, { method: "POST" });
      setResults(r.results);
      setScanMsg(`完了 — ${r.count}件の利益候補を発見`);
    } catch (e) { setScanMsg("スキャン失敗: " + String(e)); }
    finally { setScanning(false); }
  };

  const addKeyword = async () => {
    if (!newKw.trim()) return;
    await api("/api/scanner/keywords", { method: "POST", body: JSON.stringify({ keyword: newKw.trim(), target_sell_platform: newPlatform, max_buy_price: newMaxPrice ? parseFloat(newMaxPrice) : null, min_profit_rate: parseFloat(newMinRate) || 20, memo: "" }) });
    setNewKw(""); setNewMaxPrice(""); setShowAdd(false);
    loadData();
  };

  const deleteKeyword = async (kw: string) => {
    await api(`/api/scanner/keywords/${encodeURIComponent(kw)}`, { method: "DELETE" });
    loadData();
  };

  const addFromGenre = async (g: typeof GENRES[number]) => {
    if (!keywords.find(k => k.keyword === g.keyword)) {
      await api("/api/scanner/keywords", { method: "POST", body: JSON.stringify({ keyword: g.keyword, target_sell_platform: g.platform, max_buy_price: g.maxPrice, min_profit_rate: 20, memo: g.reason }) });
      await loadData();
    }
    runScan(g.keyword, g.platform);
  };

  const runDemandCheck = async (item: ScanResult, idx: number) => {
    setDemandData(p => ({ ...p, [idx]: { ...p[idx], loading: true } as DemandData & { loading: boolean } }));
    setExpandedDemand(p => new Set([...p, idx]));
    try {
      const keyword = item.scan_keyword || item.name.split(" ").slice(0, 3).join(" ");
      const p = new URLSearchParams({ keyword, buy_price: String(item.buy_price), sell_platform: item.sell_platform });
      const r = await api<DemandData>(`/api/scanner/demand-check?${p}`, { method: "POST" });
      setDemandData(prev => ({ ...prev, [idx]: { ...r, loading: false } }));
    } catch (e) {
      setDemandData(prev => ({ ...prev, [idx]: { ...prev[idx], loading: false } }));
    }
  };

  const runAiAnalysis = async (item: ScanResult, idx: number) => {
    setAiAnalysis(p => ({ ...p, [idx]: { verdict: "", analysis: "", loading: true } }));
    setExpandedAi(p => new Set([...p, idx]));
    try {
      const r = await api<{ verdict: string; analysis: string }>("/api/ai/analyze", {
        method: "POST",
        body: JSON.stringify({
          product_name: item.name,
          buy_price: item.buy_price,
          est_sell_price_jpy: item.est_sell_price_jpy,
          net_profit_jpy: item.net_profit_jpy,
          profit_rate: item.profit_rate,
          roi: item.roi,
          sell_platform: item.sell_platform,
          sell_platform_name: item.sell_platform_name,
          buy_source: item.buy_source,
          condition: item.condition || "",
          scan_keyword: item.scan_keyword || "",
        }),
      });
      setAiAnalysis(p => ({ ...p, [idx]: { verdict: r.verdict, analysis: r.analysis, loading: false } }));
    } catch (e) {
      setAiAnalysis(p => ({ ...p, [idx]: { verdict: "error", analysis: String(e), loading: false } }));
    }
  };

  const runAiKeywords = async () => {
    if (!aiKwGenre.trim()) return;
    setAiKwLoading(true);
    try {
      const r = await api<{ suggestions: { keyword: string; max_price: number; reason: string }[] }>("/api/ai/suggest-keywords", {
        method: "POST",
        body: JSON.stringify({ genre: aiKwGenre, platform: "eBay", count: 8 }),
      });
      setAiKwSuggestions(r.suggestions);
    } catch (e) {
      console.error(e);
    } finally {
      setAiKwLoading(false);
    }
  };

  const openListing = async (item: ScanResult) => {
    setListingItem(item); setListingLoading(true); setChecked(new Set());
    try {
      const r = await api<{ deep_links: Record<string, DeepLink> }>("/api/flow/quick-purchase-list", { method: "POST", body: JSON.stringify({ product_name: item.name, buy_platform: item.buy_source, buy_price: item.buy_price, buy_url: item.buy_url, buy_date: new Date().toISOString().split("T")[0], sell_platform: item.sell_platform, weight_g: 500, target_profit_rate: 0.25 }) });
      setListingLinks(r.deep_links);
      setChecked(new Set(Object.entries(r.deep_links).filter(([,v]) => v.recommended).map(([k]) => k)));
    } catch(e) { console.error(e); }
    finally { setListingLoading(false); }
  };

  const openChecked = () => {
    Object.entries(listingLinks).filter(([k]) => checked.has(k)).forEach(([, l], i) => setTimeout(() => window.open(l.url, "_blank"), i * 300));
  };

  // フィルター & ソート適用
  const processed = useMemo(() => {
    let r = [...results];
    if (filterRating !== "all") r = r.filter(i => i.rating === filterRating);
    if (filterSource !== "all") r = r.filter(i => i.buy_source === filterSource);
    r.sort((a, b) => {
      if (sortBy === "score")  return b.score - a.score;
      if (sortBy === "profit") return b.net_profit_jpy - a.net_profit_jpy;
      if (sortBy === "roi")    return b.roi - a.roi;
      if (sortBy === "price")  return a.buy_price - b.buy_price;
      return 0;
    });
    return r;
  }, [results, filterRating, filterSource, sortBy]);

  const sources = useMemo(() => [...new Set(results.map(r => r.buy_source))], [results]);
  const bestProfit     = results.length ? Math.max(...results.map(r => r.profit_rate)) : 0;
  const avgRoi         = results.length ? results.reduce((s, r) => s + r.roi, 0) / results.length : 0;
  const totalPotential = results.reduce((s, r) => s + r.net_profit_jpy, 0);
  const totalBuyCost   = results.reduce((s, r) => s + r.buy_price, 0);

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto" }}>

      {/* ── ヘッダー ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <Radar size={22} color="#00ff80" />
            <h1 style={{ fontSize: 22, fontWeight: 900, color: "#e8f5eb", margin: 0 }}>利益スキャナー</h1>
          </div>
          <p style={{ fontSize: 12, color: "#4a8a5a", margin: 0 }}>
            仕入れサイトを自動巡回し、利益が出る商品だけをランキング表示
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {scanMsg && (
            <span style={{ fontSize: 12, color: scanning ? "#ffcc44" : "#4a8a5a" }}>
              {scanning && <RefreshCw size={11} style={{ display: "inline", marginRight: 5, animation: "spin 1s linear infinite" }} />}
              {scanMsg}
            </span>
          )}
          <button
            onClick={() => keywords.length > 0 ? runScan() : undefined}
            disabled={scanning || keywords.length === 0}
            style={{ display: "flex", alignItems: "center", gap: 7, background: scanning ? "rgba(0,255,80,0.05)" : "linear-gradient(135deg,#004d1f,#006629)", border: "1px solid rgba(0,255,80,0.4)", borderRadius: 9, color: scanning ? "#4a8a5a" : "#00ff80", padding: "10px 20px", fontWeight: 700, fontSize: 13, cursor: scanning || keywords.length === 0 ? "not-allowed" : "pointer" }}
          >
            {scanning ? <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> スキャン中</> : <><Radar size={14} /> 全キーワードをスキャン</>}
          </button>
        </div>
      </div>

      {/* ── 統計バー ── */}
      {results.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 16 }}>
          {[
            { label: "利益候補",       value: `${results.length}件`,                                    sub: `フィルター後: ${processed.length}件`, color: "#e8f5eb" },
            { label: "最高利益率",     value: `${bestProfit.toFixed(1)}%`,                              sub: "スキャン結果中のベスト",              color: "#00ff80" },
            { label: "平均 ROI",       value: `${avgRoi.toFixed(0)}%`,                                  sub: "全候補の平均",                        color: "#66aaff" },
            { label: "合計購入金額",   value: `¥${Math.round(totalBuyCost).toLocaleString()}`,          sub: "全候補の仕入れ合計",                  color: "#ff9966" },
            { label: "潜在利益合計",   value: `¥${Math.round(totalPotential).toLocaleString()}`,        sub: "全候補の純利益合計",                  color: "#00ffcc" },
          ].map(s => (
            <div key={s.label} style={{ background: "rgba(0,14,5,0.9)", border: "1px solid rgba(0,255,80,0.1)", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: "#4a8a5a", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: s.color, fontFamily: "monospace" }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "#3a6a4a", marginTop: 2 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── おすすめジャンル ── */}
      <div style={{ background: "rgba(0,14,5,0.9)", border: "1px solid rgba(0,255,80,0.12)", borderRadius: 12, padding: "14px 18px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
          <Zap size={14} color="#ffcc44" />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#d0e8d8" }}>おすすめジャンル</span>
          <span style={{ fontSize: 11, color: "#4a8a5a" }}>クリックで即スキャン</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {GENRES.map(g => {
            const added = keywords.some(k => k.keyword === g.keyword);
            return (
              <button key={g.keyword} onClick={() => addFromGenre(g)} disabled={scanning}
                style={{ display: "flex", alignItems: "center", gap: 7, background: added ? `${g.color}10` : "rgba(0,8,2,0.6)", border: `1px solid ${added ? g.color + "35" : "rgba(0,255,80,0.08)"}`, borderRadius: 7, padding: "6px 12px", cursor: scanning ? "not-allowed" : "pointer", transition: "all 0.15s" }}>
                <div style={{ width: 2, height: 18, borderRadius: 1, background: g.color, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: added ? g.color : "#b8d8c8", lineHeight: 1.2 }}>{g.label}</div>
                  <div style={{ fontSize: 9, color: "#3a6a4a" }}>{g.reason}</div>
                </div>
                {added && <div style={{ width: 4, height: 4, borderRadius: "50%", background: g.color }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── AIキーワード提案 ── */}
      <div style={{ background: "rgba(0,14,5,0.9)", border: "1px solid rgba(170,136,255,0.2)", borderRadius: 12, padding: "14px 18px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Sparkles size={14} color="#aa88ff" />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#d0e8d8" }}>AI キーワード提案</span>
          <span style={{ fontSize: 11, color: "#4a8a5a" }}>ジャンルを入力してAIが仕入れキーワードを提案</span>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: aiKwSuggestions.length > 0 ? 12 : 0 }}>
          <input
            style={{ ...inp, flex: 1 }}
            placeholder="例: カメラ、ポケモン、アニメフィギュア..."
            value={aiKwGenre}
            onChange={e => setAiKwGenre(e.target.value)}
            onKeyDown={e => e.key === "Enter" && runAiKeywords()}
          />
          <button
            onClick={runAiKeywords}
            disabled={aiKwLoading || !aiKwGenre.trim()}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(170,136,255,0.12)", border: "1px solid rgba(170,136,255,0.35)", borderRadius: 8, color: "#aa88ff", padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: aiKwLoading || !aiKwGenre.trim() ? "not-allowed" : "pointer", flexShrink: 0, opacity: aiKwLoading || !aiKwGenre.trim() ? 0.6 : 1 }}
          >
            {aiKwLoading ? <RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={12} />}
            {aiKwLoading ? "生成中..." : "AIに提案させる"}
          </button>
        </div>
        {aiKwSuggestions.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {aiKwSuggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => addFromGenre({ keyword: s.keyword, platform: "eBay", maxPrice: s.max_price, label: s.keyword, reason: s.reason, color: "#aa88ff" } as typeof GENRES[number])}
                disabled={scanning}
                style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(170,136,255,0.07)", border: "1px solid rgba(170,136,255,0.2)", borderRadius: 7, padding: "6px 12px", cursor: "pointer", transition: "all 0.15s" }}
              >
                <div style={{ width: 2, height: 18, borderRadius: 1, background: "#aa88ff", flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#c0b0e8", lineHeight: 1.2 }}>{s.keyword}</div>
                  <div style={{ fontSize: 9, color: "#6a5a8a" }}>{s.reason} · ¥{s.max_price.toLocaleString()}以下</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── キーワード管理 ── */}
      <div style={{ background: "rgba(0,14,5,0.9)", border: "1px solid rgba(0,255,80,0.12)", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: keywords.length > 0 ? 10 : 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#d0e8d8" }}>スキャンキーワード <span style={{ color: "#4a8a5a", fontWeight: 400 }}>({keywords.length}件)</span></span>
          <button onClick={() => setShowAdd(!showAdd)} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(0,255,80,0.08)", border: "1px solid rgba(0,255,80,0.25)", borderRadius: 7, color: "#00ff80", padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            <Plus size={12} /> キーワード追加
          </button>
        </div>

        {showAdd && (
          <div style={{ background: "rgba(0,8,2,0.8)", borderRadius: 8, padding: 12, marginBottom: 10, border: "1px solid rgba(0,255,80,0.12)", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 8, alignItems: "end" }}>
            <div>
              <div style={{ fontSize: 10, color: "#4a8a5a", marginBottom: 3 }}>キーワード</div>
              <input style={inp} placeholder="例: ポケモンカード" value={newKw} onChange={e => setNewKw(e.target.value)} onKeyDown={e => e.key === "Enter" && addKeyword()} autoFocus />
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#4a8a5a", marginBottom: 3 }}>販売先</div>
              <select style={inp} value={newPlatform} onChange={e => setNewPlatform(e.target.value)}>
                {PLATFORMS.map(p => <option key={p.key} value={p.key}>{p.flag} {p.label}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#4a8a5a", marginBottom: 3 }}>予算上限（円）</div>
              <input style={inp} type="number" placeholder="上限なし" value={newMaxPrice} onChange={e => setNewMaxPrice(e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#4a8a5a", marginBottom: 3 }}>最低利益率(%)</div>
              <input style={inp} type="number" value={newMinRate} onChange={e => setNewMinRate(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              <button onClick={addKeyword} style={{ background: "rgba(0,255,80,0.15)", border: "1px solid rgba(0,255,80,0.35)", borderRadius: 7, color: "#00ff80", padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>追加</button>
              <button onClick={() => setShowAdd(false)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: "#4a8a5a", padding: "8px 10px", cursor: "pointer" }}><X size={12} /></button>
            </div>
          </div>
        )}

        {keywords.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {keywords.map(kw => {
              const pf = PLATFORMS.find(p => p.key === kw.target_sell_platform);
              return (
                <div key={kw.keyword} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0,8,2,0.7)", border: "1px solid rgba(0,255,80,0.1)", borderRadius: 20, padding: "5px 10px 5px 12px" }}>
                  <span style={{ fontSize: 12, color: "#c0dcd0", fontWeight: 600 }}>{kw.keyword}</span>
                  <span style={{ fontSize: 10, color: "#4a6a5a" }}>{pf?.flag} {kw.target_sell_platform}</span>
                  {kw.best_profit_rate && <span style={{ fontSize: 10, color: "#00ff80", background: "rgba(0,255,80,0.1)", borderRadius: 10, padding: "1px 6px" }}>{kw.best_profit_rate.toFixed(1)}%</span>}
                  <button onClick={() => runScan(kw.keyword, kw.target_sell_platform)} disabled={scanning} style={{ background: "rgba(0,255,80,0.08)", border: "1px solid rgba(0,255,80,0.2)", borderRadius: 6, color: "#00ff80", padding: "2px 6px", cursor: "pointer", lineHeight: 1 }}>
                    <Play size={9} />
                  </button>
                  <button onClick={() => deleteKeyword(kw.keyword)} style={{ background: "transparent", border: "none", color: "#4a5a4a", cursor: "pointer", padding: "1px 3px", lineHeight: 1 }}>
                    <Trash2 size={10} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {keywords.length === 0 && !showAdd && (
          <div style={{ fontSize: 12, color: "#3a6a4a", textAlign: "center", padding: "12px 0" }}>
            上のジャンルをクリックするか、「キーワード追加」でスキャン対象を設定してください
          </div>
        )}
      </div>

      {/* ── フィルター & ソート ── */}
      {results.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <ArrowUpDown size={13} color="#4a8a5a" />
            <span style={{ fontSize: 11, color: "#4a8a5a" }}>並び替え</span>
            {(["score","profit","roi","price"] as const).map(s => (
              <button key={s} onClick={() => setSortBy(s)} style={{ padding: "4px 10px", borderRadius: 20, border: `1px solid ${sortBy===s ? "rgba(0,255,80,0.4)" : "rgba(0,255,80,0.1)"}`, background: sortBy===s ? "rgba(0,255,80,0.1)" : "transparent", color: sortBy===s ? "#00ff80" : "#6a9a7a", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                {{ score:"スコア", profit:"利益額", roi:"ROI", price:"仕入れ価格" }[s]}
              </button>
            ))}
          </div>
          <div style={{ width: 1, height: 20, background: "rgba(0,255,80,0.1)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <SlidersHorizontal size={13} color="#4a8a5a" />
            <span style={{ fontSize: 11, color: "#4a8a5a" }}>評価</span>
            {["all", "excellent", "good", "ok"].map(r => (
              <button key={r} onClick={() => setFilterRating(r)} style={{ padding: "4px 10px", borderRadius: 20, border: `1px solid ${filterRating===r ? "rgba(0,255,80,0.4)" : "rgba(0,255,80,0.1)"}`, background: filterRating===r ? "rgba(0,255,80,0.1)" : "transparent", color: filterRating===r ? "#00ff80" : "#6a9a7a", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                {r === "all" ? "すべて" : RATING[r as keyof typeof RATING]?.label}
              </button>
            ))}
          </div>
          {sources.length > 1 && (
            <>
              <div style={{ width: 1, height: 20, background: "rgba(0,255,80,0.1)" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: "#4a8a5a" }}>仕入れ元</span>
                <button onClick={() => setFilterSource("all")} style={{ padding: "4px 10px", borderRadius: 20, border: `1px solid ${filterSource==="all" ? "rgba(0,255,80,0.4)" : "rgba(0,255,80,0.1)"}`, background: filterSource==="all" ? "rgba(0,255,80,0.1)" : "transparent", color: filterSource==="all" ? "#00ff80" : "#6a9a7a", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>すべて</button>
                {sources.map(s => (
                  <button key={s} onClick={() => setFilterSource(s)} style={{ padding: "4px 10px", borderRadius: 20, border: `1px solid ${filterSource===s ? "rgba(0,255,80,0.4)" : "rgba(0,255,80,0.1)"}`, background: filterSource===s ? "rgba(0,255,80,0.1)" : "transparent", color: filterSource===s ? "#00ff80" : "#6a9a7a", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{s}</button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── スキャン結果グリッド ── */}
      {processed.length === 0 ? (
        <div style={{ background: "rgba(0,14,5,0.9)", border: "1px solid rgba(0,255,80,0.08)", borderRadius: 14, textAlign: "center", padding: "60px 0" }}>
          <Radar size={32} color="rgba(0,255,80,0.15)" style={{ margin: "0 auto 14px", display: "block" }} />
          <div style={{ fontSize: 13, color: "#4a8a5a" }}>
            {results.length > 0 ? "フィルター条件に一致する結果がありません" : "ジャンルを選ぶかキーワードを追加してスキャンを実行してください"}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {processed.map((item, i) => {
            const rt = RATING[item.rating as keyof typeof RATING] ?? RATING.ok;
            const rankColor = i === 0 ? "#ffd700" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "rgba(0,255,80,0.3)";
            const profitColor = item.net_profit_jpy >= 0 ? rt.color : "#ff4444";
            return (
              <div key={i} style={{ background: "rgba(0,14,5,0.95)", border: `1px solid ${i < 3 ? rankColor + "30" : "rgba(0,255,80,0.1)"}`, borderRadius: 14, padding: "18px 20px", position: "relative", overflow: "visible" }}
                onClick={() => setOpenScore(null)}>

                {/* 上部アクセントライン */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: i < 3 ? `linear-gradient(90deg, ${rankColor}, transparent)` : `linear-gradient(90deg, ${rt.color}44, transparent)` }} />

                {/* ランク + スコア + 評価 */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: rankColor, fontFamily: "monospace", minWidth: 24 }}>#{i+1}</div>
                    <ScoreGauge
                      score={item.score} color={rt.color}
                      profitRate={item.profit_rate} roi={item.roi} netProfit={item.net_profit_jpy}
                      open={openScore === i}
                      onToggle={() => setOpenScore(openScore === i ? null : i)}
                    />
                    <div>
                      <div style={{ fontSize: 10, color: "#4a8a5a" }}>スコア</div>
                      <div style={{ fontSize: 10, background: rt.bg, border: `1px solid ${rt.color}44`, borderRadius: 10, padding: "1px 8px", color: rt.color, fontWeight: 700 }}>{rt.label}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: "#4a8a5a" }}>販売先</div>
                    <div style={{ fontSize: 12, color: "#c0dcd0", fontWeight: 700 }}>{item.sell_platform_flag} {item.sell_platform_name}</div>
                  </div>
                </div>

                {/* 商品 */}
                <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                  {item.buy_image && (
                    <img src={item.buy_image} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, flexShrink: 0, border: "1px solid rgba(0,255,80,0.1)" }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "#e8f5eb", fontWeight: 700, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.name}</div>
                    <div style={{ fontSize: 10, color: "#4a8a5a", marginTop: 4, display: "flex", gap: 6 }}>
                      <span>{item.buy_source}</span>
                      {item.condition && <><span style={{ opacity: 0.5 }}>·</span><span>{item.condition}</span></>}
                      {item.scan_keyword && <><span style={{ opacity: 0.5 }}>·</span><span style={{ color: "#3a7a5a" }}>{item.scan_keyword}</span></>}
                    </div>
                  </div>
                </div>

                {/* 価格フロー */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, background: "rgba(0,0,0,0.25)", borderRadius: 8, padding: "8px 12px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 9, color: "#4a8a5a", marginBottom: 1 }}>仕入れ価格</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "#c0dcd0", fontFamily: "monospace" }}>¥{item.buy_price.toLocaleString()}</div>
                  </div>
                  <TrendingUp size={14} color={profitColor} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, textAlign: "right" }}>
                    <div style={{ fontSize: 9, color: "#4a8a5a", marginBottom: 1 }}>推定販売価格</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#66aaff", fontFamily: "monospace" }}>
                      {item.est_sell_price_local.toLocaleString(undefined, { maximumFractionDigits: 2 })} {item.sell_currency}
                    </div>
                    <div style={{ fontSize: 9, color: "#3a6a8a" }}>≈ ¥{item.est_sell_price_jpy.toLocaleString()}</div>
                  </div>
                </div>

                {/* 利益情報 */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
                  <div style={{ background: `${profitColor}0c`, border: `1px solid ${profitColor}22`, borderRadius: 7, padding: "7px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: "#4a8a5a" }}>純利益</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: profitColor, fontFamily: "monospace" }}>
                      {item.net_profit_jpy >= 0 ? "+" : ""}¥{Math.round(item.net_profit_jpy).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 7, padding: "7px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: "#4a8a5a" }}>利益率</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: rt.color }}>{item.profit_rate}%</div>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 7, padding: "7px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: "#4a8a5a" }}>ROI</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#66aaff" }}>{item.roi}%</div>
                  </div>
                </div>

                {/* 利益率バー */}
                <div style={{ marginBottom: 12 }}>
                  <ProfitBar rate={item.profit_rate} color={rt.color} />
                </div>

                {/* コスト内訳（小さく） */}
                <div style={{ display: "flex", gap: 10, marginBottom: 14, fontSize: 10, color: "#3a6a4a" }}>
                  <span>国際送料 ¥{item.intl_shipping_jpy.toLocaleString()}</span>
                  <span>手数料 ¥{item.platform_fee_jpy.toLocaleString()}</span>
                </div>

                {/* アクションボタン */}
                <div style={{ display: "flex", gap: 7, marginBottom: 8 }}>
                  {item.buy_url && (
                    <a href={item.buy_url} target="_blank" rel="noopener noreferrer"
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "rgba(102,170,255,0.08)", border: "1px solid rgba(102,170,255,0.2)", borderRadius: 8, color: "#66aaff", padding: "8px 0", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                      <ExternalLink size={12} /> 仕入れページ
                    </a>
                  )}
                  <button onClick={() => openListing(item)}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "linear-gradient(135deg,rgba(0,60,20,0.8),rgba(0,80,30,0.8))", border: "1px solid rgba(0,255,80,0.35)", borderRadius: 8, color: "#00ff80", padding: "8px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    <ShoppingCart size={12} /> 仕入れ＆出品
                  </button>
                  <button
                    onClick={() => demandData[i] ? setExpandedDemand(p => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; }) : runDemandCheck(item, i)}
                    style={{ display: "flex", alignItems: "center", gap: 5, background: demandData[i] && !demandData[i].loading ? "rgba(0,200,180,0.12)" : "rgba(0,200,180,0.05)", border: `1px solid ${demandData[i] ? "rgba(0,200,180,0.35)" : "rgba(0,200,180,0.15)"}`, borderRadius: 8, color: "#44ddcc", padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                    {demandData[i]?.loading ? <RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }} /> : <BarChart2 size={12} />}
                    相場
                    {demandData[i] && !demandData[i].loading && (expandedDemand.has(i) ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
                  </button>
                  <button
                    onClick={() => aiAnalysis[i] ? setExpandedAi(p => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; }) : runAiAnalysis(item, i)}
                    style={{ display: "flex", alignItems: "center", gap: 5, background: aiAnalysis[i]?.verdict === "buy" ? "rgba(170,136,255,0.15)" : "rgba(170,136,255,0.07)", border: `1px solid ${aiAnalysis[i] ? "rgba(170,136,255,0.4)" : "rgba(170,136,255,0.2)"}`, borderRadius: 8, color: "#aa88ff", padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                    {aiAnalysis[i]?.loading ? <RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={12} />}
                    AI
                    {aiAnalysis[i] && !aiAnalysis[i].loading && (expandedAi.has(i) ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
                  </button>
                </div>

                {/* 需要・相場チェック結果 */}
                {expandedDemand.has(i) && demandData[i] && !demandData[i].loading && (() => {
                  const d = demandData[i];
                  const dColor = d.demand_score >= 70 ? "#00ff80" : d.demand_score >= 45 ? "#ffcc44" : "#ff9944";
                  return (
                    <div style={{ background: "rgba(0,200,180,0.04)", border: "1px solid rgba(0,200,180,0.18)", borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
                      {/* ヘッダー：需要スコア + 売れやすさ */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                        <Activity size={13} color="#44ddcc" />
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#44ddcc" }}>需要・相場分析</span>
                        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                          {/* 需要スコアゲージ */}
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <DemandGauge score={d.demand_score} color={dColor} />
                            <div>
                              <div style={{ fontSize: 8, color: "#4a8a5a" }}>需要</div>
                              <div style={{ fontSize: 10, fontWeight: 800, color: dColor }}>スコア</div>
                            </div>
                          </div>
                          {/* 売れやすさバッジ */}
                          <div style={{ background: `${d.velocity.color}15`, border: `1px solid ${d.velocity.color}40`, borderRadius: 8, padding: "4px 10px", textAlign: "center" }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: d.velocity.color }}>{d.velocity.label}</div>
                            <div style={{ fontSize: 9, color: "#4a8a5a" }}>{d.velocity.weekly}</div>
                          </div>
                        </div>
                      </div>

                      {/* 他サイト相場比較テーブル */}
                      {Object.keys(d.market_prices).length > 0 ? (
                        <div>
                          <div style={{ fontSize: 9, color: "#3a8a7a", fontWeight: 700, marginBottom: 6, letterSpacing: "0.05em" }}>他サイト相場（平均価格）</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {Object.entries(d.market_prices).map(([platform, pdata]) => {
                              const avgJpy = pdata.avg || 0;
                              const ratio = avgJpy > 0 && item.buy_price > 0 ? avgJpy / item.buy_price : 0;
                              const ratioColor = ratio >= 1.3 ? "#00ff80" : ratio >= 1.1 ? "#ffcc44" : ratio > 1 ? "#ff9944" : "#ff6666";
                              return (
                                <div key={platform} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, background: "rgba(0,0,0,0.2)", borderRadius: 6, padding: "5px 8px" }}>
                                  <span style={{ fontSize: 13, flexShrink: 0 }}>{pdata.flag}</span>
                                  <span style={{ color: "#b0d0c0", fontWeight: 600, minWidth: 70 }}>{platform}</span>
                                  <span style={{ color: "#8ab89a", fontSize: 10, flexShrink: 0 }}>{pdata.count}件</span>
                                  <span style={{ marginLeft: "auto", fontFamily: "monospace", fontWeight: 700, color: "#c0dcd0" }}>
                                    ¥{avgJpy.toLocaleString()}
                                    {pdata.currency === "USD" && pdata.avg_local && (
                                      <span style={{ color: "#4a8a9a", fontSize: 9, marginLeft: 4 }}>(${pdata.avg_local.toFixed(2)})</span>
                                    )}
                                  </span>
                                  {ratio > 0 && (
                                    <span style={{ fontSize: 10, fontWeight: 800, color: ratioColor, minWidth: 38, textAlign: "right" }}>
                                      ×{ratio.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          {d.avg_market_jpy > 0 && (
                            <div style={{ marginTop: 8, fontSize: 10, color: "#4a8a5a", display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(0,200,180,0.1)", paddingTop: 6 }}>
                              <span>全サイト平均</span>
                              <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#44ddcc" }}>¥{d.avg_market_jpy.toLocaleString()}</span>
                              <span style={{ color: "#3a6a6a" }}>競合出品数 {d.total_listings}件</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: "#3a6a5a", textAlign: "center", padding: "8px 0" }}>
                          相場データを取得できませんでした
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* AI分析結果 */}
                {expandedAi.has(i) && aiAnalysis[i] && !aiAnalysis[i].loading && (
                  <div style={{ background: "rgba(170,136,255,0.05)", border: "1px solid rgba(170,136,255,0.2)", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <Sparkles size={12} color="#aa88ff" />
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#aa88ff" }}>AI判定</span>
                      <span style={{
                        fontSize: 11, borderRadius: 10, padding: "1px 8px", fontWeight: 700,
                        ...(aiAnalysis[i].verdict === "buy"   ? { background: "rgba(0,255,80,0.15)",  border: "1px solid rgba(0,255,80,0.4)",  color: "#00ff80" } :
                           aiAnalysis[i].verdict === "skip"  ? { background: "rgba(255,68,68,0.12)",  border: "1px solid rgba(255,68,68,0.3)",  color: "#ff6666" } :
                                                               { background: "rgba(255,204,68,0.12)", border: "1px solid rgba(255,204,68,0.3)", color: "#ffcc44" }),
                      }}>
                        {aiAnalysis[i].verdict === "buy" ? "買うべき" : aiAnalysis[i].verdict === "skip" ? "見送り" : "要検討"}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "#8ab89a", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                      {aiAnalysis[i].analysis}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── 出品モーダル ── */}
      {listingItem && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setListingItem(null); }}>
          <div style={{ background: "#050e07", border: "1px solid rgba(0,255,80,0.25)", borderRadius: 16, padding: 26, width: 560, maxHeight: "88vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ShoppingCart size={16} color="#00ff80" />
                <span style={{ fontWeight: 800, color: "#e8f5eb", fontSize: 15 }}>仕入れ & 出品</span>
              </div>
              <button onClick={() => setListingItem(null)} style={{ background: "none", border: "none", color: "#4a8a5a", cursor: "pointer" }}><X size={16} /></button>
            </div>

            <div style={{ background: "rgba(0,12,4,0.8)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, border: "1px solid rgba(0,255,80,0.1)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e8f5eb", marginBottom: 4, lineHeight: 1.4 }}>{listingItem.name}</div>
              <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                <span style={{ color: "#4a8a5a" }}>仕入れ <span style={{ color: "#e8f5eb", fontWeight: 700 }}>¥{listingItem.buy_price.toLocaleString()}</span></span>
                <span style={{ color: "#4a8a5a" }}>推定利益 <span style={{ color: "#00ff80", fontWeight: 700 }}>+¥{Math.round(listingItem.net_profit_jpy).toLocaleString()}</span></span>
              </div>
            </div>

            {listingLoading ? (
              <div style={{ textAlign: "center", color: "#4a8a5a", padding: "30px 0" }}>
                <RefreshCw size={22} style={{ animation: "spin 1s linear infinite", display: "block", margin: "0 auto 10px" }} />
                <div style={{ fontSize: 13 }}>仕入れ登録・価格計算中...</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 12, color: "#00ff80", marginBottom: 12, display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00ff80" }} />
                  仕入れをDBに登録しました
                </div>

                {/* 一括開くボタン */}
                <div style={{ display: "flex", gap: 7, marginBottom: 14 }}>
                  <button onClick={openChecked} disabled={checked.size === 0}
                    style={{ flex: 1, background: checked.size > 0 ? "linear-gradient(135deg,#004d1f,#006629)" : "rgba(0,255,80,0.04)", border: "1px solid rgba(0,255,80,0.3)", borderRadius: 8, color: checked.size > 0 ? "#00ff80" : "#3a6a4a", padding: "9px", fontWeight: 700, fontSize: 12, cursor: checked.size > 0 ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <ExternalLink size={12} /> チェックした {checked.size}件 をまとめて開く
                  </button>
                  <button onClick={() => setChecked(new Set(Object.keys(listingLinks)))} style={{ background: "rgba(0,255,80,0.06)", border: "1px solid rgba(0,255,80,0.15)", borderRadius: 8, color: "#4a9a5a", padding: "8px 11px", fontSize: 11, cursor: "pointer" }}>全選択</button>
                  <button onClick={() => setChecked(new Set())} style={{ background: "rgba(255,50,50,0.06)", border: "1px solid rgba(255,50,50,0.15)", borderRadius: 8, color: "#7a4a4a", padding: "8px 11px", fontSize: 11, cursor: "pointer" }}>解除</button>
                </div>

                {["国内", "海外"].map(cat => {
                  const links = Object.entries(listingLinks).filter(([,v]) => v.category === cat);
                  return (
                    <div key={cat} style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 10, color: "#4a6a5a", fontWeight: 700, marginBottom: 6, letterSpacing: "0.05em" }}>
                        {cat === "国内" ? "国内プラットフォーム" : "海外プラットフォーム"}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {links.map(([key, link]) => {
                          const isChecked = checked.has(key);
                          return (
                            <div key={key} onClick={() => setChecked(p => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; })}
                              style={{ display: "flex", alignItems: "center", gap: 10, background: isChecked ? "rgba(0,255,80,0.07)" : "rgba(0,8,2,0.6)", border: `1px solid ${isChecked ? "rgba(0,255,80,0.3)" : "rgba(0,255,80,0.08)"}`, borderRadius: 9, padding: "9px 13px", cursor: "pointer", transition: "all 0.12s" }}>
                              <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${isChecked ? "#00ff80" : "rgba(0,255,80,0.2)"}`, background: isChecked ? "rgba(0,255,80,0.2)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                {isChecked && <span style={{ fontSize: 10, color: "#00ff80", fontWeight: 900, lineHeight: 1 }}>✓</span>}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ fontSize: 13 }}>{link.flag}</span>
                                  <span style={{ fontSize: 12, color: "#d0e8d8", fontWeight: 600 }}>{link.label}</span>
                                  {link.recommended && <span style={{ fontSize: 9, background: "rgba(0,255,80,0.15)", border: "1px solid rgba(0,255,80,0.3)", borderRadius: 8, padding: "1px 5px", color: "#00ff80" }}>推奨</span>}
                                  {link.price_display && <span style={{ fontSize: 11, color: "#66aaff", marginLeft: "auto", fontWeight: 700 }}>{link.price_display}</span>}
                                </div>
                                <div style={{ fontSize: 10, color: "#3a6a4a", marginTop: 1 }}>{link.note}</div>
                              </div>
                              <a href={link.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: "#3a6a4a", padding: "3px 5px" }}>
                                <ExternalLink size={12} />
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                <div style={{ fontSize: 10, color: "#3a5a4a", textAlign: "center", marginTop: 8 }}>
                  出品完了後、出品管理からステータスを更新してください
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default function ScannerPage() {
  return (
    <RequirePlan requiredPlan="PRO" featureName="利益スキャナー">
      <ScannerPageContent />
    </RequirePlan>
  );
}

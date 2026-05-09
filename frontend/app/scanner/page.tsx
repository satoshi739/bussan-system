"use client";

import RequirePlan from "@/components/RequirePlan";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import { Radar, Plus, Trash2, Play, ExternalLink, ShoppingCart, RefreshCw, Zap, SlidersHorizontal, TrendingUp, ArrowUpDown, X, Sparkles, ChevronDown, ChevronUp, BarChart2, Activity, GitFork, Crown, Share2 } from "lucide-react";
import { toast } from "@/components/Toast";
import { errMsg } from "@/lib/errors";

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
  { keyword: "腕時計 セイコー 中古",        platform: "eBay",      maxPrice: 20000, label: "アクセサリー・時計",    reason: "SEIKOは海外評価高",  color: "#D4AF37" },
  { keyword: "美顔器 美容機器 中古",        platform: "Shopee_SG", maxPrice: 8000,  label: "ビューティー・ヘルスケア", reason: "アジア女性需要高",  color: "#ff88aa" },
  { keyword: "日本酒 ウイスキー 希少",      platform: "eBay",      maxPrice: 10000, label: "食品・飲料",            reason: "和酒は海外高値",     color: "#ffaa66" },
  { keyword: "陶器 花瓶 和風",             platform: "eBay",      maxPrice: 8000,  label: "住まい・インテリア",    reason: "和風インテリア人気", color: "#4ade80" },
  { keyword: "ペット用品 国産 人気",        platform: "Shopee_SG", maxPrice: 5000,  label: "ペット・生き物",        reason: "アジアでペット急増", color: "#4ade80" },
  { keyword: "万年筆 高級 中古",           platform: "eBay",      maxPrice: 10000, label: "事務・店舗用品",        reason: "文具コレクター多い", color: "#99aacc" },
  { keyword: "盆栽 道具 和",              platform: "eBay",      maxPrice: 8000,  label: "花・園芸",              reason: "BONSAI海外人気",     color: "#4ade80" },
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
  excellent: { label: "強くおすすめ",    color: "#D4AF37", bg: "rgba(212,175,55,0.12)" },
  good:      { label: "おすすめ",        color: "#F0D060", bg: "rgba(212,175,55,0.1)"  },
  ok:        { label: "普通",            color: "#ffcc44", bg: "rgba(255,204,68,0.1)"  },
  marginal:  { label: "やめた方がいい",  color: "#ff9944", bg: "rgba(255,153,68,0.1)" },
  loss:      { label: "やめた方がいい",  color: "#ff4444", bg: "rgba(255,68,68,0.08)" },
};

const RATING_STARS: Record<string, number> = {
  excellent: 5, good: 4, ok: 3, marginal: 2, loss: 1,
};

// サンプル表示用（スキャン前・未ログイン時）
const SAMPLE_SCAN_ITEMS = [
  { id: "s1", name: "セイコー 5 SNXS79 自動巻き 中古", buy: 4200,  sell: 12800, profit: 7800, rate: 61, rating: "excellent", source: "ヤフオク" },
  { id: "s2", name: "ポケモンカード 旧裏面 まとめ",    buy: 2800,  sell: 6500,  profit: 3200, rate: 49, rating: "good",      source: "メルカリ" },
  { id: "s3", name: "レゴ テクニック 42083 中古",      buy: 8500,  sell: 18900, profit: 9200, rate: 49, rating: "good",      source: "ヤフオク" },
];

const BASE = "/api/proxy";
const api = async <T,>(path: string, opts?: RequestInit): Promise<T> => {
  const r = await fetch(`${BASE}${path}`, { headers: { "Content-Type": "application/json" }, ...opts });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};

const inp: React.CSSProperties = { background: "rgba(10,10,11,0.95)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 7, color: "#F5F0E8", padding: "8px 11px", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" };

type ScanKeyword = { keyword: string; target_sell_platform: string; max_buy_price: number | null; min_profit_rate: number; memo: string; last_scanned: string | null; best_profit_rate: number | null };
type ScanResult  = { name: string; buy_price: number; buy_url: string; buy_image: string; buy_source: string; condition: string; sell_platform: string; sell_platform_name: string; sell_platform_flag: string; sell_currency: string; est_sell_price_local: number; est_sell_price_jpy: number; net_profit_jpy: number; profit_rate: number; roi: number; intl_shipping_jpy: number; platform_fee_jpy: number; rating: string; score: number; scanned_at: string; scan_keyword?: string; price_source?: string; amazon_market?: { median: number; avg: number; sample: number } };
type DemandData  = { demand_score: number; market_prices: Record<string, { avg: number; avg_local?: number; min: number; max: number; count: number; flag: string; currency: string }>; velocity: { level: string; label: string; weekly: string; color: string }; total_listings: number; avg_market_jpy: number };
type DeepLink    = { label: string; flag: string; url: string; note: string; category: string; recommended: boolean; price_display: string };

// 商品ごとの安定キー（フィルター後もindexがズレない）
const itemKey = (item: ScanResult): string =>
  item.buy_url ? item.buy_url : `${item.buy_source}::${item.buy_price}::${item.name}`;

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
        <circle cx={22} cy={22} r={r} fill="none" stroke="rgba(212,175,55,0.08)" strokeWidth={4} />
        <circle cx={22} cy={22} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }} />
        <text x={22} y={26} textAnchor="middle" fontSize={11} fontWeight={800} fill={color}>{Math.round(score)}</text>
      </svg>

      {open && (
        <div style={{
          position: "absolute", top: 50, left: 0, zIndex: 100,
          background: "#141414", border: `1px solid ${color}55`,
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
                    <span style={{ fontSize: 9, color: "#8A8278", fontFamily: "monospace", marginLeft: 6 }}>{row.formula}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 900, color, fontFamily: "monospace" }}>+{row.pt}</span>
                </div>
                <div style={{ height: 3, background: "rgba(212,175,55,0.08)", borderRadius: 2 }}>
                  <div style={{ height: "100%", width: `${row.barW}%`, background: color, borderRadius: 2, opacity: 0.7 }} />
                </div>
                <div style={{ fontSize: 9, color: "#3a6a4a", marginTop: 2 }}>{row.note}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${color}22`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 10, color: "#8A8278" }}>合計（最大 100）</span>
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
    <div style={{ height: 3, background: "rgba(212,175,55,0.08)", borderRadius: 2, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${w}%`, background: color, borderRadius: 2, transition: "width 0.5s ease" }} />
    </div>
  );
}

// ── Stars ────────────────────────────────────────────────
function ScanStars({ n }: { n: number }) {
  return <span style={{ color: "#D4AF37", fontSize: 13, letterSpacing: "0.06em" }}>{Array.from({ length: 5 }, (_, i) => i < n ? "★" : "☆").join("")}</span>;
}

// ── Sample Result Card ───────────────────────────────────
function SampleResultCard({ name, buy, sell, profit, rate, rating, source }: typeof SAMPLE_SCAN_ITEMS[0]) {
  const rt = RATING[rating as keyof typeof RATING] ?? RATING.ok;
  const stars = RATING_STARS[rating] ?? 3;
  return (
    <div style={{ background: "rgba(20,20,22,0.95)", border: `1px solid ${rt.color}30`, borderTop: `3px solid ${rt.color}`, borderRadius: 14, padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 10, background: rt.bg, border: `1px solid ${rt.color}44`, borderRadius: 10, padding: "2px 10px", color: rt.color, fontWeight: 800 }}>{rt.label}</span>
        <span style={{ fontSize: 10, color: "#8A8278" }}>{source}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#F5F0E8", marginBottom: 14, lineHeight: 1.5 }}>{name}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {([
          { label: "仕入れ",   val: `¥${buy.toLocaleString()}`,     col: "#c0dcd0" },
          { label: "販売",     val: `¥${sell.toLocaleString()}`,    col: "#66aaff" },
          { label: "想定利益", val: `+¥${profit.toLocaleString()}`, col: "#4ade80" },
          { label: "利益率",   val: `${rate}%`,                     col: rt.color  },
        ] as { label: string; val: string; col: string }[]).map(({ label, val, col }) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#8A8278" }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: col, fontFamily: "monospace" }}>{val}</span>
          </div>
        ))}
        <div style={{ borderTop: "1px solid rgba(212,175,55,0.08)", paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#8A8278" }}>おすすめ度</span>
          <ScanStars n={stars} />
        </div>
      </div>
    </div>
  );
}

function ScannerPageContent() {
  const [keywords, setKeywords]     = useState<ScanKeyword[]>([]);
  const [results, setResults]       = useState<ScanResult[]>([]);
  const [scanning, setScanning]     = useState(false);
  const [scanningKw, setScanningKw] = useState<Set<string>>(new Set());
  const [scanMsg, setScanMsg]       = useState("");
  const [slowWarning, setSlowWarning] = useState(false);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [quickKw, setQuickKw]       = useState("");
  const [quickPlatform, setQuickPlatform] = useState("eBay");

  // キーワード追加フォーム
  const [showAdd, setShowAdd]       = useState(false);
  const [newKw, setNewKw]           = useState("");
  const [newPlatform, setNewPlatform] = useState("eBay");
  const [newMaxPrice, setNewMaxPrice] = useState("");
  const [newMinRate, setNewMinRate]  = useState("20");

  // モード & ROIフィルター
  const [scanMode, setScanMode]     = useState<"global" | "domestic">("global");
  const [minRoi, setMinRoi]         = useState(0);

  // フィルター & ソート
  const [sortBy, setSortBy]         = useState<"score"|"profit"|"roi"|"price">("score");
  const [filterRating, setFilterRating] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");

  // スコア内訳（文字列キーでフィルター後もズレない）
  const [openScore, setOpenScore]       = useState<string | null>(null);

  // 需要チェック（文字列キー）
  const [demandData, setDemandData]     = useState<Record<string, DemandData & { loading: boolean }>>({});
  const [expandedDemand, setExpandedDemand] = useState<Set<string>>(new Set());

  // AI分析（文字列キー）
  const [aiAnalysis, setAiAnalysis]     = useState<Record<string, { verdict: string; analysis: string; loading: boolean }>>({});
  const [expandedAi, setExpandedAi]     = useState<Set<string>>(new Set());

  // AI キーワード提案
  const [aiKwGenre, setAiKwGenre]       = useState("");
  const [aiKwPlatform, setAiKwPlatform] = useState("eBay"); // AIキーワード提案のプラットフォーム
  const [aiKwLoading, setAiKwLoading]   = useState(false);
  const [aiKwSuggestions, setAiKwSuggestions] = useState<{ keyword: string; max_price: number; reason: string }[]>([]);

  // 出品モーダル
  const [listingItem, setListingItem]         = useState<ScanResult | null>(null);
  const [listingLinks, setListingLinks]       = useState<Record<string, DeepLink>>({});
  const [listingLoading, setListingLoading]   = useState(false);
  const [listingConfirmed, setListingConfirmed] = useState(false);   // 仕入れ登録済みフラグ
  const [listingRegistering, setListingRegistering] = useState(false); // 登録中フラグ
  const [checked, setChecked]                 = useState<Set<string>>(new Set());

  // ルートマトリックスモーダル
  type RouteEntry = { gross_profit: number; profit_rate: number; platform_fees: number; emoji: string; area: string };
  const [routeItem, setRouteItem]   = useState<ScanResult | null>(null);
  const [routeData, setRouteData]   = useState<Record<string, RouteEntry> | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const loadData = useCallback(async () => {
    const [kws, res] = await Promise.all([
      api<ScanKeyword[]>("/api/scanner/keywords"),
      api<{ results: ScanResult[] }>("/api/scanner/results"),
    ]);
    setKeywords(kws);
    setResults(res.results || []);
  }, []);

  const doQuickScan = async () => {
    const kw = quickKw.trim();
    if (!kw) return;
    setQuickKw("");
    if (scanMode === "global") {
      await api("/api/scanner/keywords", { method: "POST", body: JSON.stringify({ keyword: kw, target_sell_platform: quickPlatform, max_buy_price: null, min_profit_rate: 20, memo: "" }) }).catch(() => {});
      await loadData();
    }
    runScan(kw, quickPlatform);
  };

  // 初回ロード（useEffect内でのみ呼ぶ）
  useEffect(() => { loadData(); }, [loadData]);

  const runScan = async (keyword?: string, platform?: string, mode?: "global" | "domestic") => {
    const effectiveMode = mode ?? scanMode;
    if (keyword) {
      setScanningKw(p => new Set([...p, keyword]));
    } else {
      setScanning(true);
    }
    setScanMsg(keyword ? `「${keyword}」をスキャン中...` : "全キーワードをスキャン中...");
    setSlowWarning(false);
    slowTimerRef.current = setTimeout(() => setSlowWarning(true), 8000);
    try {
      let r: { count: number; results: ScanResult[] };
      if (effectiveMode === "domestic") {
        const p = new URLSearchParams({ sell_platform: "Amazon", min_profit_rate: "15", limit: "10" });
        if (keyword) p.set("keyword", keyword);
        r = await api<{ count: number; results: ScanResult[] }>(`/api/scanner/run-domestic?${p}`, { method: "POST" });
      } else {
        const p = new URLSearchParams();
        if (keyword) { p.set("keyword", keyword); p.set("platform", platform || "eBay"); }
        r = await api<{ count: number; results: ScanResult[] }>(`/api/scanner/run?${p}`, { method: "POST" });
      }
      if (keyword) {
        setResults(prev => [...prev.filter(item => item.scan_keyword !== keyword), ...r.results]);
      } else {
        setResults(r.results);
      }
      setScanMsg(`完了 — ${r.count}件の利益候補を発見`);
    } catch (e) {
      const msg = errMsg(e);
      setScanMsg("スキャン失敗: " + msg);
      toast(msg, "error");
      // エラー時は古い結果を残さずクリアする
      if (keyword) {
        setResults(prev => prev.filter(item => item.scan_keyword !== keyword));
      } else {
        setResults([]);
      }
    }
    finally {
      if (slowTimerRef.current) { clearTimeout(slowTimerRef.current); slowTimerRef.current = null; }
      setSlowWarning(false);
      if (keyword) {
        setScanningKw(p => { const n = new Set(p); n.delete(keyword); return n; });
      } else {
        setScanning(false);
      }
    }
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
    if (scanMode === "global" && !keywords.find(k => k.keyword === g.keyword)) {
      await api("/api/scanner/keywords", { method: "POST", body: JSON.stringify({ keyword: g.keyword, target_sell_platform: g.platform, max_buy_price: g.maxPrice, min_profit_rate: 20, memo: g.reason }) });
      await loadData();
    }
    runScan(g.keyword, g.platform, scanMode);
  };

  const runDemandCheck = async (item: ScanResult) => {
    const key = itemKey(item);
    setDemandData(p => ({ ...p, [key]: { ...p[key], loading: true } as DemandData & { loading: boolean } }));
    setExpandedDemand(p => new Set([...p, key]));
    try {
      const keyword = item.scan_keyword || item.name.split(" ").slice(0, 3).join(" ");
      const p = new URLSearchParams({ keyword, buy_price: String(item.buy_price), sell_platform: item.sell_platform });
      const r = await api<DemandData>(`/api/scanner/demand-check?${p}`, { method: "POST" });
      setDemandData(prev => ({ ...prev, [key]: { ...r, loading: false } }));
    } catch {
      setDemandData(prev => ({ ...prev, [key]: { ...prev[key], loading: false } }));
    }
  };

  const runAiAnalysis = async (item: ScanResult) => {
    const key = itemKey(item);
    setAiAnalysis(p => ({ ...p, [key]: { verdict: "", analysis: "", loading: true } }));
    setExpandedAi(p => new Set([...p, key]));
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
      setAiAnalysis(p => ({ ...p, [key]: { verdict: r.verdict, analysis: r.analysis, loading: false } }));
    } catch (e) {
      setAiAnalysis(p => ({ ...p, [key]: { verdict: "error", analysis: errMsg(e), loading: false } }));
      toast(errMsg(e), "error");
    }
  };

  const runAiKeywords = async () => {
    if (!aiKwGenre.trim()) return;
    setAiKwLoading(true);
    try {
      const r = await api<{ suggestions: { keyword: string; max_price: number; reason: string }[] }>("/api/ai/suggest-keywords", {
        method: "POST",
        body: JSON.stringify({ genre: aiKwGenre, platform: aiKwPlatform, count: 8 }),
      });
      setAiKwSuggestions(r.suggestions);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setAiKwLoading(false);
    }
  };

  // モーダルを開く: プレビューエンドポイントを使用（DB登録なし）
  const openListing = async (item: ScanResult) => {
    setListingItem(item);
    setListingLoading(true);
    setChecked(new Set());
    setListingConfirmed(false);
    setListingRegistering(false);
    try {
      const r = await api<{ deep_links: Record<string, DeepLink> }>("/api/flow/listing-preview", {
        method: "POST",
        body: JSON.stringify({
          product_name: item.name,
          buy_platform: item.buy_source,
          buy_price: item.buy_price,
          buy_url: item.buy_url || null,
          sell_platform: item.sell_platform,
          weight_g: 500,
          target_profit_rate: 0.25,
        }),
      });
      setListingLinks(r.deep_links);
      setChecked(new Set(Object.entries(r.deep_links).filter(([, v]) => v.recommended).map(([k]) => k)));
    } catch (e) { toast(errMsg(e), "error"); }
    finally { setListingLoading(false); }
  };

  // リンクだけ開く（DB登録なし）
  const openChecked = () => {
    Object.entries(listingLinks).filter(([k]) => checked.has(k)).forEach(([, l], i) => setTimeout(() => window.open(l.url, "_blank"), i * 300));
  };

  // 仕入れ登録してリンクを開く
  const confirmAndOpen = async () => {
    if (!listingItem) return;
    if (!listingConfirmed) {
      setListingRegistering(true);
      try {
        await api("/api/flow/quick-purchase-list", {
          method: "POST",
          body: JSON.stringify({
            product_name: listingItem.name,
            buy_platform: listingItem.buy_source,
            buy_price: listingItem.buy_price,
            buy_url: listingItem.buy_url || null,
            buy_date: new Date().toISOString().split("T")[0],
            sell_platform: listingItem.sell_platform,
            weight_g: 500,
            target_profit_rate: 0.25,
          }),
        });
        setListingConfirmed(true);
      } catch (e) {
        toast(errMsg(e), "error");
        return;
      } finally {
        setListingRegistering(false);
      }
    }
    openChecked();
  };

  const openRouteMatrix = async (item: ScanResult) => {
    setRouteItem(item);
    setRouteData(null);
    setRouteLoading(true);
    try {
      const r = await api<Record<string, { gross_profit: number; profit_rate: number; platform_fees: number; emoji: string; area: string }>>("/api/calc/all-platforms", {
        method: "POST",
        body: JSON.stringify({
          purchase_price: item.buy_price,
          purchase_shipping: item.intl_shipping_jpy ?? 0,
          selling_price: item.est_sell_price_jpy,
        }),
      });
      setRouteData(r);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setRouteLoading(false);
    }
  };

  // フィルター & ソート適用
  const processed = useMemo(() => {
    let r = [...results];
    if (filterRating !== "all") r = r.filter(i => i.rating === filterRating);
    if (filterSource !== "all") r = r.filter(i => i.buy_source === filterSource);
    if (minRoi > 0) r = r.filter(i => i.roi >= minRoi);
    r.sort((a, b) => {
      if (sortBy === "score")  return b.score - a.score;
      if (sortBy === "profit") return b.net_profit_jpy - a.net_profit_jpy;
      if (sortBy === "roi")    return b.roi - a.roi;
      if (sortBy === "price")  return a.buy_price - b.buy_price;
      return 0;
    });
    return r;
  }, [results, filterRating, filterSource, minRoi, sortBy]);

  const sources = useMemo(() => [...new Set(results.map(r => r.buy_source))], [results]);
  const bestProfit     = results.length ? Math.max(...results.map(r => r.profit_rate)) : 0;
  const avgRoi         = results.length ? results.reduce((s, r) => s + r.roi, 0) / results.length : 0;
  const totalPotential = results.reduce((s, r) => s + r.net_profit_jpy, 0);
  const totalBuyCost   = results.reduce((s, r) => s + r.buy_price, 0);

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto" }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes sk { 0%,100%{opacity:.9} 50%{opacity:.4} }
        .scan-card:hover { border-color: rgba(212,175,55,0.35) !important; }
        .scan-card { transition: border-color 0.15s; }
        @media (max-width: 768px) {
          .scanner-steps    { grid-template-columns: 1fr !important; }
          .scanner-stat-bar { grid-template-columns: repeat(2,1fr) !important; }
          .scanner-grid     { grid-template-columns: 1fr !important; }
          .scanner-sample   { grid-template-columns: 1fr !important; }
          .scanner-header   { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
          .scanner-quickbar { flex-direction: column !important; }
          .scanner-quickbar input { min-height: 44px; }
          .scanner-quickbar button { min-height: 44px; }
          .scan-info-grid   { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* ── 3ステップ ガイド ── */}
      <div style={{ background: "linear-gradient(135deg,rgba(20,20,22,0.9),rgba(26,20,10,0.9))", border: "1px solid rgba(212,175,55,0.18)", borderRadius: 14, padding: "18px 22px", marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#8A8278", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>使い方 — かんたん3ステップ</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }} className="scanner-steps">
          {([
            ["①", "商品名を入れる",     "下の入力欄にキーワードを入力"],
            ["②", "利益を調べる",       "ボタンを押すと仕入れ価格・利益を自動計算"],
            ["③", "おすすめか確認する", "スコアと判定で「買うべきか」がすぐわかる"],
          ] as [string, string, string][]).map(([step, title, desc]) => (
            <div key={step} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#D4AF37", lineHeight: 1, flexShrink: 0, minWidth: 28 }}>{step}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#F5F0E8", marginBottom: 3 }}>{title}</div>
                <div style={{ fontSize: 11, color: "#8A8278", lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── モード切り替え ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button
          onClick={() => setScanMode("global")}
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: scanMode === "global" ? "linear-gradient(135deg,#1e1608,#2a1e08)" : "rgba(10,10,11,0.6)", border: `1px solid ${scanMode === "global" ? "rgba(212,175,55,0.5)" : "rgba(212,175,55,0.15)"}`, borderRadius: 10, color: scanMode === "global" ? "#D4AF37" : "#5a5248", padding: "10px 0", fontSize: 13, fontWeight: 800, cursor: "pointer" }}
        >
          🌏 海外転売モード
        </button>
        <button
          onClick={() => setScanMode("domestic")}
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: scanMode === "domestic" ? "linear-gradient(135deg,#081a0e,#0a2412)" : "rgba(10,10,11,0.6)", border: `1px solid ${scanMode === "domestic" ? "rgba(74,222,128,0.5)" : "rgba(74,222,128,0.12)"}`, borderRadius: 10, color: scanMode === "domestic" ? "#4ade80" : "#3a6a4a", padding: "10px 0", fontSize: 13, fontWeight: 800, cursor: "pointer" }}
        >
          🏠 国内転売モード（Amazon実売価格）
        </button>
      </div>

      {/* ── クイック商品検索 ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#d0e8d8", marginBottom: 8 }}>商品名で利益を調べる</div>
        <div className="scanner-quickbar" style={{ display: "flex", gap: 8 }}>
          <input
            style={{ flex: 1, background: "rgba(10,10,11,0.95)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 10, color: "#F5F0E8", padding: "14px 16px", fontSize: 14, outline: "none", minHeight: 50 }}
            placeholder="例：スニーカー、カメラ、フィギュア、ゲーム機"
            value={quickKw}
            onChange={e => setQuickKw(e.target.value)}
            onKeyDown={e => e.key === "Enter" && doQuickScan()}
          />
          <select
            style={{ background: "rgba(10,10,11,0.95)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 10, color: "#F5F0E8", padding: "0 12px", fontSize: 13, outline: "none", flexShrink: 0 }}
            value={quickPlatform}
            onChange={e => setQuickPlatform(e.target.value)}
          >
            {PLATFORMS.map(p => <option key={p.key} value={p.key}>{p.flag} {p.label}</option>)}
          </select>
          <button
            onClick={doQuickScan}
            disabled={!quickKw.trim() || scanning}
            style={{ display: "flex", alignItems: "center", gap: 7, background: !quickKw.trim() ? "rgba(212,175,55,0.05)" : "linear-gradient(135deg,#1e1608,#2a1e08)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 10, color: !quickKw.trim() ? "#5a5248" : "#D4AF37", padding: "0 24px", fontSize: 14, fontWeight: 800, cursor: !quickKw.trim() ? "not-allowed" : "pointer", minHeight: 50, whiteSpace: "nowrap", letterSpacing: "0.03em" }}
          >
            <Radar size={16} /> 利益を調べる
          </button>
        </div>
      </div>

      {/* ── ヘッダー ── */}
      <div className="scanner-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <Radar size={22} color="#D4AF37" />
            <h1 style={{ fontSize: 22, fontWeight: 900, color: "#F5F0E8", margin: 0 }}>利益スキャナー</h1>
          </div>
          <p style={{ fontSize: 12, color: "#8A8278", margin: 0 }}>
            仕入れサイトを自動巡回し、利益が出る商品だけをランキング表示
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {scanMsg && (
            <span style={{ fontSize: 12, color: scanning ? "#ffcc44" : "#8A8278" }}>
              {scanning && <RefreshCw size={11} style={{ display: "inline", marginRight: 5, animation: "spin 1s linear infinite" }} />}
              {scanMsg}
              {slowWarning && (
                <span style={{ display: "block", fontSize: 11, color: "#8A8278", marginTop: 2 }}>
                  初回は少し時間がかかります。そのままお待ちください...
                </span>
              )}
            </span>
          )}
          <button
            onClick={() => keywords.length > 0 ? runScan() : undefined}
            disabled={scanning || keywords.length === 0}
            style={{ display: "flex", alignItems: "center", gap: 7, background: scanning ? "rgba(212,175,55,0.05)" : "linear-gradient(135deg,#1e1608,#2a1e08)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 9, color: scanning ? "#8A8278" : "#D4AF37", padding: "10px 20px", fontWeight: 700, fontSize: 13, cursor: scanning || keywords.length === 0 ? "not-allowed" : "pointer" }}
          >
            {scanning ? <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> スキャン中</> : <><Radar size={14} /> 全キーワードをスキャン</>}
          </button>
        </div>
      </div>

      {/* ── 統計バー ── */}
      {results.length > 0 && (
        <div className="scanner-stat-bar" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 16 }}>
          {[
            { label: "利益候補",       value: `${results.length}件`,                                    sub: `フィルター後: ${processed.length}件`, color: "#F5F0E8" },
            { label: "最高利益率",     value: `${bestProfit.toFixed(1)}%`,                              sub: "スキャン結果中のベスト",              color: "#D4AF37" },
            { label: "平均 ROI",       value: `${avgRoi.toFixed(0)}%`,                                  sub: "全候補の平均",                        color: "#66aaff" },
            { label: "合計購入金額",   value: `¥${Math.round(totalBuyCost).toLocaleString()}`,          sub: "全候補の仕入れ合計",                  color: "#ff9966" },
            { label: "潜在利益合計",   value: `¥${Math.round(totalPotential).toLocaleString()}`,        sub: "全候補の純利益合計",                  color: "#00ffcc" },
          ].map(s => (
            <div key={s.label} style={{ background: "rgba(20,20,22,0.9)", border: "1px solid rgba(212,175,55,0.1)", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: "#8A8278", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: s.color, fontFamily: "monospace" }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "#3a6a4a", marginTop: 2 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── おすすめジャンル ── */}
      <div style={{ background: "rgba(20,20,22,0.9)", border: "1px solid rgba(212,175,55,0.12)", borderRadius: 12, padding: "14px 18px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
          <Zap size={14} color="#ffcc44" />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#d0e8d8" }}>おすすめジャンル</span>
          <span style={{ fontSize: 11, color: "#8A8278" }}>クリックで即スキャン</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {GENRES.map(g => {
            const added = keywords.some(k => k.keyword === g.keyword);
            const isRunning = scanningKw.has(g.keyword);
            return (
              <button key={g.keyword} onClick={() => addFromGenre(g)} disabled={scanning || isRunning}
                style={{ display: "flex", alignItems: "center", gap: 7, background: added ? `${g.color}10` : "rgba(0,8,2,0.6)", border: `1px solid ${added ? g.color + "35" : "rgba(212,175,55,0.08)"}`, borderRadius: 7, padding: "6px 12px", cursor: scanning || isRunning ? "not-allowed" : "pointer", transition: "all 0.15s" }}>
                {isRunning
                  ? <RefreshCw size={10} color={g.color} style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} />
                  : <div style={{ width: 2, height: 18, borderRadius: 1, background: g.color, flexShrink: 0 }} />
                }
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
      <div style={{ background: "rgba(20,20,22,0.9)", border: "1px solid rgba(170,136,255,0.2)", borderRadius: 12, padding: "14px 18px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Sparkles size={14} color="#aa88ff" />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#d0e8d8" }}>AI キーワード提案</span>
          <span style={{ fontSize: 11, color: "#8A8278" }}>ジャンルを入力してAIが仕入れキーワードを提案</span>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: aiKwSuggestions.length > 0 ? 12 : 0 }}>
          <input
            style={{ ...inp, flex: 1 }}
            placeholder="例: カメラ、ポケモン、アニメフィギュア..."
            value={aiKwGenre}
            onChange={e => setAiKwGenre(e.target.value)}
            onKeyDown={e => e.key === "Enter" && runAiKeywords()}
          />
          <select
            style={{ ...inp, width: "auto", flexShrink: 0, padding: "8px 10px" }}
            value={aiKwPlatform}
            onChange={e => setAiKwPlatform(e.target.value)}
          >
            {PLATFORMS.map(p => <option key={p.key} value={p.key}>{p.flag} {p.label}</option>)}
          </select>
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
                onClick={() => addFromGenre({ keyword: s.keyword, platform: aiKwPlatform as typeof PLATFORMS[number]["key"], maxPrice: s.max_price, label: s.keyword, reason: s.reason, color: "#aa88ff" } as typeof GENRES[number])}
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
      <div style={{ background: "rgba(20,20,22,0.9)", border: "1px solid rgba(212,175,55,0.12)", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: keywords.length > 0 ? 10 : 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#d0e8d8" }}>スキャンキーワード <span style={{ color: "#8A8278", fontWeight: 400 }}>({keywords.length}件)</span></span>
          <button onClick={() => setShowAdd(!showAdd)} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 7, color: "#D4AF37", padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            <Plus size={12} /> キーワード追加
          </button>
        </div>

        {showAdd && (
          <div style={{ background: "rgba(0,8,2,0.8)", borderRadius: 8, padding: 12, marginBottom: 10, border: "1px solid rgba(212,175,55,0.12)", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 8, alignItems: "end" }}>
            <div>
              <div style={{ fontSize: 10, color: "#8A8278", marginBottom: 3 }}>キーワード</div>
              <input style={inp} placeholder="例: ポケモンカード" value={newKw} onChange={e => setNewKw(e.target.value)} onKeyDown={e => e.key === "Enter" && addKeyword()} autoFocus />
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#8A8278", marginBottom: 3 }}>販売先</div>
              <select style={inp} value={newPlatform} onChange={e => setNewPlatform(e.target.value)}>
                {PLATFORMS.map(p => <option key={p.key} value={p.key}>{p.flag} {p.label}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#8A8278", marginBottom: 3 }}>予算上限（円）</div>
              <input style={inp} type="number" placeholder="上限なし" value={newMaxPrice} onChange={e => setNewMaxPrice(e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#8A8278", marginBottom: 3 }}>最低利益率(%)</div>
              <input style={inp} type="number" value={newMinRate} onChange={e => setNewMinRate(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              <button onClick={addKeyword} style={{ background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.35)", borderRadius: 7, color: "#D4AF37", padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>追加</button>
              <button onClick={() => setShowAdd(false)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: "#8A8278", padding: "8px 10px", cursor: "pointer" }}><X size={12} /></button>
            </div>
          </div>
        )}

        {keywords.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {keywords.map(kw => {
              const pf = PLATFORMS.find(p => p.key === kw.target_sell_platform);
              const isKwScanning = scanningKw.has(kw.keyword);
              return (
                <div key={kw.keyword} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0,8,2,0.7)", border: "1px solid rgba(212,175,55,0.1)", borderRadius: 20, padding: "5px 10px 5px 12px" }}>
                  <span style={{ fontSize: 12, color: "#c0dcd0", fontWeight: 600 }}>{kw.keyword}</span>
                  <span style={{ fontSize: 10, color: "#8A8278" }}>{pf?.flag} {kw.target_sell_platform}</span>
                  {kw.best_profit_rate && <span style={{ fontSize: 10, color: "#D4AF37", background: "rgba(212,175,55,0.1)", borderRadius: 10, padding: "1px 6px" }}>{kw.best_profit_rate.toFixed(1)}%</span>}
                  {/* 個別スキャン: 全体スキャン中でも実行可能 */}
                  <button onClick={() => runScan(kw.keyword, kw.target_sell_platform)} disabled={isKwScanning} style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 6, color: "#D4AF37", padding: "2px 6px", cursor: isKwScanning ? "not-allowed" : "pointer", lineHeight: 1 }}>
                    {isKwScanning ? <RefreshCw size={9} style={{ animation: "spin 1s linear infinite" }} /> : <Play size={9} />}
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
            <ArrowUpDown size={13} color="#8A8278" />
            <span style={{ fontSize: 11, color: "#8A8278" }}>並び替え</span>
            {(["score","profit","roi","price"] as const).map(s => (
              <button key={s} onClick={() => setSortBy(s)} style={{ padding: "4px 10px", borderRadius: 20, border: `1px solid ${sortBy===s ? "rgba(212,175,55,0.4)" : "rgba(212,175,55,0.1)"}`, background: sortBy===s ? "rgba(212,175,55,0.1)" : "transparent", color: sortBy===s ? "#D4AF37" : "#6a9a7a", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                {{ score:"スコア", profit:"利益額", roi:"ROI", price:"仕入れ価格" }[s]}
              </button>
            ))}
          </div>
          <div style={{ width: 1, height: 20, background: "rgba(212,175,55,0.1)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <SlidersHorizontal size={13} color="#8A8278" />
            <span style={{ fontSize: 11, color: "#8A8278" }}>評価</span>
            {(["all", "excellent", "good", "ok", "marginal", "loss"] as const).map(r => (
              <button key={r} onClick={() => setFilterRating(r)} style={{ padding: "4px 10px", borderRadius: 20, border: `1px solid ${filterRating===r ? "rgba(212,175,55,0.4)" : "rgba(212,175,55,0.1)"}`, background: filterRating===r ? "rgba(212,175,55,0.1)" : "transparent", color: filterRating===r ? "#D4AF37" : "#6a9a7a", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                {r === "all" ? "すべて" : RATING[r as keyof typeof RATING]?.label}
              </button>
            ))}
          </div>
          {sources.length > 1 && (
            <>
              <div style={{ width: 1, height: 20, background: "rgba(212,175,55,0.1)" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: "#8A8278" }}>仕入れ元</span>
                <button onClick={() => setFilterSource("all")} style={{ padding: "4px 10px", borderRadius: 20, border: `1px solid ${filterSource==="all" ? "rgba(212,175,55,0.4)" : "rgba(212,175,55,0.1)"}`, background: filterSource==="all" ? "rgba(212,175,55,0.1)" : "transparent", color: filterSource==="all" ? "#D4AF37" : "#6a9a7a", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>すべて</button>
                {sources.map(s => (
                  <button key={s} onClick={() => setFilterSource(s)} style={{ padding: "4px 10px", borderRadius: 20, border: `1px solid ${filterSource===s ? "rgba(212,175,55,0.4)" : "rgba(212,175,55,0.1)"}`, background: filterSource===s ? "rgba(212,175,55,0.1)" : "transparent", color: filterSource===s ? "#D4AF37" : "#6a9a7a", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{s}</button>
                ))}
              </div>
            </>
          )}
          <div style={{ width: 1, height: 20, background: "rgba(212,175,55,0.1)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <TrendingUp size={13} color="#8A8278" />
            <span style={{ fontSize: 11, color: "#8A8278" }}>ROI最低</span>
            <select
              value={minRoi}
              onChange={e => setMinRoi(Number(e.target.value))}
              style={{ background: "rgba(10,10,11,0.95)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 20, color: minRoi > 0 ? "#D4AF37" : "#6a9a7a", padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", outline: "none" }}
            >
              <option value={0}>指定なし</option>
              <option value={30}>30% 以上</option>
              <option value={50}>50% 以上</option>
              <option value={100}>100% 以上</option>
            </select>
          </div>
        </div>
      )}

      {/* ── スキャン結果グリッド ── */}
      {processed.length === 0 && results.length === 0 && !scanning ? (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#d0e8d8" }}>利益候補サンプル</div>
              <div style={{ fontSize: 11, color: "#8A8278", marginTop: 2 }}>実際にスキャンした結果のサンプルです。上の検索欄に商品名を入れると実際の結果が表示されます</div>
            </div>
            <span style={{ fontSize: 10, color: "#5a5248", background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 5, padding: "2px 8px" }}>SAMPLE</span>
          </div>
          <div className="scanner-sample" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {SAMPLE_SCAN_ITEMS.map(item => <SampleResultCard key={item.id} {...item} />)}
          </div>
        </div>
      ) : processed.length === 0 ? (
        <div style={{ background: "rgba(20,20,22,0.9)", border: "1px solid rgba(212,175,55,0.08)", borderRadius: 14, textAlign: "center", padding: "60px 24px" }}>
          <div style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 50, width: 64, height: 64, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Radar size={28} color="rgba(212,175,55,0.5)" />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#C8C0B0", marginBottom: 8 }}>条件に一致する結果がありません</div>
          <div style={{ fontSize: 13, color: "#8A8278", lineHeight: 1.7 }}>フィルターを変更するか、新しいキーワードでスキャンしてください</div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 11, color: "#5a5248", background: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.1)", borderRadius: 7, padding: "6px 12px", marginBottom: 10 }}>
            表示価格はスキャン時点の参考値です。実際の価格は変動する場合があります。購入前に必ず現在の価格をご確認ください。
          </div>
        <div className="scanner-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {processed.map((item, i) => {
            const rt = RATING[item.rating as keyof typeof RATING] ?? RATING.ok;
            const rankColor = i === 0 ? "#ffd700" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "rgba(212,175,55,0.3)";
            const profitColor = item.net_profit_jpy >= 0 ? rt.color : "#ff4444";
            const key = itemKey(item);
            return (
              <div key={key} className="scan-card" style={{ background: "rgba(20,20,22,0.95)", border: `1px solid ${i < 3 ? rankColor + "30" : "rgba(212,175,55,0.1)"}`, borderRadius: 14, padding: "18px 20px", position: "relative", overflow: "visible" }}
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
                      open={openScore === key}
                      onToggle={() => setOpenScore(openScore === key ? null : key)}
                    />
                    <div>
                      <div style={{ fontSize: 10, color: "#8A8278" }}>スコア</div>
                      <div style={{ fontSize: 10, background: rt.bg, border: `1px solid ${rt.color}44`, borderRadius: 10, padding: "1px 8px", color: rt.color, fontWeight: 700 }}>{rt.label}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: "#8A8278" }}>販売先</div>
                    <div style={{ fontSize: 12, color: "#c0dcd0", fontWeight: 700 }}>{item.sell_platform_flag} {item.sell_platform_name}</div>
                  </div>
                </div>

                {/* 商品 */}
                <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                  {item.buy_image && (
                    <Image src={item.buy_image} alt="" width={64} height={64} unoptimized style={{ objectFit: "cover", borderRadius: 8, flexShrink: 0, border: "1px solid rgba(212,175,55,0.1)" }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "#F5F0E8", fontWeight: 700, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.name}</div>
                    <div style={{ fontSize: 10, color: "#8A8278", marginTop: 4, display: "flex", gap: 6 }}>
                      <span>{item.buy_source}</span>
                      {item.condition && <><span style={{ opacity: 0.5 }}>·</span><span>{item.condition}</span></>}
                      {item.scan_keyword && <><span style={{ opacity: 0.5 }}>·</span><span style={{ color: "#3a7a5a" }}>{item.scan_keyword}</span></>}
                      {item.price_source === "実売価格(Amazon.co.jp)" && (
                        <span style={{ fontSize: 9, background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.4)", borderRadius: 8, padding: "1px 6px", color: "#4ade80", fontWeight: 700, flexShrink: 0 }}>実売価格</span>
                      )}
                      {item.scanned_at && (
                        <span style={{ opacity: 0.5 }}>取得: {new Date(item.scanned_at).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 価格フロー */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, background: "rgba(0,0,0,0.25)", borderRadius: 8, padding: "8px 12px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 9, color: "#8A8278", marginBottom: 1 }}>仕入れ価格</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "#c0dcd0", fontFamily: "monospace" }}>¥{item.buy_price.toLocaleString()}</div>
                  </div>
                  <TrendingUp size={14} color={profitColor} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, textAlign: "right" }}>
                    <div style={{ fontSize: 9, color: "#8A8278", marginBottom: 1 }}>推定販売価格</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#66aaff", fontFamily: "monospace" }}>
                      {item.est_sell_price_local.toLocaleString(undefined, { maximumFractionDigits: 2 })} {item.sell_currency}
                    </div>
                    <div style={{ fontSize: 9, color: "#3a6a8a" }}>≈ ¥{item.est_sell_price_jpy.toLocaleString()}</div>
                  </div>
                </div>

                {/* 利益情報 */}
                <div className="scan-info-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
                  <div style={{ background: `${profitColor}0c`, border: `1px solid ${profitColor}22`, borderRadius: 7, padding: "7px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: "#8A8278" }}>想定利益</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: profitColor, fontFamily: "monospace" }}>
                      {item.net_profit_jpy >= 0 ? "+" : ""}¥{Math.round(item.net_profit_jpy).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 7, padding: "7px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: "#8A8278" }}>利益率</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: rt.color }}>{item.profit_rate}%</div>
                  </div>
                  <div style={{ background: rt.bg, border: `1px solid ${rt.color}30`, borderRadius: 7, padding: "7px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: "#8A8278" }}>おすすめ度</div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: rt.color, marginTop: 2 }}>{rt.label}</div>
                    <div style={{ fontSize: 9, color: rt.color, marginTop: 1, letterSpacing: "0.05em" }}>
                      {Array.from({ length: 5 }, (_, ii) => ii < (RATING_STARS[item.rating] ?? 3) ? "★" : "☆").join("")}
                    </div>
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
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "linear-gradient(135deg,rgba(0,60,20,0.8),rgba(0,80,30,0.8))", border: "1px solid rgba(212,175,55,0.35)", borderRadius: 8, color: "#D4AF37", padding: "8px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    <ShoppingCart size={12} /> 仕入れ＆出品
                  </button>
                  <button onClick={() => openRouteMatrix(item)}
                    style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 8, color: "#D4AF37", padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                    <GitFork size={12} /> ルート
                  </button>
                  <button
                    onClick={() => {
                      const d = demandData[key];
                      if (d) {
                        setExpandedDemand(p => { const n = new Set(p); if (n.has(key)) { n.delete(key); } else { n.add(key); } return n; });
                      } else {
                        runDemandCheck(item);
                      }
                    }}
                    style={{ display: "flex", alignItems: "center", gap: 5, background: demandData[key] && !demandData[key].loading ? "rgba(0,200,180,0.12)" : "rgba(0,200,180,0.05)", border: `1px solid ${demandData[key] ? "rgba(0,200,180,0.35)" : "rgba(0,200,180,0.15)"}`, borderRadius: 8, color: "#44ddcc", padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                    {demandData[key]?.loading ? <RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }} /> : <BarChart2 size={12} />}
                    相場
                    {demandData[key] && !demandData[key].loading && (expandedDemand.has(key) ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
                  </button>
                  <button
                    onClick={() => {
                      const a = aiAnalysis[key];
                      if (a) {
                        setExpandedAi(p => { const n = new Set(p); if (n.has(key)) { n.delete(key); } else { n.add(key); } return n; });
                      } else {
                        runAiAnalysis(item);
                      }
                    }}
                    style={{ display: "flex", alignItems: "center", gap: 5, background: aiAnalysis[key]?.verdict === "buy" ? "rgba(170,136,255,0.15)" : "rgba(170,136,255,0.07)", border: `1px solid ${aiAnalysis[key] ? "rgba(170,136,255,0.4)" : "rgba(170,136,255,0.2)"}`, borderRadius: 8, color: "#aa88ff", padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                    {aiAnalysis[key]?.loading ? <RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={12} />}
                    AI
                    {aiAnalysis[key] && !aiAnalysis[key].loading && (expandedAi.has(key) ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
                  </button>
                </div>

                {/* 需要・相場チェック結果 */}
                {expandedDemand.has(key) && demandData[key] && !demandData[key].loading && (() => {
                  const d = demandData[key];
                  const dColor = d.demand_score >= 70 ? "#D4AF37" : d.demand_score >= 45 ? "#ffcc44" : "#ff9944";
                  return (
                    <div style={{ background: "rgba(0,200,180,0.04)", border: "1px solid rgba(0,200,180,0.18)", borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                        <Activity size={13} color="#44ddcc" />
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#44ddcc" }}>需要・相場分析</span>
                        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <DemandGauge score={d.demand_score} color={dColor} />
                            <div>
                              <div style={{ fontSize: 8, color: "#8A8278" }}>需要</div>
                              <div style={{ fontSize: 10, fontWeight: 800, color: dColor }}>スコア</div>
                            </div>
                          </div>
                          <div style={{ background: `${d.velocity.color}15`, border: `1px solid ${d.velocity.color}40`, borderRadius: 8, padding: "4px 10px", textAlign: "center" }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: d.velocity.color }}>{d.velocity.label}</div>
                            <div style={{ fontSize: 9, color: "#8A8278" }}>{d.velocity.weekly}</div>
                          </div>
                        </div>
                      </div>

                      {Object.keys(d.market_prices).length > 0 ? (
                        <div>
                          <div style={{ fontSize: 9, color: "#3a8a7a", fontWeight: 700, marginBottom: 6, letterSpacing: "0.05em" }}>他サイト相場（平均価格）</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {Object.entries(d.market_prices).map(([platform, pdata]) => {
                              const avgJpy = pdata.avg || 0;
                              const ratio = avgJpy > 0 && item.buy_price > 0 ? avgJpy / item.buy_price : 0;
                              const ratioColor = ratio >= 1.3 ? "#D4AF37" : ratio >= 1.1 ? "#ffcc44" : ratio > 1 ? "#ff9944" : "#ff6666";
                              return (
                                <div key={platform} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, background: "rgba(0,0,0,0.2)", borderRadius: 6, padding: "5px 8px" }}>
                                  <span style={{ fontSize: 13, flexShrink: 0 }}>{pdata.flag}</span>
                                  <span style={{ color: "#b0d0c0", fontWeight: 600, minWidth: 70 }}>{platform}</span>
                                  <span style={{ color: "#8A8278", fontSize: 10, flexShrink: 0 }}>{pdata.count}件</span>
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
                            <div style={{ marginTop: 8, fontSize: 10, color: "#8A8278", display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(0,200,180,0.1)", paddingTop: 6 }}>
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
                {expandedAi.has(key) && aiAnalysis[key] && !aiAnalysis[key].loading && (
                  <div style={{ background: "rgba(170,136,255,0.05)", border: "1px solid rgba(170,136,255,0.2)", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <Sparkles size={12} color="#aa88ff" />
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#aa88ff" }}>AI判定</span>
                      <span style={{
                        fontSize: 11, borderRadius: 10, padding: "1px 8px", fontWeight: 700,
                        ...(aiAnalysis[key].verdict === "buy"   ? { background: "rgba(212,175,55,0.15)",  border: "1px solid rgba(212,175,55,0.4)",  color: "#D4AF37" } :
                           aiAnalysis[key].verdict === "skip"  ? { background: "rgba(255,68,68,0.12)",  border: "1px solid rgba(255,68,68,0.3)",  color: "#ff6666" } :
                                                                 { background: "rgba(255,204,68,0.12)", border: "1px solid rgba(255,204,68,0.3)", color: "#ffcc44" }),
                      }}>
                        {aiAnalysis[key].verdict === "buy" ? "買うべき" : aiAnalysis[key].verdict === "skip" ? "見送り" : "要検討"}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "#8A8278", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                      {aiAnalysis[key].analysis}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </>
      )}

      {/* ── ルートマトリックスモーダル ── */}
      {routeItem && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setRouteItem(null); }}>
          <div style={{ background: "#141414", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 16, padding: 24, width: 620, maxHeight: "90vh", overflowY: "auto" }}>

            {/* ヘッダー */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <GitFork size={16} color="#D4AF37" />
                <span style={{ fontWeight: 800, color: "#F5F0E8", fontSize: 15 }}>ルートマトリックス</span>
                <span style={{ fontSize: 10, background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 8, padding: "2px 8px", color: "#D4AF37" }}>全{routeData ? Object.keys(routeData).length : "—"}ルート</span>
              </div>
              <button onClick={() => setRouteItem(null)} style={{ background: "none", border: "none", color: "#8A8278", cursor: "pointer" }}><X size={16} /></button>
            </div>

            {/* 商品情報 */}
            <div style={{ background: "rgba(10,10,11,0.8)", borderRadius: 10, padding: "11px 14px", marginBottom: 16, border: "1px solid rgba(212,175,55,0.1)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#F5F0E8", marginBottom: 5, lineHeight: 1.4 }}>{routeItem.name}</div>
              <div style={{ display: "flex", gap: 14, fontSize: 11 }}>
                <span style={{ color: "#8A8278" }}>仕入れ元 <span style={{ color: "#c0dcd0", fontWeight: 700 }}>{routeItem.buy_source}</span></span>
                <span style={{ color: "#8A8278" }}>仕入れ価格 <span style={{ color: "#c0dcd0", fontWeight: 700, fontFamily: "monospace" }}>¥{routeItem.buy_price.toLocaleString()}</span></span>
                <span style={{ color: "#8A8278" }}>推定売価 <span style={{ color: "#66aaff", fontWeight: 700, fontFamily: "monospace" }}>¥{routeItem.est_sell_price_jpy.toLocaleString()}</span></span>
              </div>
            </div>

            {routeLoading ? (
              <div style={{ textAlign: "center", color: "#8A8278", padding: "40px 0" }}>
                <RefreshCw size={22} style={{ animation: "spin 1s linear infinite", display: "block", margin: "0 auto 10px" }} />
                <div style={{ fontSize: 13 }}>全プラットフォームの利益を計算中...</div>
              </div>
            ) : routeData ? (() => {
              const sorted = Object.entries(routeData).sort((a, b) => b[1].profit_rate - a[1].profit_rate);
              const bestProfit = sorted[0]?.[1]?.gross_profit ?? 0;
              const domestic = sorted.filter(([, v]) => v.area === "国内");
              const overseas = sorted.filter(([, v]) => v.area === "海外");

              const renderRow = (platform: string, entry: { gross_profit: number; profit_rate: number; platform_fees: number; emoji: string; area: string }, rank: number) => {
                const isTop = rank === 0;
                const isCurrent = platform === routeItem.sell_platform || platform === routeItem.sell_platform_name;
                const profitColor = entry.profit_rate >= 40 ? "#D4AF37" : entry.profit_rate >= 25 ? "#4ade80" : entry.profit_rate >= 10 ? "#ffcc44" : "#ff6666";
                const barW = bestProfit > 0 ? Math.max(0, Math.min(100, (entry.gross_profit / bestProfit) * 100)) : 0;
                return (
                  <div key={platform} style={{ display: "flex", alignItems: "center", gap: 10, background: isTop ? "rgba(212,175,55,0.07)" : "rgba(0,0,0,0.25)", border: `1px solid ${isTop ? "rgba(212,175,55,0.3)" : isCurrent ? "rgba(102,170,255,0.2)" : "rgba(255,255,255,0.04)"}`, borderRadius: 9, padding: "9px 12px", marginBottom: 4, transition: "background 0.12s" }}>
                    {/* ランク */}
                    <div style={{ width: 22, textAlign: "center", flexShrink: 0 }}>
                      {isTop ? <Crown size={14} color="#D4AF37" /> : <span style={{ fontSize: 11, color: "#5a5248", fontFamily: "monospace" }}>#{rank + 1}</span>}
                    </div>
                    {/* プラットフォーム */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 14 }}>{entry.emoji}</span>
                        <span style={{ fontSize: 12, color: "#d0e8d8", fontWeight: 700 }}>{platform}</span>
                        {isCurrent && <span style={{ fontSize: 9, background: "rgba(102,170,255,0.15)", border: "1px solid rgba(102,170,255,0.3)", borderRadius: 6, padding: "1px 5px", color: "#66aaff" }}>スキャン結果</span>}
                        {isTop && <span style={{ fontSize: 9, background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 6, padding: "1px 5px", color: "#D4AF37", marginLeft: "auto" }}>最高利益</span>}
                      </div>
                      <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${barW}%`, background: profitColor, borderRadius: 2, transition: "width 0.4s ease" }} />
                      </div>
                    </div>
                    {/* 手数料 */}
                    <div style={{ textAlign: "right", flexShrink: 0, minWidth: 58 }}>
                      <div style={{ fontSize: 9, color: "#4a4a4a" }}>手数料</div>
                      <div style={{ fontSize: 11, color: "#5a6a5a", fontFamily: "monospace" }}>¥{Math.round(entry.platform_fees).toLocaleString()}</div>
                    </div>
                    {/* 利益額 */}
                    <div style={{ textAlign: "right", flexShrink: 0, minWidth: 72 }}>
                      <div style={{ fontSize: 9, color: "#4a4a4a" }}>想定利益</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: profitColor, fontFamily: "monospace" }}>
                        {entry.gross_profit >= 0 ? "+" : ""}¥{Math.round(entry.gross_profit).toLocaleString()}
                      </div>
                    </div>
                    {/* 利益率 */}
                    <div style={{ textAlign: "center", flexShrink: 0, minWidth: 44 }}>
                      <div style={{ fontSize: 9, color: "#4a4a4a" }}>利益率</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: profitColor }}>{entry.profit_rate.toFixed(0)}%</div>
                    </div>
                    {/* 出品ボタン */}
                    <button
                      onClick={() => { setRouteItem(null); openListing({ ...routeItem, sell_platform: platform, sell_platform_name: platform }); }}
                      style={{ display: "flex", alignItems: "center", gap: 4, background: isTop ? "linear-gradient(135deg,rgba(212,175,55,0.15),rgba(212,175,55,0.08))" : "rgba(0,40,15,0.6)", border: `1px solid ${isTop ? "rgba(212,175,55,0.4)" : "rgba(212,175,55,0.15)"}`, borderRadius: 7, color: isTop ? "#D4AF37" : "#4a8a5a", padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}>
                      <ShoppingCart size={10} /> 出品
                    </button>
                  </div>
                );
              };

              return (
                <div>
                  {/* 海外プラットフォーム */}
                  {overseas.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 10, color: "#8A8278", fontWeight: 700, marginBottom: 7, letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 6 }}>
                        🌏 海外プラットフォーム
                      </div>
                      {overseas.map(([p, e]) => {
                        const globalRank = sorted.findIndex(([sp]) => sp === p);
                        return renderRow(p, e, globalRank);
                      })}
                    </div>
                  )}
                  {/* 国内プラットフォーム */}
                  {domestic.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 10, color: "#8A8278", fontWeight: 700, marginBottom: 7, letterSpacing: "0.06em" }}>
                        🏪 国内プラットフォーム
                      </div>
                      {domestic.map(([p, e]) => {
                        const globalRank = sorted.findIndex(([sp]) => sp === p);
                        return renderRow(p, e, globalRank);
                      })}
                    </div>
                  )}
                  {/* フッター */}
                  <div style={{ borderTop: "1px solid rgba(212,175,55,0.1)", paddingTop: 12, marginTop: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 10, color: "#5a5248", lineHeight: 1.6 }}>
                        ※ 推定売価 ¥{routeItem.est_sell_price_jpy.toLocaleString()} で計算（国際送料・仕入れ価格控除済み）
                      </div>
                      <button
                        onClick={() => {
                          const top = sorted[0];
                          if (!top) return;
                          const text = `【物販チェッカー】\n仕入れ: ${routeItem.buy_source} ¥${routeItem.buy_price.toLocaleString()}\n最高ルート: ${top[0]} → +¥${Math.round(top[1].gross_profit).toLocaleString()}（${top[1].profit_rate.toFixed(0)}%）\n\n#物販 #せどり #海外転売`;
                          navigator.clipboard.writeText(text);
                          toast("SNS投稿文をコピーしました", "success");
                        }}
                        style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(100,150,255,0.08)", border: "1px solid rgba(100,150,255,0.2)", borderRadius: 8, color: "#66aaff", padding: "7px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                        <Share2 size={11} /> SNS投稿文をコピー
                      </button>
                    </div>
                  </div>
                </div>
              );
            })() : null}
          </div>
        </div>
      )}

      {/* ── 出品モーダル ── */}
      {listingItem && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setListingItem(null); }}>
          <div style={{ background: "#141414", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 16, padding: 26, width: 560, maxHeight: "88vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ShoppingCart size={16} color="#D4AF37" />
                <span style={{ fontWeight: 800, color: "#F5F0E8", fontSize: 15 }}>仕入れ & 出品</span>
              </div>
              <button onClick={() => setListingItem(null)} style={{ background: "none", border: "none", color: "#8A8278", cursor: "pointer" }}><X size={16} /></button>
            </div>

            <div style={{ background: "rgba(10,10,11,0.8)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, border: "1px solid rgba(212,175,55,0.1)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#F5F0E8", marginBottom: 4, lineHeight: 1.4 }}>{listingItem.name}</div>
              <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                <span style={{ color: "#8A8278" }}>仕入れ <span style={{ color: "#F5F0E8", fontWeight: 700 }}>¥{listingItem.buy_price.toLocaleString()}</span></span>
                <span style={{ color: "#8A8278" }}>推定利益 <span style={{ color: "#D4AF37", fontWeight: 700 }}>+¥{Math.round(listingItem.net_profit_jpy).toLocaleString()}</span></span>
              </div>
            </div>

            {listingLoading ? (
              <div style={{ textAlign: "center", color: "#8A8278", padding: "30px 0" }}>
                <RefreshCw size={22} style={{ animation: "spin 1s linear infinite", display: "block", margin: "0 auto 10px" }} />
                <div style={{ fontSize: 13 }}>出品リンクを生成中...</div>
              </div>
            ) : (
              <>
                {/* 登録済みバッジ */}
                {listingConfirmed && (
                  <div style={{ fontSize: 12, color: "#D4AF37", marginBottom: 12, display: "flex", alignItems: "center", gap: 5, background: "rgba(212,175,55,0.06)", borderRadius: 8, padding: "8px 12px", border: "1px solid rgba(212,175,55,0.2)" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#D4AF37" }} />
                    仕入れ管理に登録しました
                  </div>
                )}

                {/* チェックリスト操作 */}
                <div style={{ display: "flex", gap: 7, marginBottom: 14 }}>
                  <button onClick={() => setChecked(new Set(Object.keys(listingLinks)))} style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 8, color: "#4a9a5a", padding: "8px 11px", fontSize: 11, cursor: "pointer" }}>全選択</button>
                  <button onClick={() => setChecked(new Set())} style={{ background: "rgba(255,50,50,0.06)", border: "1px solid rgba(255,50,50,0.15)", borderRadius: 8, color: "#7a4a4a", padding: "8px 11px", fontSize: 11, cursor: "pointer" }}>解除</button>
                </div>

                {["国内", "海外"].map(cat => {
                  const links = Object.entries(listingLinks).filter(([, v]) => v.category === cat);
                  return (
                    <div key={cat} style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 10, color: "#8A8278", fontWeight: 700, marginBottom: 6, letterSpacing: "0.05em" }}>
                        {cat === "国内" ? "国内プラットフォーム" : "海外プラットフォーム"}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {links.map(([lkey, link]) => {
                          const isChecked = checked.has(lkey);
                          return (
                            <div key={lkey} onClick={() => setChecked(p => { const n = new Set(p); if (n.has(lkey)) { n.delete(lkey); } else { n.add(lkey); } return n; })}
                              style={{ display: "flex", alignItems: "center", gap: 10, background: isChecked ? "rgba(212,175,55,0.07)" : "rgba(0,8,2,0.6)", border: `1px solid ${isChecked ? "rgba(212,175,55,0.3)" : "rgba(212,175,55,0.08)"}`, borderRadius: 9, padding: "9px 13px", cursor: "pointer", transition: "all 0.12s" }}>
                              <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${isChecked ? "#D4AF37" : "rgba(212,175,55,0.2)"}`, background: isChecked ? "rgba(212,175,55,0.2)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                {isChecked && <span style={{ fontSize: 10, color: "#D4AF37", fontWeight: 900, lineHeight: 1 }}>✓</span>}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ fontSize: 13 }}>{link.flag}</span>
                                  <span style={{ fontSize: 12, color: "#d0e8d8", fontWeight: 600 }}>{link.label}</span>
                                  {link.recommended && <span style={{ fontSize: 9, background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 8, padding: "1px 5px", color: "#D4AF37" }}>推奨</span>}
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

                {/* アクションボタン */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                  {/* 主要アクション: 仕入れ登録 + リンクを開く */}
                  <button
                    onClick={confirmAndOpen}
                    disabled={checked.size === 0 || listingRegistering}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: listingConfirmed ? "rgba(0,60,20,0.6)" : "linear-gradient(135deg,#1e1608,#2a1e08)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 8, color: checked.size === 0 || listingRegistering ? "#4a6a4a" : "#D4AF37", padding: "12px", fontWeight: 700, fontSize: 13, cursor: checked.size === 0 || listingRegistering ? "not-allowed" : "pointer" }}
                  >
                    {listingRegistering
                      ? <><RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> 登録中...</>
                      : listingConfirmed
                        ? <><ExternalLink size={13} /> チェックした {checked.size}件 を開く</>
                        : <><ShoppingCart size={13} /> 仕入れを登録してリンクを開く（{checked.size}件）</>
                    }
                  </button>
                  {/* サブ: 登録なしでリンクだけ開く */}
                  {!listingConfirmed && (
                    <button
                      onClick={openChecked}
                      disabled={checked.size === 0}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "transparent", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 8, color: checked.size === 0 ? "#3a5a4a" : "#6a9a7a", padding: "9px", fontWeight: 600, fontSize: 12, cursor: checked.size === 0 ? "not-allowed" : "pointer" }}
                    >
                      <ExternalLink size={12} /> 登録せずリンクだけ開く
                    </button>
                  )}
                </div>

                {listingConfirmed ? (
                  <div style={{ textAlign: "center", marginTop: 10 }}>
                    <a href="/listings" style={{ fontSize: 13, color: "#66aaff", textDecoration: "none", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <ExternalLink size={12} /> 出品管理で確認する →
                    </a>
                  </div>
                ) : (
                  <div style={{ fontSize: 10, color: "#3a5a4a", textAlign: "center", marginTop: 10 }}>
                    出品完了後、仕入れ管理からステータスを更新してください
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default function ScannerPage() {
  return (
    <RequirePlan requiredPlan="STANDARD" featureName="利益スキャナー">
      <ScannerPageContent />
    </RequirePlan>
  );
}

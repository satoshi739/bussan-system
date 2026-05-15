// ── おすすめジャンル（タップで即スキャン・17件フラット） ─────────────
export const GENRES = [
  { keyword: "腕時計 セイコー 中古",          platform: "eBay", maxPrice: 20000, label: "セイコー",        reason: "海外評価No.1",         color: "#006FE6", emoji: "⌚" },
  { keyword: "腕時計 カシオ G-SHOCK 中古",    platform: "eBay", maxPrice: 15000, label: "G-SHOCK",         reason: "定番高利益ジャンル",    color: "#006FE6", emoji: "⏱️" },
  { keyword: "フィルムカメラ CONTAX 中古",    platform: "eBay", maxPrice: 30000, label: "CONTAX",          reason: "コンタックスは超高値",  color: "#aaccff", emoji: "📷" },
  { keyword: "一眼レフ ニコン キヤノン 中古", platform: "eBay", maxPrice: 25000, label: "一眼レフ",        reason: "日本メーカー信頼度高",  color: "#aaccff", emoji: "🎥" },
  { keyword: "ポケモンカード 旧裏面",         platform: "eBay", maxPrice: 5000,  label: "ポケモンカード",  reason: "海外需要 No.1",         color: "#ffcc44", emoji: "🃏" },
  { keyword: "遊戯王カード 旧弾 レア",        platform: "eBay", maxPrice: 3000,  label: "遊戯王",          reason: "海外コレクター多い",    color: "#ffcc44", emoji: "🎴" },
  { keyword: "ファミコン ソフト 希少",         platform: "eBay", maxPrice: 5000,  label: "ファミコン",      reason: "ファミコンブーム継続",  color: "#ff9944", emoji: "🕹️" },
  { keyword: "スーパーファミコン ソフト 未開封", platform: "eBay", maxPrice: 8000,  label: "スーファミ",      reason: "未開封品は超高値",      color: "#ff9944", emoji: "👾" },
  { keyword: "フィギュア アニメ 限定",         platform: "eBay", maxPrice: 8000,  label: "アニメフィギュア", reason: "コレクター需要高",      color: "#cc66ff", emoji: "🗿" },
  { keyword: "LEGO レゴ 廃盤",               platform: "eBay", maxPrice: 12000, label: "LEGO廃盤",        reason: "廃番品が高値",          color: "#ffdd44", emoji: "🧱" },
  { keyword: "ギター エレキ 日本製 中古",     platform: "eBay", maxPrice: 30000, label: "エレキギター",    reason: "MADE IN JAPANは高評価", color: "#ff9944", emoji: "🎸" },
  { keyword: "シンセサイザー ローランド 中古", platform: "eBay", maxPrice: 30000, label: "シンセ",          reason: "Roland/Yamahaは超人気", color: "#66aaff", emoji: "🎹" },
  { keyword: "盆栽 BONSAI",                  platform: "eBay", maxPrice: 8000,  label: "盆栽",            reason: "BONSAI海外人気",        color: "#4ade80", emoji: "🌿" },
  { keyword: "着物 帯 未使用 高級",           platform: "eBay", maxPrice: 10000, label: "着物",            reason: "海外でKIMONO人気沸騰",  color: "#ff88aa", emoji: "👘" },
  { keyword: "ブランド 財布 中古",            platform: "eBay", maxPrice: 50000, label: "ブランド財布",    reason: "高利益率",              color: "#ff66aa", emoji: "👜" },
  { keyword: "スニーカー ナイキ 限定",        platform: "eBay", maxPrice: 15000, label: "限定スニーカー",  reason: "限定スニーカーは高値",  color: "#ff66aa", emoji: "👟" },
  { keyword: "万年筆 高級 中古",              platform: "eBay", maxPrice: 10000, label: "万年筆",          reason: "文具コレクター多い",    color: "#99aacc", emoji: "✒️" },
] as const;

export const PLATFORMS = [
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

export const RATING = {
  excellent: { label: "強くおすすめ",    color: "var(--blue)", bg: "rgba(212,175,55,0.12)" },
  good:      { label: "おすすめ",        color: "#F0D060", bg: "rgba(212,175,55,0.1)"  },
  ok:        { label: "普通",            color: "#ffcc44", bg: "rgba(255,204,68,0.1)"  },
  marginal:  { label: "やめた方がいい",  color: "#ff9944", bg: "rgba(255,153,68,0.1)" },
  loss:      { label: "やめた方がいい",  color: "#ff4444", bg: "rgba(255,68,68,0.08)" },
};

export const RATING_STARS: Record<string, number> = {
  excellent: 5, good: 4, ok: 3, marginal: 2, loss: 1,
};

export const AI_HOT_GENRES = [
  { label: "フィルムカメラ", emoji: "📷", reason: "ヴィンテージ人気急上昇" },
  { label: "セイコー腕時計", emoji: "⌚", reason: "海外評価No.1" },
  { label: "ポケモンカード", emoji: "🃏", reason: "海外需要が安定" },
  { label: "盆栽・BONSAI",   emoji: "🌿", reason: "欧米で爆発的人気" },
  { label: "G-SHOCK",        emoji: "⏱️", reason: "定番高利益ジャンル" },
  { label: "レゴ廃盤品",     emoji: "🧱", reason: "廃番品は希少価値高" },
];

export type ScanKeyword = { keyword: string; target_sell_platform: string; max_buy_price: number | null; min_profit_rate: number; memo: string; last_scanned: string | null; best_profit_rate: number | null };
export type ScanResult  = { name: string; buy_price: number; buy_url: string; buy_image: string; buy_source: string; condition: string; sell_platform: string; sell_platform_name: string; sell_platform_flag: string; sell_currency: string; est_sell_price_local: number; est_sell_price_jpy: number; net_profit_jpy: number; profit_rate: number; roi: number; intl_shipping_jpy: number; platform_fee_jpy: number; rating: string; score: number; scanned_at: string; scan_keyword?: string; price_source?: string; amazon_market?: { median: number; avg: number; sample: number } };
export type DemandData  = { demand_score: number; market_prices: Record<string, { avg: number; avg_local?: number; min: number; max: number; count: number; flag: string; currency: string }>; velocity: { level: string; label: string; weekly: string; color: string }; total_listings: number; avg_market_jpy: number };
export type DeepLink    = { label: string; flag: string; url: string; note: string; category: string; recommended: boolean; price_display: string };

// 商品ごとの安定キー（フィルター後もindexがズレない）
export const itemKey = (item: ScanResult): string =>
  item.buy_url ? item.buy_url : `${item.buy_source}::${item.buy_price}::${item.name}`;

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Dashboard
export const getDashboard = () => req<Dashboard>("/api/dashboard");

// Purchases
export const getPurchases = (params?: { status?: string; platform?: string; limit?: number }) => {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.platform) q.set("platform", params.platform);
  if (params?.limit) q.set("limit", String(params.limit));
  return req<Purchase[]>(`/api/purchases?${q}`);
};
export const createPurchase = (body: PurchaseCreate) =>
  req<{ id: number }>("/api/purchases", { method: "POST", body: JSON.stringify(body) });
export const updatePurchaseStatus = (id: number, status: string) =>
  req("/api/purchases/" + id + "/status", { method: "PATCH", body: JSON.stringify({ status }) });
export const deletePurchase = (id: number) =>
  req("/api/purchases/" + id, { method: "DELETE" });

// Listings
export const getListings = (status?: string) =>
  req<Listing[]>(`/api/listings${status ? "?status=" + status : ""}`);
export const createListing = (body: ListingCreate) =>
  req<{ id: number }>("/api/listings", { method: "POST", body: JSON.stringify(body) });

// Sales
export const getSales = () => req<Sale[]>("/api/sales");
export const createSaleSImple = (body: SimpleSaleCreate) =>
  req<{ net_profit: number }>("/api/sales/simple", { method: "POST", body: JSON.stringify(body) });

// Calc
export const calcProfit = (body: ProfitCalcRequest) =>
  req<ProfitResult>("/api/calc/profit", { method: "POST", body: JSON.stringify(body) });
export const getPlatforms = () => req<Record<string, PlatformInfo>>("/api/calc/platforms");
export const getCategories = () => req<string[]>("/api/calc/categories");
export const calcMaxPurchase = (body: { selling_price: number; target_profit_rate: number; selling_platform: string; category?: string; shipping_to_platform?: number }) =>
  req<{ max_purchase_price: number }>("/api/calc/max-purchase", { method: "POST", body: JSON.stringify(body) });
export const calcAllPlatforms = (body: { purchase_price: number; purchase_shipping?: number; selling_price: number }) =>
  req<Record<string, { gross_profit: number; profit_rate: number; platform_fees: number; emoji: string; area: string }>>("/api/calc/all-platforms", { method: "POST", body: JSON.stringify(body) });
export const getStalePurchases = (days?: number) =>
  req<Purchase[]>(`/api/purchases/stale${days ? "?days=" + days : ""}`);
export const getAnalyticsByPlatform = () =>
  req<{ selling_platform: string; count: number; total_profit: number; avg_profit: number; avg_rate: number }[]>("/api/analytics/by-platform");
export const getAnalyticsByBuyPlatform = () =>
  req<{ platform: string; count: number; total_profit: number; avg_profit: number }[]>("/api/analytics/by-buy-platform");
export const getBestProducts = (limit?: number) =>
  req<{ product_name: string; buy_platform: string; selling_platform: string; purchase_price: number; sale_price: number; net_profit: number; sale_date: string; profit_rate: number }[]>(`/api/analytics/best-products${limit ? "?limit=" + limit : ""}`);
export const getGoal = () =>
  req<{ month: string; goal: number; current_profit: number }>("/api/goal");
export const setGoal = (goal: number) =>
  req("/api/goal", { method: "POST", body: JSON.stringify({ goal }) });
export const getWatchlist = () =>
  req<{ keyword: string; sell_platform: string; target_rate: number; memo: string }[]>("/api/watchlist");
export const addWatchlist = (body: { keyword: string; sell_platform: string; target_rate: number; memo?: string }) =>
  req("/api/watchlist", { method: "POST", body: JSON.stringify(body) });
export const removeWatchlist = (keyword: string) =>
  req(`/api/watchlist/${encodeURIComponent(keyword)}`, { method: "DELETE" });

// Types
export interface Dashboard {
  stats: {
    total_purchases: number;
    total_invested: number;
    total_sold: number;
    total_profit: number;
  };
  monthly_profit: { month: string; profit: number; sales_count: number }[];
  status_breakdown: { status: string; count: number }[];
  platform_breakdown: { platform: string; count: number }[];
}

export interface Purchase {
  id: number;
  product_name: string;
  platform: string;
  purchase_price: number;
  purchase_shipping: number;
  purchase_url?: string;
  purchase_date: string;
  status: string;
  notes?: string;
  image_data?: string;
  created_at: string;
}

export interface Listing {
  id: number;
  purchase_id: number;
  selling_platform: string;
  asin?: string;
  listing_price: number;
  amazon_shipping: number;
  use_fba: number;
  category: string;
  listed_date?: string;
  status: string;
  product_name: string;
  purchase_price: number;
  purchase_shipping: number;
  platform: string;
}

export interface Sale {
  id: number;
  listing_id: number;
  sale_price: number;
  amazon_fees: number;
  net_profit: number;
  sale_date: string;
  product_name: string;
  purchase_price: number;
  purchase_shipping: number;
  buy_platform: string;
  selling_platform: string;
}

export interface PlatformInfo {
  fee_rate: number | null;
  fixed_fee: number;
  note: string;
  emoji: string;
  area: string;
}

export interface ProfitResult {
  purchase_total: number;
  selling_price: number;
  platform_fees: number;
  shipping_cost: number;
  gross_profit: number;
  profit_rate: number;
  roi: number;
  selling_platform: string;
}

export type PurchaseCreate = Omit<Purchase, "id" | "status" | "created_at">;
export type ListingCreate = Omit<Listing, "id" | "status" | "product_name" | "purchase_price" | "purchase_shipping" | "platform"> & { use_fba: number | boolean };
export interface SimpleSaleCreate { purchase_id: number; sale_price: number; sell_platform: string; }
export interface ProfitCalcRequest {
  purchase_price: number;
  selling_price: number;
  category?: string;
  purchase_shipping?: number;
  shipping_to_platform?: number;
  use_fba?: boolean;
  selling_platform?: string;
}

// ─── グローバル物販チェッカー ────────────────────────────────

export interface GlobalPlatformInfo {
  key: string;
  name: string;
  flag: string;
  currency: string;
  fee_rate: number;
  area: string;
  note: string;
  category: string;
}

export interface GlobalProfitResult {
  platform_key: string;
  platform_name: string;
  platform_flag: string;
  currency: string;
  area: string;
  note: string;
  selling_price_local: number;
  selling_price_jpy: number;
  purchase_price_jpy: number;
  purchase_shipping_jpy: number;
  intl_shipping_jpy: number;
  platform_fee_jpy: number;
  platform_fee_rate: number;
  total_cost_jpy: number;
  net_profit_jpy: number;
  profit_rate: number;
  roi: number;
  is_profitable: boolean;
  rating: 'excellent' | 'good' | 'ok' | 'marginal' | 'loss';
}

export interface SuggestPriceResult {
  platform_key: string;
  platform_name: string;
  platform_flag: string;
  currency: string;
  price_local: number;
  price_jpy: number;
  target_profit_rate: number;
  area: string;
  note: string;
}

export interface GlobalSearchResult {
  keyword: string;
  buy_results: { source: string; name: string; price: number; url: string; image: string; condition: string }[];
  buy_stats: { min: number; max: number; avg: number; count: number };
  sell_data: Record<string, {
    name: string;
    flag: string;
    currency: string;
    avg_price_local: number;
    min_price_local: number;
    avg_price_jpy: number;
    item_count: number;
  }>;
  profit_matrix: GlobalProfitResult[];
}

export const getGlobalPlatforms = () =>
  req<GlobalPlatformInfo[]>("/api/global/platforms");

export const getExchangeRates = () =>
  req<Record<string, { name: string; symbol: string; flag: string; rate_from_jpy: number; rate_to_jpy: number }>>("/api/global/rates");

export const globalSearch = (body: {
  keyword: string;
  buy_platforms?: string[];
  sell_platforms?: string[];
  limit?: number;
}) => req<GlobalSearchResult>("/api/global/search", { method: "POST", body: JSON.stringify(body) });

export const calcGlobalProfitMatrix = (body: {
  purchase_price_jpy: number;
  purchase_shipping_jpy?: number;
  weight_g?: number;
  selling_prices: Record<string, number>;
}) => req<{ results: GlobalProfitResult[]; count: number }>("/api/global/profit-matrix", { method: "POST", body: JSON.stringify(body) });

export const getGlobalSuggestPrices = (body: {
  purchase_price_jpy: number;
  purchase_shipping_jpy?: number;
  weight_g?: number;
  target_profit_rate?: number;
  platforms?: string[];
}) => req<{ results: SuggestPriceResult[] }>("/api/global/suggest-prices", { method: "POST", body: JSON.stringify(body) });

// Market search
export const searchMarket = (keyword: string, limit?: number) =>
  req<{ results: { source: string; name: string; price: number; url: string; image: string; condition: string }[]; stats: { min: number; max: number; avg: number; count: number } }>(`/api/search/market?keyword=${encodeURIComponent(keyword)}${limit ? "&limit=" + limit : ""}`);
export const getPriceHistory = (keyword: string) =>
  req<{ date: string; avg_price: number; min_price: number; max_price: number; count: number }[]>(`/api/search/history?keyword=${encodeURIComponent(keyword)}`);

// Settings
export const getSettings = () =>
  fetch(`${BASE}/api/settings`).then(r => r.ok ? r.json() as Promise<Record<string, string>> : {} as Record<string, string>);

// LINE notify
export const testLineNotify = (token: string) =>
  req<{ ok: boolean }>("/api/notify/test", { method: "POST", body: JSON.stringify({ token }) });
export const notifyStale = () =>
  req<{ ok: boolean; count?: number; msg?: string }>("/api/notify/stale", { method: "POST" });
export const notifyDaily = () =>
  req<{ ok: boolean }>("/api/notify/daily", { method: "POST" });

const BASE = "/api/proxy";

async function req<T>(path: string, options?: RequestInit, timeoutMs = 5000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      ...options,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("タイムアウト: サーバーの応答がありませんでした");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// AI エージェント用（最大120秒）
function agentReq<T>(path: string, options?: RequestInit): Promise<T> {
  return req<T>(path, options, 120_000);
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
export const updatePurchase = (id: number, body: Partial<Omit<Purchase, "id" | "status" | "created_at">>) =>
  req("/api/purchases/" + id, { method: "PATCH", body: JSON.stringify(body) });
export const deletePurchase = (id: number) =>
  req("/api/purchases/" + id, { method: "DELETE" });
export const getProductNames = () => req<string[]>("/api/purchases/product-names");
export const importPurchasesCSV = (file: File): Promise<{ imported: number; errors: string[]; parse_errors: string[] }> => {
  const form = new FormData();
  form.append("file", file);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  return fetch(`${BASE}/api/purchases/import/csv`, { method: "POST", body: form, signal: controller.signal })
    .then(r => {
      if (!r.ok) throw new Error("インポートに失敗しました");
      return r.json();
    })
    .finally(() => clearTimeout(timer));
};

// Listings
export const getListings = (status?: string) =>
  req<Listing[]>(`/api/listings${status ? "?status=" + status : ""}`);
export const createListing = (body: ListingCreate) =>
  req<{ id: number }>("/api/listings", { method: "POST", body: JSON.stringify(body) });

// Sales
export const getSales = () => req<Sale[]>("/api/sales");
export const createSaleSimple = (body: SimpleSaleCreate) =>
  req<{ net_profit: number; monthly_profit: number }>("/api/sales/simple", { method: "POST", body: JSON.stringify(body) });

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
}) => req<GlobalSearchResult>("/api/global/search", { method: "POST", body: JSON.stringify(body) }, 30_000);

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
  req<{ results: { source: string; name: string; price: number; url: string; image: string; condition: string }[]; stats: { min: number; max: number; avg: number; count: number } }>(`/api/search/market?keyword=${encodeURIComponent(keyword)}${limit ? "&limit=" + limit : ""}`, undefined, 20_000);
export const getPriceHistory = (keyword: string) =>
  req<{ date: string; avg_price: number; min_price: number; max_price: number; count: number }[]>(`/api/search/history?keyword=${encodeURIComponent(keyword)}`);

// Settings
export const getSettings = () =>
  req<Record<string, string>>("/api/settings", undefined, 20_000);
export const saveSettings = (body: Record<string, unknown>) =>
  req<void>("/api/settings", { method: "POST", body: JSON.stringify(body) }, 20_000);

// LINE notify
export const testLineNotify = (token: string) =>
  req<{ ok: boolean; error?: string }>("/api/notify/test", { method: "POST", body: JSON.stringify({ token }) });
export const notifyStale = () =>
  req<{ ok: boolean; count?: number; msg?: string; error?: string }>("/api/notify/stale", { method: "POST" });
export const notifyDaily = () =>
  req<{ ok: boolean; error?: string }>("/api/notify/daily", { method: "POST" });

// Source sync (在庫連動・価格上昇監視)
export interface SourceSyncSettings {
  enabled: boolean;
  interval_min: number;
  price_rise_threshold_pct: number;
  min_alert_delta_jpy: number;
  active_only: boolean;
  last_run: number;
}

export const getSourceSyncSettings = () =>
  req<SourceSyncSettings>("/api/source-sync/settings");
export const saveSourceSyncSettings = (body: {
  enabled: boolean;
  interval_min: number;
  price_rise_threshold_pct: number;
  min_alert_delta_jpy: number;
  active_only: boolean;
}) => req<{ ok: boolean }>("/api/source-sync/settings", { method: "POST", body: JSON.stringify(body) });
export const runSourceSyncNow = () =>
  req<{ ok: boolean; checked: number; sold_out_detected: number; price_rise_detected: number; checked_at: string }>("/api/source-sync/run", { method: "POST" }, 30_000);

// ── 価格変動アラート ──────────────────────────────────────────────
export interface PriceAlert {
  keyword: string;
  source: string;
  old_avg: number;
  recent_avg: number;
  recent_min: number | null;
  change_rate: number;
  direction: "up" | "down";
  recent_count: number;
  in_watchlist: boolean;
}

export const getPriceChangeAlerts = (days?: number, threshold?: number) => {
  const q = new URLSearchParams();
  if (days) q.set("days", String(days));
  if (threshold) q.set("threshold", String(threshold));
  return req<{ alerts: PriceAlert[]; total: number; checked_at: string; period_days: number }>(`/api/alerts/price-changes?${q}`);
};

// ── 売れ筋トレンド ────────────────────────────────────────────────
export interface SalesTrends {
  monthly_by_platform: { month: string; selling_platform: string; count: number; total_profit: number; avg_profit: number }[];
  trending_products: { product_name: string; sale_count: number; total_profit: number; avg_rate: number; last_sold: string }[];
  monthly_totals: { month: string; count: number; profit: number }[];
}

export const getSalesTrends = (months?: number) =>
  req<SalesTrends>(`/api/analytics/trends${months ? "?months=" + months : ""}`);

// ── 競合セラー分析 ────────────────────────────────────────────────
export interface CompetitionResult {
  product_name: string;
  selling_platform: string;
  your_price: number;
  market_avg: number;
  market_min: number;
  diff_pct: number;
  status: "high" | "competitive" | "low";
  market_items: number;
  cost: number;
}

export const getCompetitionAnalysis = () =>
  req<{ results: CompetitionResult[] }>("/api/analytics/competition", undefined, 30_000);

// ── AI リサーチアシスタント ──────────────────────────────────────
export const aiResearch = (message: string, include_data = true) =>
  req<{ ok: boolean; response: string }>("/api/ai/research", {
    method: "POST",
    body: JSON.stringify({ message, include_data }),
  });

// ── 月次レポート ──────────────────────────────────────────────────
export interface MonthlyReport {
  month: string;
  summary: { sale_count: number; total_profit: number; avg_profit: number; avg_rate: number; total_revenue: number };
  prev_month: { month: string; sale_count: number; total_profit: number };
  purchases: { count: number; invested: number };
  goal: number;
  goal_achievement: number | null;
  profit_growth: number;
  by_platform: { selling_platform: string; count: number; profit: number; avg_rate: number }[];
  best_products: { product_name: string; buy_platform: string; selling_platform: string; net_profit: number; profit_rate: number }[];
}

export const getMonthlyReport = (month?: string) =>
  req<MonthlyReport>(`/api/reports/monthly${month ? "?month=" + encodeURIComponent(month) : ""}`);

export const sendMonthlyReportLine = (month?: string) =>
  req<{ ok: boolean }>("/api/reports/monthly/line", { method: "POST", body: JSON.stringify({ month }) });

// ── 外注・発送管理 ────────────────────────────────────────────
export interface Fulfillment {
  id: number;
  purchase_id: number;
  worker_name?: string;
  status: string;
  tracking_number?: string;
  shipping_company?: string;
  pickup_date?: string;
  pack_date?: string;
  ship_date?: string;
  notes?: string;
  created_at: string;
  product_name: string;
  platform: string;
  purchase_price: number;
  purchase_shipping: number;
  purchase_url?: string;
  purchase_date: string;
}

export interface FulfillmentCreate {
  purchase_id: number;
  worker_name?: string;
  status?: string;
  tracking_number?: string;
  shipping_company?: string;
  pickup_date?: string;
  pack_date?: string;
  ship_date?: string;
  notes?: string;
}

export interface FulfillmentUpdate {
  worker_name?: string;
  status?: string;
  tracking_number?: string;
  shipping_company?: string;
  pickup_date?: string;
  pack_date?: string;
  ship_date?: string;
  notes?: string;
}

export const getFulfillments = (status?: string) =>
  req<Fulfillment[]>(`/api/fulfillment${status ? "?status=" + status : ""}`);
export const createFulfillment = (body: FulfillmentCreate) =>
  req<{ id: number }>("/api/fulfillment", { method: "POST", body: JSON.stringify(body) });
export const updateFulfillment = (id: number, body: FulfillmentUpdate) =>
  req("/api/fulfillment/" + id, { method: "PATCH", body: JSON.stringify(body) });
export const deleteFulfillment = (id: number) =>
  req("/api/fulfillment/" + id, { method: "DELETE" });

// ── 発送代行業者 ──────────────────────────────────────────────
export interface FulfillmentVendor {
  id: number;
  name: string;
  vendor_type: string;
  connection_type: "api" | "email" | "line" | "manual";
  status: "active" | "inactive" | "testing";
  api_key?: string;
  api_endpoint?: string;
  contact_email?: string;
  line_token?: string;
  base_fee: number;
  per_item_fee: number;
  supported_methods: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FulfillmentVendorCreate {
  name: string;
  vendor_type: string;
  connection_type: string;
  status?: string;
  api_key?: string;
  api_endpoint?: string;
  contact_email?: string;
  line_token?: string;
  base_fee?: number;
  per_item_fee?: number;
  supported_methods?: string;
  notes?: string;
}

export interface ShippingRequest {
  vendor_id: number;
  shipping_method: string;
  shipping_cost: number;
  vendor_fee: number;
  recipient_name?: string;
  recipient_zip?: string;
  recipient_prefecture?: string;
  recipient_address?: string;
  recipient_phone?: string;
  request_options?: string;
  notes?: string;
}

export interface StatusLog {
  id: number;
  task_id: number;
  from_status?: string;
  to_status: string;
  changed_by: string;
  note?: string;
  created_at: string;
}

export const getFulfillmentVendors = () =>
  req<FulfillmentVendor[]>("/api/fulfillment/vendors");
export const getFulfillmentVendor = (id: number) =>
  req<FulfillmentVendor>("/api/fulfillment/vendors/" + id);
export const createFulfillmentVendor = (body: FulfillmentVendorCreate) =>
  req<{ id: number }>("/api/fulfillment/vendors", { method: "POST", body: JSON.stringify(body) });
export const updateFulfillmentVendor = (id: number, body: Partial<FulfillmentVendorCreate & { status: string }>) =>
  req("/api/fulfillment/vendors/" + id, { method: "PATCH", body: JSON.stringify(body) });
export const deleteFulfillmentVendor = (id: number) =>
  req("/api/fulfillment/vendors/" + id, { method: "DELETE" });
export const testFulfillmentVendor = (id: number) =>
  req<{ ok: boolean; message: string }>("/api/fulfillment/vendors/" + id + "/test", { method: "POST" });
export const createShippingRequest = (taskId: number, body: ShippingRequest) =>
  req<{ ok: boolean }>("/api/fulfillment/" + taskId + "/request", { method: "POST", body: JSON.stringify(body) });
export const getStatusLogs = (taskId: number) =>
  req<StatusLog[]>("/api/fulfillment/" + taskId + "/logs");

// ── FBA 納品管理 ──────────────────────────────────────────────

export interface FbaShipmentItem {
  id: number;
  shipment_id: number;
  purchase_id?: number;
  product_name: string;
  asin?: string;
  fnsku?: string;
  sku?: string;
  quantity: number;
  box_number: number;
  condition_type: string;
  notes?: string;
  created_at: string;
}

export interface FbaShipment {
  id: number;
  plan_name: string;
  status: "draft" | "ready" | "sent" | "received";
  destination: string;
  box_count: number;
  total_items: number;
  notes?: string;
  created_at: string;
  sent_at?: string;
  received_at?: string;
  items: FbaShipmentItem[];
}

export interface FbaShipmentCreate {
  plan_name: string;
  status?: string;
  destination?: string;
  box_count?: number;
  notes?: string;
}

export interface FbaShipmentItemCreate {
  purchase_id?: number;
  product_name: string;
  asin?: string;
  fnsku?: string;
  sku?: string;
  quantity: number;
  box_number?: number;
  condition_type?: string;
  notes?: string;
}

export const getFbaShipments = () => req<FbaShipment[]>("/api/fba/shipments");
export const getFbaShipment = (id: number) => req<FbaShipment>("/api/fba/shipments/" + id);
export const createFbaShipment = (body: FbaShipmentCreate) =>
  req<{ id: number }>("/api/fba/shipments", { method: "POST", body: JSON.stringify(body) });
export const updateFbaShipment = (id: number, body: Partial<FbaShipmentCreate & { sent_at?: string; received_at?: string }>) =>
  req("/api/fba/shipments/" + id, { method: "PATCH", body: JSON.stringify(body) });
export const deleteFbaShipment = (id: number) =>
  req("/api/fba/shipments/" + id, { method: "DELETE" });
export const addFbaShipmentItem = (shipmentId: number, body: FbaShipmentItemCreate) =>
  req<{ id: number; fnsku: string; sku: string }>("/api/fba/shipments/" + shipmentId + "/items", { method: "POST", body: JSON.stringify(body) });
export const updateFbaShipmentItem = (itemId: number, body: Partial<FbaShipmentItemCreate>) =>
  req("/api/fba/shipment-items/" + itemId, { method: "PATCH", body: JSON.stringify(body) });
export const deleteFbaShipmentItem = (itemId: number) =>
  req("/api/fba/shipment-items/" + itemId, { method: "DELETE" });

// ── 在庫管理 ──────────────────────────────────────────────────

export interface InventoryItem {
  id: number;
  product_name: string;
  asin?: string;
  sku?: string;
  fnsku?: string;
  quantity: number;
  reserved_quantity: number;
  daily_sales: number;
  reorder_point: number;
  location: string;
  status: string;
  unit_cost: number;
  days_remaining?: number | null;
  last_updated: string;
  created_at: string;
}

export interface InventoryItemCreate {
  product_name: string;
  asin?: string;
  sku?: string;
  fnsku?: string;
  quantity?: number;
  reserved_quantity?: number;
  daily_sales?: number;
  reorder_point?: number;
  location?: string;
  status?: string;
  unit_cost?: number;
}

export interface InventorySummary {
  total_items: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_inventory_value: number;
}

export const getInventory = (status?: string) =>
  req<InventoryItem[]>(`/api/inventory${status ? "?status=" + status : ""}`);
export const getInventorySummary = () => req<InventorySummary>("/api/inventory/summary");
export const createInventoryItem = (body: InventoryItemCreate) =>
  req<{ id: number }>("/api/inventory", { method: "POST", body: JSON.stringify(body) });
export const updateInventoryItem = (id: number, body: Partial<InventoryItemCreate>) =>
  req("/api/inventory/" + id, { method: "PATCH", body: JSON.stringify(body) });
export const deleteInventoryItem = (id: number) =>
  req("/api/inventory/" + id, { method: "DELETE" });

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI AGENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ApprovalQueueItem {
  id: number;
  product_name: string;
  buy_price: number;
  buy_url: string;
  buy_source: string;
  buy_image: string;
  sell_platform: string;
  est_sell_price: number;
  net_profit_jpy: number;
  profit_rate: number;
  score: number;
  ceo_reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  approved_at?: string;
  rejected_at?: string;
  purchase_id?: number;
}

export interface AgentListing {
  id: number;
  purchase_id?: number;
  approval_queue_id?: number;
  sell_platform: string;
  title: string;
  description: string;
  price: number;
  price_currency: string;
  tags: string[];
  category_suggestion: string;
  shipping_notes: string;
  seo_keywords: string[];
  status: string;
  created_at: string;
}

export interface AgentSNSContent {
  id: number;
  purchase_id?: number;
  approval_queue_id?: number;
  post_type: string;
  platform: string;
  content: string;
  hashtags: string[];
  status: string;
  created_at: string;
}

export interface AgentSession {
  id: number;
  goal: string;
  budget_jpy?: number;
  status: string;
  scanned_count: number;
  queued_count: number;
  report: Record<string, unknown>;
  created_at: string;
  completed_at?: string;
}

// CEO エージェント（長時間リクエスト対応）
export const runCEOAgent = (body: { goal: string; budget_jpy?: number; max_turns?: number }) =>
  agentReq<{ session_id: number; status: string; queued_count: number; scanned_count: number; final_message: string }>(
    "/api/agents/ceo/run",
    { method: "POST", body: JSON.stringify(body) }
  );
export const getAgentSessions = () => req<AgentSession[]>("/api/agents/sessions");

// 承認キュー
export const getApprovalQueue = (status?: string) =>
  req<{ items: ApprovalQueueItem[]; pending_count: number; total_investment_jpy: number; total_expected_profit_jpy: number }>(
    `/api/agents/approval-queue${status ? "?status=" + status : ""}`
  );
export const approveQueueItem = (id: number) =>
  req<{ ok: boolean; purchase_id: number; message: string }>(
    `/api/agents/approval-queue/${id}/approve`,
    { method: "POST" }
  );
export const rejectQueueItem = (id: number, reason = "") =>
  req<{ ok: boolean }>(`/api/agents/approval-queue/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });

// 出品文
export const generateListing = (body: {
  approval_queue_id?: number;
  purchase_id?: number;
  product_name: string;
  buy_price: number;
  buy_source: string;
  sell_platform: string;
  est_sell_price: number;
  condition?: string;
  notes?: string;
}) => agentReq<{ listing_id: number; listing: AgentListing }>("/api/agents/listing/generate", {
  method: "POST",
  body: JSON.stringify(body),
});
export const getAgentListings = (purchase_id?: number) =>
  req<AgentListing[]>(`/api/agents/listings${purchase_id ? "?purchase_id=" + purchase_id : ""}`);
export const publishAgentListing = (id: number) =>
  req("/api/agents/listings/" + id + "/publish", { method: "POST" });

// SNS コンテンツ
export const generateSNSContent = (body: {
  approval_queue_id?: number;
  purchase_id?: number;
  product_name: string;
  buy_price: number;
  sell_price: number;
  profit_jpy: number;
  buy_source: string;
  sell_platform: string;
  post_type?: string;
  platforms?: string[];
}) => agentReq<{ saved: { platform: string; id: number }[]; content: Record<string, unknown> }>("/api/agents/sns/generate", {
  method: "POST",
  body: JSON.stringify(body),
});
export const getAgentSNSContent = (purchase_id?: number) =>
  req<AgentSNSContent[]>(`/api/agents/sns${purchase_id ? "?purchase_id=" + purchase_id : ""}`);
export const publishSNSContent = (id: number) =>
  req("/api/agents/sns/" + id + "/publish", { method: "POST" });
export const recordSNSPerformance = (id: number, body: { platform: string; likes?: number; comments?: number; reach?: number; led_to_sale?: boolean }) =>
  req("/api/agents/sns/" + id + "/performance", { method: "POST", body: JSON.stringify(body) });

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// モニタリング
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface MonitorStatus {
  running: boolean;
  thread_alive: boolean;
  scheduled_jobs: { job: string; next_run: string; interval: string }[];
  current_time: string;
}

export const getMonitorStatus = () => req<MonitorStatus>("/api/monitor/status");
export const runMonitorNow = (task: "daily_scan" | "stale_check" | "weekly_report") =>
  agentReq<{ ok: boolean; task: string; executed_at: string }>(
    "/api/monitor/run-now?task=" + task,
    { method: "POST" }
  );
export const saveMonitorSettings = (body: {
  daily_scan_time?: string;
  stale_check_enabled?: boolean;
  weekly_report_day?: string;
  weekly_report_time?: string;
}) => req("/api/monitor/settings", { method: "POST", body: JSON.stringify(body) });

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Research Agent
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface SeasonalIntelligence {
  current_month: number;
  current_season: string;
  hot_categories: string[];
  strategy_note: string;
  next_month_preview: { season: string; hot: string[] };
}

export const researchMarket = (keyword: string, task = "ebay_sold") =>
  req<Record<string, unknown>>(`/api/agents/research/market?keyword=${encodeURIComponent(keyword)}&task=${task}`, undefined, 30_000);
export const getSeasonalIntelligence = () => req<SeasonalIntelligence>("/api/agents/research/seasonal");
export const getOwnHistory = (days = 60) =>
  req<Record<string, unknown>>(`/api/agents/research/history?days=${days}`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// エージェント記憶
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface AgentMemoryItem {
  id: number;
  agent_name: string;
  memory_type: string;
  title: string;
  content: string;
  tags: string[];
  importance: number;
  access_count: number;
  created_at: string;
}

export const getAgentMemory = (params?: { agent_name?: string; memory_type?: string; q?: string }) => {
  const q = new URLSearchParams();
  if (params?.agent_name) q.set("agent_name", params.agent_name);
  if (params?.memory_type) q.set("memory_type", params.memory_type);
  if (params?.q) q.set("q", params.q);
  return req<AgentMemoryItem[]>(`/api/agents/memory?${q}`);
};
export const deleteMemory = (id: number) =>
  req("/api/agents/memory/" + id, { method: "DELETE" });

// 配送管理のクライアント側ストア
// 本物のAPI接続前段階のため localStorage で保持。
// 将来は fetch("/api/shipments") 等に差し替えるだけで済む形にしている。

import { useSyncExternalStore } from "react";
import type {
  Carrier,
  Shipment,
  ShipmentStatus,
  ShippingApiConfig,
} from "@/types/shipping";

const LS_SHIPMENTS = "bcg_shipments_v1";
const LS_CARRIERS  = "bcg_carriers_v1";
const LS_API_CFG   = "bcg_shipping_api_cfg_v1";

// ────────── 初期配送業者（要件にある7社） ──────────
const NOW = () => new Date().toISOString();

const DEFAULT_CARRIERS: Carrier[] = [
  {
    id: "yamato",
    name: "ヤマト運輸",
    trackingUrlTemplate: "https://toi.kuronekoyamato.co.jp/cgi-bin/tneko?number01={trackingNumber}",
    apiEnabled: false,
    apiProvider: "yamato",
    isActive: true,
    createdAt: NOW(),
    updatedAt: NOW(),
  },
  {
    id: "sagawa",
    name: "佐川急便",
    trackingUrlTemplate: "https://k2k.sagawa-exp.co.jp/p/sagawa/web/okurijoinput.jsp?okurijoNo={trackingNumber}",
    apiEnabled: false,
    apiProvider: "sagawa",
    isActive: true,
    createdAt: NOW(),
    updatedAt: NOW(),
  },
  {
    id: "japan_post",
    name: "日本郵便",
    trackingUrlTemplate: "https://trackings.post.japanpost.jp/services/srv/search/?reqCodeNo1={trackingNumber}",
    apiEnabled: false,
    apiProvider: "japan_post",
    isActive: true,
    createdAt: NOW(),
    updatedAt: NOW(),
  },
  {
    id: "fedex",
    name: "FedEx",
    trackingUrlTemplate: "https://www.fedex.com/fedextrack/?trknbr={trackingNumber}",
    apiEnabled: false,
    apiProvider: "fedex",
    isActive: true,
    createdAt: NOW(),
    updatedAt: NOW(),
  },
  {
    id: "dhl",
    name: "DHL",
    trackingUrlTemplate: "https://www.dhl.com/jp-ja/home/tracking.html?tracking-id={trackingNumber}",
    apiEnabled: false,
    apiProvider: "dhl",
    isActive: true,
    createdAt: NOW(),
    updatedAt: NOW(),
  },
  {
    id: "ups",
    name: "UPS",
    trackingUrlTemplate: "https://www.ups.com/track?tracknum={trackingNumber}",
    apiEnabled: false,
    apiProvider: "ups",
    isActive: true,
    createdAt: NOW(),
    updatedAt: NOW(),
  },
  {
    id: "other",
    name: "その他",
    trackingUrlTemplate: "",
    apiEnabled: false,
    apiProvider: null,
    isActive: true,
    createdAt: NOW(),
    updatedAt: NOW(),
  },
];

// ────────── 初期ダミー配送データ（要件の3件） ──────────
const DEFAULT_SHIPMENTS: Shipment[] = [
  {
    id: "shp_001",
    orderId: "M-20260516-001",
    productId: "p_001",
    productName: "ナイキ エアジョーダン1 ハイ OG シカゴ 27cm",
    marketplace: "メルカリ",
    buyerName: "田中 太郎",
    buyerAddress: "東京都渋谷区神宮前1-2-3 マンション101",
    carrierId: "yamato",
    carrierName: "ヤマト運輸",
    trackingNumber: null,
    trackingUrl: null,
    status: "preparing",
    scheduledShipDate: new Date(Date.now() + 86400000).toISOString(),
    shippedAt: null,
    estimatedDeliveryDate: null,
    deliveredAt: null,
    memo: "プチプチで梱包する",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: NOW(),
  },
  {
    id: "shp_002",
    orderId: "Y-20260515-014",
    productId: "p_002",
    productName: "セイコー 5 SNXS79 自動巻き腕時計",
    marketplace: "ヤフオク",
    buyerName: "佐藤 花子",
    buyerAddress: "大阪府大阪市北区梅田3-4-5",
    carrierId: "sagawa",
    carrierName: "佐川急便",
    trackingNumber: "1234-5678-9012",
    trackingUrl: "https://k2k.sagawa-exp.co.jp/p/sagawa/web/okurijoinput.jsp?okurijoNo=1234-5678-9012",
    status: "shipped",
    scheduledShipDate: new Date(Date.now() - 86400000).toISOString(),
    shippedAt: new Date(Date.now() - 43200000).toISOString(),
    estimatedDeliveryDate: new Date(Date.now() + 86400000).toISOString(),
    deliveredAt: null,
    memo: null,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: NOW(),
  },
  {
    id: "shp_003",
    orderId: "M-20260510-007",
    productId: "p_003",
    productName: "ポケモンカード リザードン 25周年プロモ",
    marketplace: "メルカリ",
    buyerName: "鈴木 一郎",
    buyerAddress: "愛知県名古屋市中区栄2-1-1",
    carrierId: "japan_post",
    carrierName: "日本郵便",
    trackingNumber: "JP123456789JP",
    trackingUrl: "https://trackings.post.japanpost.jp/services/srv/search/?reqCodeNo1=JP123456789JP",
    status: "delivered",
    scheduledShipDate: new Date(Date.now() - 604800000).toISOString(),
    shippedAt: new Date(Date.now() - 432000000).toISOString(),
    estimatedDeliveryDate: new Date(Date.now() - 259200000).toISOString(),
    deliveredAt: new Date(Date.now() - 172800000).toISOString(),
    memo: "ネコポス対応サイズ",
    createdAt: new Date(Date.now() - 691200000).toISOString(),
    updatedAt: NOW(),
  },
  {
    id: "shp_004",
    orderId: "E-20260514-022",
    productId: "p_004",
    productName: "Nintendo Switch 本体 有機ELモデル ホワイト",
    marketplace: "eBay",
    buyerName: "John Smith",
    buyerAddress: "123 Main St, Los Angeles, CA 90001, USA",
    carrierId: "dhl",
    carrierName: "DHL",
    trackingNumber: "5678901234",
    trackingUrl: "https://www.dhl.com/jp-ja/home/tracking.html?tracking-id=5678901234",
    status: "in_transit",
    scheduledShipDate: new Date(Date.now() - 259200000).toISOString(),
    shippedAt: new Date(Date.now() - 172800000).toISOString(),
    estimatedDeliveryDate: new Date(Date.now() + 432000000).toISOString(),
    deliveredAt: null,
    memo: "海外発送 / インボイス同梱済み",
    createdAt: new Date(Date.now() - 345600000).toISOString(),
    updatedAt: NOW(),
  },
];

const DEFAULT_API_CONFIG: ShippingApiConfig = {
  enabled: false,
  defaultCarrierId: null,
  autoSyncStatus: false,
  syncIntervalMin: 60,
  credentials: {},
  updatedAt: NOW(),
};

// ────────── 内部ヘルパ ──────────
function readLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLS<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("bcg-shipping-change", { detail: { key } }));
  } catch {
    // 容量超過などは黙って無視（UIに toast を出すのは呼び出し側）
  }
}

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ────────── 配送業者 ──────────
export function loadCarriers(): Carrier[] {
  const saved = readLS<Carrier[] | null>(LS_CARRIERS, null);
  if (saved && saved.length > 0) return saved;
  writeLS(LS_CARRIERS, DEFAULT_CARRIERS);
  return DEFAULT_CARRIERS;
}

export function saveCarriers(list: Carrier[]) {
  writeLS(LS_CARRIERS, list);
}

export function upsertCarrier(c: Partial<Carrier> & { name: string }): Carrier {
  const list = loadCarriers();
  if (c.id) {
    const idx = list.findIndex(x => x.id === c.id);
    if (idx >= 0) {
      const merged: Carrier = { ...list[idx], ...c, updatedAt: NOW() };
      list[idx] = merged;
      saveCarriers(list);
      return merged;
    }
  }
  const created: Carrier = {
    id: c.id ?? genId("car"),
    name: c.name,
    trackingUrlTemplate: c.trackingUrlTemplate ?? "",
    apiEnabled: c.apiEnabled ?? false,
    apiProvider: c.apiProvider ?? null,
    isActive: c.isActive ?? true,
    createdAt: NOW(),
    updatedAt: NOW(),
  };
  list.push(created);
  saveCarriers(list);
  return created;
}

export function deleteCarrier(id: string) {
  const list = loadCarriers().filter(c => c.id !== id);
  saveCarriers(list);
}

// ────────── 配送（Shipment） ──────────
export function loadShipments(): Shipment[] {
  const saved = readLS<Shipment[] | null>(LS_SHIPMENTS, null);
  if (saved) return saved;
  writeLS(LS_SHIPMENTS, DEFAULT_SHIPMENTS);
  return DEFAULT_SHIPMENTS;
}

export function saveShipments(list: Shipment[]) {
  writeLS(LS_SHIPMENTS, list);
}

export function upsertShipment(s: Partial<Shipment> & { productName: string; carrierId: string }): Shipment {
  const list = loadShipments();
  const carriers = loadCarriers();
  const carrier = carriers.find(c => c.id === s.carrierId);
  const carrierName = carrier?.name ?? s.carrierName ?? "未設定";

  if (s.id) {
    const idx = list.findIndex(x => x.id === s.id);
    if (idx >= 0) {
      const merged: Shipment = {
        ...list[idx],
        ...s,
        carrierName,
        trackingUrl: carrier && s.trackingNumber
          ? carrier.trackingUrlTemplate.replace("{trackingNumber}", encodeURIComponent(s.trackingNumber))
          : list[idx].trackingUrl,
        updatedAt: NOW(),
      };
      list[idx] = merged;
      saveShipments(list);
      return merged;
    }
  }

  const trackingNumber = s.trackingNumber ?? null;
  const created: Shipment = {
    id: s.id ?? genId("shp"),
    orderId: s.orderId ?? "",
    productId: s.productId ?? "",
    productName: s.productName,
    marketplace: s.marketplace ?? "",
    buyerName: s.buyerName ?? "",
    buyerAddress: s.buyerAddress ?? "",
    carrierId: s.carrierId,
    carrierName,
    trackingNumber,
    trackingUrl: carrier && trackingNumber
      ? carrier.trackingUrlTemplate.replace("{trackingNumber}", encodeURIComponent(trackingNumber))
      : null,
    status: (s.status as ShipmentStatus) ?? "pending",
    scheduledShipDate: s.scheduledShipDate ?? null,
    shippedAt: s.shippedAt ?? null,
    estimatedDeliveryDate: s.estimatedDeliveryDate ?? null,
    deliveredAt: s.deliveredAt ?? null,
    memo: s.memo ?? null,
    createdAt: NOW(),
    updatedAt: NOW(),
  };
  list.unshift(created);
  saveShipments(list);
  return created;
}

export function deleteShipment(id: string) {
  const list = loadShipments().filter(s => s.id !== id);
  saveShipments(list);
}

// ────────── API設定 ──────────
export function loadApiConfig(): ShippingApiConfig {
  const saved = readLS<ShippingApiConfig | null>(LS_API_CFG, null);
  if (saved) return saved;
  writeLS(LS_API_CFG, DEFAULT_API_CONFIG);
  return DEFAULT_API_CONFIG;
}

export function saveApiConfig(cfg: ShippingApiConfig) {
  writeLS(LS_API_CFG, { ...cfg, updatedAt: NOW() });
}

// ────────── 集計 ──────────
export interface ShippingStats {
  total: number;
  pending: number;
  preparing: number;
  shipped: number;
  inTransit: number;
  delivered: number;
  problem: number;
}

// ────────── React 19 用フック ──────────
// localStorage を「外部ストア」として購読する。setState を useEffect 内で呼ばない React 19 の推奨パターン。
const noopUnsub = () => {};
function subscribeShipping(cb: () => void) {
  if (typeof window === "undefined") return noopUnsub;
  const handler = () => cb();
  window.addEventListener("bcg-shipping-change", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("bcg-shipping-change", handler);
    window.removeEventListener("storage", handler);
  };
}

// 参照同一性を保つためのキャッシュ（毎回新しい配列を返すと無限ループになるため）
let _shipmentsCache: Shipment[] | null = null;
let _carriersCache: Carrier[] | null = null;
let _apiCfgCache: ShippingApiConfig | null = null;

function invalidateCache() {
  _shipmentsCache = null;
  _carriersCache = null;
  _apiCfgCache = null;
}

if (typeof window !== "undefined") {
  window.addEventListener("bcg-shipping-change", invalidateCache);
  window.addEventListener("storage", invalidateCache);
}

export function useShipments(): Shipment[] {
  return useSyncExternalStore(
    subscribeShipping,
    () => {
      if (_shipmentsCache === null) _shipmentsCache = loadShipments();
      return _shipmentsCache;
    },
    () => [] as Shipment[],
  );
}

export function useCarriers(): Carrier[] {
  return useSyncExternalStore(
    subscribeShipping,
    () => {
      if (_carriersCache === null) _carriersCache = loadCarriers();
      return _carriersCache;
    },
    () => [] as Carrier[],
  );
}

export function useApiConfig(): ShippingApiConfig | null {
  return useSyncExternalStore(
    subscribeShipping,
    () => {
      if (_apiCfgCache === null) _apiCfgCache = loadApiConfig();
      return _apiCfgCache;
    },
    () => null,
  );
}

export function summarize(list: Shipment[]): ShippingStats {
  const stats: ShippingStats = {
    total: list.length,
    pending: 0,
    preparing: 0,
    shipped: 0,
    inTransit: 0,
    delivered: 0,
    problem: 0,
  };
  for (const s of list) {
    if (s.status === "pending") stats.pending++;
    else if (s.status === "preparing") stats.preparing++;
    else if (s.status === "shipped") stats.shipped++;
    else if (s.status === "in_transit") stats.inTransit++;
    else if (s.status === "delivered") stats.delivered++;
    else if (s.status === "problem" || s.status === "returned" || s.status === "on_hold") stats.problem++;
  }
  return stats;
}

// 配送管理ドメインの型定義
// 将来的に配送業者API（ヤマトB2クラウド・佐川WMS・郵便Web等）と連携する前提で
// trackingNumber / status / shippedAt 等を持たせている。

export type ShipmentStatus =
  | "pending"      // 発送待ち
  | "preparing"    // 発送準備中
  | "shipped"      // 発送済み
  | "in_transit"   // 配送中
  | "delivered"    // 配達完了
  | "on_hold"      // 保留
  | "returned"     // 返送
  | "problem";     // 配送トラブル

export const SHIPMENT_STATUS_LABEL: Record<ShipmentStatus, string> = {
  pending:    "発送待ち",
  preparing:  "準備中",
  shipped:    "発送済み",
  in_transit: "配送中",
  delivered:  "配達完了",
  on_hold:    "保留",
  returned:   "返送",
  problem:    "トラブル",
};

export const SHIPMENT_STATUS_COLOR: Record<ShipmentStatus, string> = {
  pending:    "#E88500", // オレンジ
  preparing:  "#9B6BE0", // 紫
  shipped:    "#3B8EEA", // 青
  in_transit: "#3B8EEA",
  delivered:  "#1E9C3C", // 緑
  on_hold:    "#999999", // グレー
  returned:   "#E02E24", // 赤
  problem:    "#E02E24",
};

export interface Shipment {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  marketplace: string;            // 例: メルカリ / ヤフオク / eBay
  buyerName: string;
  buyerAddress: string;
  carrierId: string;
  carrierName: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  status: ShipmentStatus;
  scheduledShipDate: string | null;     // ISO 文字列
  shippedAt: string | null;
  estimatedDeliveryDate: string | null;
  deliveredAt: string | null;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Carrier {
  id: string;
  name: string;
  trackingUrlTemplate: string; // 例: https://example.com/track?number={trackingNumber}
  apiEnabled: boolean;
  apiProvider: string | null;  // 例: "yamato" / "sagawa" / "japan_post"
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 配送API全体設定（将来のサーバー側設定に対応する想定）
export interface ShippingApiConfig {
  enabled: boolean;
  defaultCarrierId: string | null;
  autoSyncStatus: boolean;        // 配達ステータスの自動更新ON/OFF
  syncIntervalMin: number;        // 同期間隔（分）
  // 業者ごとのAPIキー（将来用に格納だけしておく）
  credentials: Record<string, ShippingApiCredential>;
  updatedAt: string;
}

export interface ShippingApiCredential {
  apiKey: string;
  apiSecret: string;
  accountId: string;
  endpoint: string;
}

export function makeTrackingUrl(template: string, trackingNumber: string | null): string | null {
  if (!template || !trackingNumber) return null;
  return template.replace("{trackingNumber}", encodeURIComponent(trackingNumber));
}

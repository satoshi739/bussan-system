/**
 * 概算送料テーブル（MVP）
 * 日本郵便ベース。配送API連携前の暫定値。
 * 重量・サイズから「最も合理的な配送方法」と料金目安を返す。
 */

export type SizeCode = "60" | "80" | "100" | "120" | "140" | "160" | "170";
export type AreaCode = "same" | "near" | "middle" | "far";

const SIZE_LABELS: Record<SizeCode, string> = {
  "60": "60サイズ",
  "80": "80サイズ",
  "100": "100サイズ",
  "120": "120サイズ",
  "140": "140サイズ",
  "160": "160サイズ",
  "170": "170サイズ",
};

export const SIZE_OPTIONS: { value: SizeCode; label: string; hint: string }[] = [
  { value: "60", label: "60サイズ", hint: "3辺合計60cm・重量2kg以内（小箱）" },
  { value: "80", label: "80サイズ", hint: "3辺合計80cm・重量5kg以内（書籍数冊）" },
  { value: "100", label: "100サイズ", hint: "3辺合計100cm・重量10kg以内（家電小物）" },
  { value: "120", label: "120サイズ", hint: "3辺合計120cm・重量15kg以内（中型家電）" },
  { value: "140", label: "140サイズ", hint: "3辺合計140cm・重量20kg以内（大型家電）" },
  { value: "160", label: "160サイズ", hint: "3辺合計160cm・重量25kg以内（自転車等）" },
  { value: "170", label: "170サイズ", hint: "3辺合計170cm・重量25kg以内（最大）" },
];

export const AREA_OPTIONS: { value: AreaCode; label: string }[] = [
  { value: "same", label: "同一県内" },
  { value: "near", label: "近隣（隣接県）" },
  { value: "middle", label: "中距離（関東〜関西など）" },
  { value: "far", label: "遠距離（北海道・沖縄など）" },
];

/**
 * 軽量小物（〜1kg・小型）はゆうパケット相当
 * それ以外はゆうパック相当（サイズ別）
 */
const YU_PACKET_FEE = 250; // ゆうパケット相当（〜1kg・厚さ3cm以内）

// ゆうパック相当の基本料金テーブル（円・税込み概算）
const YU_PACK_BASE: Record<SizeCode, Record<AreaCode, number>> = {
  "60":  { same: 810,  near: 870,  middle: 1030, far: 1330 },
  "80":  { same: 1030, near: 1100, middle: 1280, far: 1580 },
  "100": { same: 1280, near: 1350, middle: 1530, far: 1830 },
  "120": { same: 1530, near: 1610, middle: 1780, far: 2080 },
  "140": { same: 1780, near: 1860, middle: 2030, far: 2330 },
  "160": { same: 2030, near: 2110, middle: 2280, far: 2580 },
  "170": { same: 2330, near: 2410, middle: 2580, far: 2880 },
};

export type ShippingEstimate = {
  fee: number;
  method: string;
  note: string;
};

export function estimateShipping(params: {
  sizeCode?: SizeCode | null;
  weightG?: number | null;
  area?: AreaCode | null;
}): ShippingEstimate {
  const { sizeCode, weightG, area } = params;
  const usedArea: AreaCode = area ?? "middle";

  // 軽量小物の判定（明示的にsizeなし＋1kg以下）
  if (!sizeCode && weightG != null && weightG <= 1000) {
    return {
      fee: YU_PACKET_FEE,
      method: "ゆうパケット相当",
      note: "厚さ3cm以内・重量1kg以内を想定。実寸で変動あり。",
    };
  }

  if (!sizeCode) {
    return {
      fee: 1280,
      method: "ゆうパック100サイズ目安",
      note: "サイズ未指定のため100サイズ・中距離で概算。",
    };
  }

  const fee = YU_PACK_BASE[sizeCode][usedArea];
  return {
    fee,
    method: `ゆうパック ${SIZE_LABELS[sizeCode]}`,
    note: `${AREA_OPTIONS.find(a => a.value === usedArea)?.label ?? "中距離"}向け概算。実費はクロネコ等で変動。`,
  };
}

export const SHIPPING_TABLE_VERSION = "2026-05-mvp-yupack";

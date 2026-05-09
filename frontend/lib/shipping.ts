export type ShippingOption = {
  label: string;
  value: string;
  fee: number;
  disabled?: boolean;
};

export const SHIPPING_OPTIONS: ShippingOption[] = [
  { label: "手入力", value: "manual", fee: 0 },
  { label: "── メルカリ便（ヤマト） ──", value: "", fee: 0, disabled: true },
  { label: "らくらくメルカリ便 ネコポス", value: "mercari_nekoposu", fee: 210 },
  { label: "らくらくメルカリ便 宅急便コンパクト", value: "mercari_compact", fee: 450 },
  { label: "らくらくメルカリ便 60サイズ", value: "mercari_60", fee: 750 },
  { label: "らくらくメルカリ便 80サイズ", value: "mercari_80", fee: 870 },
  { label: "らくらくメルカリ便 100サイズ", value: "mercari_100", fee: 1050 },
  { label: "らくらくメルカリ便 120サイズ", value: "mercari_120", fee: 1200 },
  { label: "らくらくメルカリ便 140サイズ", value: "mercari_140", fee: 1450 },
  { label: "らくらくメルカリ便 160サイズ", value: "mercari_160", fee: 1700 },
  { label: "── メルカリ便（郵便） ──", value: "", fee: 0, disabled: true },
  { label: "ゆうゆうメルカリ便 ゆうパケット", value: "mercari_yupacket", fee: 230 },
  { label: "ゆうゆうメルカリ便 ゆうパケットポスト", value: "mercari_yupacketpost", fee: 215 },
  { label: "ゆうゆうメルカリ便 60サイズ", value: "mercari_yu60", fee: 770 },
  { label: "ゆうゆうメルカリ便 80サイズ", value: "mercari_yu80", fee: 870 },
  { label: "ゆうゆうメルカリ便 100サイズ", value: "mercari_yu100", fee: 1070 },
  { label: "── ヤフオク・PayPayフリマ ──", value: "", fee: 0, disabled: true },
  { label: "おてがる配送 ネコポス", value: "yahoo_nekoposu", fee: 210 },
  { label: "おてがる配送 宅急便60", value: "yahoo_60", fee: 700 },
  { label: "おてがる配送 宅急便80", value: "yahoo_80", fee: 800 },
  { label: "おてがる配送 宅急便100", value: "yahoo_100", fee: 1000 },
  { label: "おてがる配送 宅急便120", value: "yahoo_120", fee: 1100 },
  { label: "おてがる配送 宅急便140", value: "yahoo_140", fee: 1300 },
  { label: "おてがる配送 宅急便160", value: "yahoo_160", fee: 1500 },
  { label: "── 汎用 ──", value: "", fee: 0, disabled: true },
  { label: "クリックポスト", value: "clickpost", fee: 185 },
  { label: "ゆうパケット", value: "yupacket", fee: 230 },
  { label: "定形外郵便（規格内・250g）", value: "teikei_250", fee: 250 },
  { label: "定形外郵便（規格内・500g）", value: "teikei_500", fee: 390 },
  { label: "定形外郵便（規格外・1kg）", value: "teikei_ext_1000", fee: 580 },
];

export function getShippingFee(value: string): number {
  return SHIPPING_OPTIONS.find(o => o.value === value)?.fee ?? 0;
}

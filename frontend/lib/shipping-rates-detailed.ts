/**
 * 配送料金詳細計算（実料金マトリックス）
 *
 * 既存の shipping-table.ts (概算) を補完する詳細データ。
 * 47都道府県 → キャリア別ゾーン マッピング + サイズ別料金テーブル。
 *
 * 出典: ヤマト運輸 宅急便運賃一覧表（2025年10月改定）
 * https://www.kuronekoyamato.co.jp/ytc/search/estimate/ichiran.html
 *
 * 現状: ヤマト関東発のみ実装（MVP）。他発地・他キャリアは順次追加。
 */

export type SizeCode = "60" | "80" | "100" | "120" | "140" | "160" | "180" | "200";

export const SIZE_CODES: SizeCode[] = ["60", "80", "100", "120", "140", "160", "180", "200"];

export type Carrier = "yamato" | "sagawa" | "japanpost";

export const PREFECTURES = [
  "北海道",
  "青森", "岩手", "宮城", "秋田", "山形", "福島",
  "茨城", "栃木", "群馬", "埼玉", "千葉", "東京", "神奈川",
  "新潟", "富山", "石川", "福井", "山梨", "長野",
  "岐阜", "静岡", "愛知", "三重",
  "滋賀", "京都", "大阪", "兵庫", "奈良", "和歌山",
  "鳥取", "島根", "岡山", "広島", "山口",
  "徳島", "香川", "愛媛", "高知",
  "福岡", "佐賀", "長崎", "熊本", "大分", "宮崎", "鹿児島",
  "沖縄",
] as const;
export type Prefecture = (typeof PREFECTURES)[number];

// ヤマトのゾーン区分
export type YamatoZone =
  | "北海道" | "北東北" | "南東北" | "関東" | "信越" | "北陸"
  | "中部" | "関西" | "中国" | "四国" | "九州" | "沖縄";

export const PREFECTURE_TO_YAMATO_ZONE: Record<Prefecture, YamatoZone> = {
  北海道: "北海道",
  青森: "北東北", 岩手: "北東北", 秋田: "北東北",
  宮城: "南東北", 山形: "南東北", 福島: "南東北",
  茨城: "関東", 栃木: "関東", 群馬: "関東", 埼玉: "関東",
  千葉: "関東", 東京: "関東", 神奈川: "関東", 山梨: "関東",
  新潟: "信越", 長野: "信越",
  富山: "北陸", 石川: "北陸", 福井: "北陸",
  岐阜: "中部", 静岡: "中部", 愛知: "中部", 三重: "中部",
  滋賀: "関西", 京都: "関西", 大阪: "関西", 兵庫: "関西",
  奈良: "関西", 和歌山: "関西",
  鳥取: "中国", 島根: "中国", 岡山: "中国", 広島: "中国", 山口: "中国",
  徳島: "四国", 香川: "四国", 愛媛: "四国", 高知: "四国",
  福岡: "九州", 佐賀: "九州", 長崎: "九州", 熊本: "九州",
  大分: "九州", 宮崎: "九州", 鹿児島: "九州",
  沖縄: "沖縄",
};

// ヤマト宅急便 料金マトリックス（円・税込）
// fromZone -> toZone -> size -> 料金
// 現状: 関東発のみ実装。他発地は順次追加予定。
type YamatoRates = Partial<Record<YamatoZone, Record<YamatoZone, Record<SizeCode, number>>>>;

export const YAMATO_RATES: YamatoRates = {
  関東: {
    北海道: { "60": 790, "80": 1090, "100": 1410, "120": 1730, "140": 2090, "160": 2410, "180": 3030, "200": 3690 },
    北東北: { "60": 1460, "80": 1740, "100": 2050, "120": 2610, "140": 3250, "160": 3630, "180": 5220, "200": 6540 },
    南東北: { "60": 1060, "80": 1350, "100": 1650, "120": 2170, "140": 2780, "160": 3160, "180": 4480, "200": 5410 },
    関東:   { "60": 940,  "80": 1230, "100": 1530, "120": 2040, "140": 2630, "160": 3020, "180": 3680, "200": 4470 },
    信越:   { "60": 940,  "80": 1230, "100": 1530, "120": 2040, "140": 2630, "160": 3020, "180": 3680, "200": 4470 },
    北陸:   { "60": 940,  "80": 1230, "100": 1530, "120": 2040, "140": 2630, "160": 3020, "180": 3680, "200": 4470 },
    中部:   { "60": 940,  "80": 1230, "100": 1530, "120": 2040, "140": 2630, "160": 3020, "180": 3680, "200": 4470 },
    関西:   { "60": 1060, "80": 1350, "100": 1650, "120": 2170, "140": 2780, "160": 3160, "180": 4480, "200": 5410 },
    中国:   { "60": 1190, "80": 1480, "100": 1790, "120": 2310, "140": 2930, "160": 3320, "180": 4900, "200": 6220 },
    四国:   { "60": 1190, "80": 1480, "100": 1790, "120": 2310, "140": 2930, "160": 3320, "180": 4900, "200": 6220 },
    九州:   { "60": 1460, "80": 1740, "100": 2050, "120": 2610, "140": 3250, "160": 3630, "180": 5220, "200": 6540 },
    沖縄:   { "60": 1460, "80": 2070, "100": 2710, "120": 3360, "140": 4030, "160": 4680, "180": 7210, "200": 8860 },
  },
};

export type DetailedEstimate = {
  fee: number;
  carrier: Carrier;
  method: string;
  note: string;
};

/**
 * 都道府県＋サイズ＋キャリアから実料金を返す。
 * データ未整備の組み合わせは null を返す。
 */
export function estimateShippingDetailed(opts: {
  carrier: Carrier;
  size: SizeCode;
  fromPref: Prefecture;
  toPref: Prefecture;
}): DetailedEstimate | null {
  const { carrier, size, fromPref, toPref } = opts;

  if (carrier === "yamato") {
    const fromZone = PREFECTURE_TO_YAMATO_ZONE[fromPref];
    const toZone = PREFECTURE_TO_YAMATO_ZONE[toPref];
    const fromRates = YAMATO_RATES[fromZone];
    if (!fromRates) return null;
    const toRates = fromRates[toZone];
    if (!toRates) return null;
    const fee = toRates[size];
    if (fee == null) return null;
    return {
      fee,
      carrier: "yamato",
      method: `ヤマト宅急便 ${size}サイズ`,
      note: `${fromZone}発 → ${toZone}着（2025年10月改定運賃・税込）`,
    };
  }

  // 佐川・日本郵便は未実装（次フェーズ）
  return null;
}

/**
 * 利用可能な「発地ゾーン」一覧（実装済みデータ）
 */
export function availableFromZones(carrier: Carrier): YamatoZone[] {
  if (carrier === "yamato") {
    return Object.keys(YAMATO_RATES) as YamatoZone[];
  }
  return [];
}

export const SHIPPING_RATES_VERSION = "2026-05-13-yamato-kanto-only";

/**
 * 出品プレビューのバリデーション
 * - 必須項目チェック
 * - 各プラットフォーム共通の禁止/注意語の検出
 * - プラットフォーム固有のルール（メルカリの40文字・価格範囲・出品禁止物）
 */

import type { TargetPlatform } from "./publish-adapter";

export type WarningLevel = "error" | "warn";

export type ValidationWarning = {
  level: WarningLevel;
  field?: string;
  message: string;
};

export type ValidationInput = {
  title: string;
  description: string;
  price: number;
  shippingFee: number;
  category?: string | null;
  imageUrls?: string[];
  platform?: TargetPlatform;
};

/** メルカリの仕様レンジ */
const MERCARI_TITLE_MAX = 40;
const MERCARI_MIN_PRICE = 300;
const MERCARI_MAX_PRICE = 9_999_999;

/**
 * 主要モール共通で問題になりやすい語。
 * MVP段階なので軽め。誤検出はwarnレベルに留めてユーザーに最終判断させる。
 */
const RISK_PATTERNS: { pattern: RegExp; message: string; level: WarningLevel }[] = [
  // 偽ブランド系
  { pattern: /(コピー品|偽物|レプリカ|スーパーコピー|n級)/i, level: "error",
    message: "偽ブランド・コピー品を示す表現が含まれます。各モールで規約違反です。" },
  // 医薬品・規制品
  { pattern: /(処方箋|医薬品|劇薬|向精神薬)/, level: "error",
    message: "医薬品関連の表現は出品禁止対象になり得ます。表現を見直してください。" },
  { pattern: /(銃|拳銃|刀剣|麻薬|大麻|覚醒剤)/, level: "error",
    message: "出品禁止カテゴリに該当する可能性があります。" },
  // 健康・効能誇張（薬機法）
  { pattern: /(治る|効く|完治|診断|治療)/, level: "warn",
    message: "効能・治療表現は薬機法上問題になり得ます。" },
  // 誇張表現
  { pattern: /(完全無欠|絶対に|100%確実)/, level: "warn",
    message: "誇張表現は購入者トラブルの原因になります。" },
  // 個人情報
  { pattern: /(\d{3}-\d{4}-\d{4})/, level: "warn",
    message: "電話番号らしき文字列が含まれます。個人情報を出品文に含めないでください。" },
];

/** メルカリ固有の出品禁止/注意パターン */
const MERCARI_RISK_PATTERNS: { pattern: RegExp; message: string; level: WarningLevel }[] = [
  { pattern: /(現金|紙幣|金券|商品券|ギフトカード|Amazon ?ギフト|iTunes ?カード|QUO ?カード|プリペイドカード)/i,
    level: "error",
    message: "現金・金券・電子マネー類はメルカリで出品禁止です。" },
  { pattern: /(チケット.{0,10}(定価以上|転売|高額)|転売目的|転売ヤー)/i,
    level: "error",
    message: "チケットの転売・定価以上の出品はメルカリで禁止されています。" },
  { pattern: /(無在庫|手元になし|手元にない|海外から直送)/i,
    level: "error",
    message: "メルカリでは原則「手元にある商品のみ」出品可能。無在庫転売は禁止です。" },
  { pattern: /(タバコ|たばこ|電子タバコ|加熱式タバコ|アイコス|プルームテック|IQOS|VAPE|リキッド)/i,
    level: "warn",
    message: "たばこ・電子タバコ関連は一部のみ出品可（本体OK・中身NGなど）。要確認。" },
  { pattern: /(医療用|処方|診療)/i,
    level: "warn",
    message: "医療関連の表現はメルカリで規制対象になりやすいです。" },
];

export function validateListing(input: ValidationInput): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const isMercari = input.platform === "mercari";

  // 必須項目（タイトル）
  if (!input.title || input.title.trim().length === 0) {
    warnings.push({ level: "error", field: "title", message: "タイトルが空です。" });
  } else if (isMercari && input.title.length > MERCARI_TITLE_MAX) {
    warnings.push({
      level: "error",
      field: "title",
      message: `メルカリのタイトルは${MERCARI_TITLE_MAX}文字以内。現在${input.title.length}文字。`,
    });
  } else if (input.title.length > 80) {
    warnings.push({ level: "warn", field: "title", message: "タイトルが80文字超のため、一部モールで切り捨てられます。" });
  } else if (input.title.length < 10) {
    warnings.push({ level: "warn", field: "title", message: "タイトルが短すぎます。検索ヒットしにくくなる恐れがあります。" });
  }

  // 商品説明
  if (!input.description || input.description.trim().length === 0) {
    warnings.push({ level: "error", field: "description", message: "商品説明が空です。" });
  } else if (input.description.length < 30) {
    warnings.push({ level: "warn", field: "description", message: "説明文が短すぎます（30文字未満）。" });
  }

  // 価格
  if (!Number.isFinite(input.price) || input.price <= 0) {
    warnings.push({ level: "error", field: "price", message: "販売価格が未入力または不正です。" });
  } else if (isMercari) {
    if (input.price < MERCARI_MIN_PRICE) {
      warnings.push({
        level: "error",
        field: "price",
        message: `メルカリの最低出品価格は¥${MERCARI_MIN_PRICE.toLocaleString()}です。`,
      });
    } else if (input.price > MERCARI_MAX_PRICE) {
      warnings.push({
        level: "error",
        field: "price",
        message: `メルカリの上限価格は¥${MERCARI_MAX_PRICE.toLocaleString()}です。`,
      });
    }
  }

  if (!Number.isFinite(input.shippingFee) || input.shippingFee < 0) {
    warnings.push({ level: "warn", field: "shippingFee", message: "送料が未設定です。" });
  }

  if (!input.category) {
    warnings.push({ level: "warn", field: "category", message: "カテゴリが未選択です。" });
  }

  if (!input.imageUrls || input.imageUrls.length === 0) {
    warnings.push({
      level: isMercari ? "error" : "warn",
      field: "imageUrls",
      message: isMercari
        ? "メルカリは画像必須です。1枚以上登録してください。"
        : "画像が登録されていません。多くのモールで成約率が大きく下がります。",
    });
  }

  // 危険表現（全プラットフォーム共通）
  const fullText = `${input.title}\n${input.description}`;
  for (const { pattern, level, message } of RISK_PATTERNS) {
    if (pattern.test(fullText)) warnings.push({ level, message });
  }

  // メルカリ固有の出品禁止語
  if (isMercari) {
    for (const { pattern, level, message } of MERCARI_RISK_PATTERNS) {
      if (pattern.test(fullText)) warnings.push({ level, message });
    }
  }

  return warnings;
}

export function hasBlockingError(warnings: ValidationWarning[]): boolean {
  return warnings.some(w => w.level === "error");
}

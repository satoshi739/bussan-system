/**
 * 出品プレビューのバリデーション
 * - 必須項目チェック
 * - 各プラットフォーム共通の禁止/注意語の検出
 */

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
};

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

export function validateListing(input: ValidationInput): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // 必須項目
  if (!input.title || input.title.trim().length === 0) {
    warnings.push({ level: "error", field: "title", message: "タイトルが空です。" });
  } else if (input.title.length > 80) {
    warnings.push({ level: "warn", field: "title", message: "タイトルが80文字超のため、一部モールで切り捨てられます。" });
  } else if (input.title.length < 10) {
    warnings.push({ level: "warn", field: "title", message: "タイトルが短すぎます。検索ヒットしにくくなる恐れがあります。" });
  }

  if (!input.description || input.description.trim().length === 0) {
    warnings.push({ level: "error", field: "description", message: "商品説明が空です。" });
  } else if (input.description.length < 30) {
    warnings.push({ level: "warn", field: "description", message: "説明文が短すぎます（30文字未満）。" });
  }

  if (!Number.isFinite(input.price) || input.price <= 0) {
    warnings.push({ level: "error", field: "price", message: "販売価格が未入力または不正です。" });
  }

  if (!Number.isFinite(input.shippingFee) || input.shippingFee < 0) {
    warnings.push({ level: "warn", field: "shippingFee", message: "送料が未設定です。" });
  }

  if (!input.category) {
    warnings.push({ level: "warn", field: "category", message: "カテゴリが未選択です。" });
  }

  if (!input.imageUrls || input.imageUrls.length === 0) {
    warnings.push({ level: "warn", field: "imageUrls", message: "画像が登録されていません。多くのモールで成約率が大きく下がります。" });
  }

  // 危険表現
  const fullText = `${input.title}\n${input.description}`;
  for (const { pattern, level, message } of RISK_PATTERNS) {
    if (pattern.test(fullText)) warnings.push({ level, message });
  }

  return warnings;
}

export function hasBlockingError(warnings: ValidationWarning[]): boolean {
  return warnings.some(w => w.level === "error");
}

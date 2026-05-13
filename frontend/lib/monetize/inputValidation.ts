export interface ProjectInputErrors {
  name?: string;
  genre?: string;
  target?: string;
  product_url?: string;
  lp_url?: string;
  blog_url?: string;
  affiliate_link?: string;
  memo?: string;
}

export interface NormalizedProjectInput {
  name: string;
  genre: string;
  target: string;
  productUrl: string | null;
  lpUrl: string | null;
  blogUrl: string | null;
  affiliateLink: string | null;
  memo: string | null;
}

const URL_RE = /^https?:\/\/[^\s]+$/i;

function nullIfBlank(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

function checkUrl(field: keyof ProjectInputErrors, value: string | null, errors: ProjectInputErrors) {
  if (value === null) return;
  if (!URL_RE.test(value)) {
    errors[field] = "URLの形式が正しくありません";
  }
}

export function validateProjectInput(body: unknown): {
  errors: ProjectInputErrors | null;
  data: NormalizedProjectInput | null;
} {
  const errors: ProjectInputErrors = {};
  if (!body || typeof body !== "object") {
    return { errors: { name: "リクエストボディが不正です" }, data: null };
  }
  const obj = body as Record<string, unknown>;

  const name = typeof obj.name === "string" ? obj.name.trim() : "";
  const genre = typeof obj.genre === "string" ? obj.genre.trim() : "";
  const target = typeof obj.target === "string" ? obj.target.trim() : "";

  if (name.length === 0) errors.name = "案件名を入力してください";
  else if (name.length > 200) errors.name = "案件名は200文字以内で入力してください";

  if (genre.length === 0) errors.genre = "ジャンルを入力してください";
  else if (genre.length > 100) errors.genre = "ジャンルは100文字以内で入力してください";

  if (target.length === 0) errors.target = "ターゲットを入力してください";
  else if (target.length > 500) errors.target = "ターゲットは500文字以内で入力してください";

  const productUrl = nullIfBlank(obj.product_url);
  const lpUrl = nullIfBlank(obj.lp_url);
  const blogUrl = nullIfBlank(obj.blog_url);
  const affiliateLink = nullIfBlank(obj.affiliate_link);
  const memo = nullIfBlank(obj.memo);

  checkUrl("product_url", productUrl, errors);
  checkUrl("lp_url", lpUrl, errors);
  checkUrl("blog_url", blogUrl, errors);
  checkUrl("affiliate_link", affiliateLink, errors);

  if (memo !== null && memo.length > 2000) {
    errors.memo = "メモは2000文字以内で入力してください";
  }

  if (Object.keys(errors).length > 0) {
    return { errors, data: null };
  }

  return {
    errors: null,
    data: { name, genre, target, productUrl, lpUrl, blogUrl, affiliateLink, memo },
  };
}

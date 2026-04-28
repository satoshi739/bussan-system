import Stripe from "stripe";

// ビルド時はAPIキーがなくてもエラーにならないよう遅延初期化
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key, {
      apiVersion: "2026-03-25.dahlia",
      typescript: true,
    });
  }
  return _stripe;
}

// 後方互換のため（サーバーアクションから直接使う場合）
export const stripe = {
  get customers() { return getStripe().customers; },
  get subscriptions() { return getStripe().subscriptions; },
  get checkout() { return getStripe().checkout; },
  get billingPortal() { return getStripe().billingPortal; },
  get webhooks() { return getStripe().webhooks; },
};

// プランの定義
export const PLANS = {
  FREE: {
    name: "フリー",
    nameEn: "Free",
    price: 0,
    priceId: null as string | null,
    features: [
      "仕入れ管理（30件まで）",
      "利益計算",
      "ダッシュボード",
    ],
    limits: {
      maxPurchases: 30,
      scanner: false,
      search: false,
      watchlist: false,
      globalCalc: false,
      advancedReports: false,
    },
  },
  PRO: {
    name: "Standard",
    nameEn: "Standard",
    price: 9800,
    priceId: "https://buy.stripe.com/cNi5kC2XTbUUd4DdUfgjC00",
    features: [
      "仕入れ管理（無制限）",
      "利益計算",
      "スキャナー（商品検索）",
      "価格検索",
      "ウォッチリスト",
      "グローバル計算",
      "レポート",
    ],
    limits: {
      maxPurchases: Infinity,
      scanner: true,
      search: true,
      watchlist: true,
      globalCalc: true,
      advancedReports: false,
    },
  },
  BUSINESS: {
    name: "Pro",
    nameEn: "Pro",
    price: 19800,
    priceId: "https://buy.stripe.com/dRmaEW2XTf762pZ5nJgjC01",
    features: [
      "Standardの全機能",
      "高度な分析レポート",
      "CSVエクスポート",
      "優先サポート",
    ],
    limits: {
      maxPurchases: Infinity,
      scanner: true,
      search: true,
      watchlist: true,
      globalCalc: true,
      advancedReports: true,
    },
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export function getPlanLimits(plan: PlanKey) {
  return PLANS[plan].limits;
}

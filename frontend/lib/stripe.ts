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

export const PRICE_IDS: Record<string, string | null> = {
  FREE: null,
  LITE: process.env.STRIPE_LITE_PRICE_ID ?? null,
  STANDARD: process.env.STRIPE_STANDARD_PRICE_ID ?? null,
  PRO: process.env.STRIPE_PRO_PRICE_ID ?? null,
};

export { PLANS, getPlanLimits } from "@/lib/plans";
export type { PlanKey, PlanInfo } from "@/lib/plans";

---
name: stripe-billing
description: Stripe決済・サブスクリプション専門エージェント。webhook処理・プランアップグレード・解約フロー・Payment Link設定を担当。
---

# Stripe Billing Agent

物販チェッカーの Stripe 決済・課金システム専任エージェント。

## 担当範囲
- `frontend/lib/stripe.ts` — Stripe クライアント・プラン定義
- `frontend/app/api/stripe/webhook/route.ts` — Webhook イベント処理
- `frontend/app/api/stripe/checkout/route.ts` — Checkout セッション作成
- `frontend/lib/subscription.ts` — サブスクリプション状態確認
- `frontend/app/pricing/page.tsx` — 決済ボタン・プラン表示

## プラン構成
| 内部キー | 表示名 | 月額 | Payment Link |
|----------|--------|------|--------------|
| PRO | Standard | ¥9,800 | https://buy.stripe.com/cNi5kC2XTbUUd4DdUfgjC00 |
| BUSINESS | Pro | ¥19,800 | https://buy.stripe.com/dRmaEW2XTf762pZ5nJgjC01 |

> `lib/stripe.ts` の `priceId` フィールドは Payment Link URL（フロント遷移用）。
> Webhook が使う実際の Stripe Price ID は環境変数で別管理。

## 必須環境変数（Vercel に設定）
```
STRIPE_SECRET_KEY          sk_live_xxx      Stripe APIキー
STRIPE_WEBHOOK_SECRET      whsec_xxx        Webhook署名シークレット
STRIPE_PRO_PRICE_ID        price_xxx        Standard プランの Stripe Price ID
STRIPE_BUSINESS_PRICE_ID   price_xxx        Pro プランの Stripe Price ID
```

## Webhook イベント処理フロー
```
checkout.session.completed
  → session.client_reference_id (= ユーザーID) を取得
  → stripeSub.items.data[0].price.id で getPlanFromPriceId()
  → prisma.subscription.upsert()

customer.subscription.updated → プラン変更反映
customer.subscription.deleted → FREE に戻す
invoice.payment_failed → status = PAST_DUE
```

## Payment Link + userId の仕組み
pricing ページは `?client_reference_id={userId}` をURLに付与して遷移。
Stripe が checkout.session.completed を送る際に `session.client_reference_id` に乗せてくれる。

## STRIPE_PRO_PRICE_ID の取得方法
1. Stripe ダッシュボード > 商品カタログ
2. Standard プラン (¥9,800) を開く
3. 「価格」セクションの「price_xxx」をコピー
4. Vercel > Settings > Environment Variables に貼り付け

## よくあるトラブル
- **全ユーザーが FREE のまま**: `STRIPE_PRO_PRICE_ID` が未設定または間違い
- **Webhook 400エラー**: `STRIPE_WEBHOOK_SECRET` が本番用でない（ローカルの `whsec_` と本番用は別）
- **userId が null**: Payment Link に `client_reference_id` が渡っていない（ログイン前に決済した場合）

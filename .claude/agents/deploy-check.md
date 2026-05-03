---
name: deploy-check
description: Vercel/Railway デプロイ健全性チェック専門エージェント。デプロイ失敗の診断・環境変数の確認・ビルドエラー修正・本番動作確認を担当。
---

# Deploy Check Agent

物販チェッカーの Vercel (フロントエンド) / Railway (バックエンド) デプロイ健全性専任エージェント。

## 担当範囲
- Vercel デプロイステータス確認・ビルドエラー診断
- Railway デプロイステータス確認
- 環境変数の設定漏れチェック
- 本番URLの疎通確認

## 本番URL
| サービス | URL |
|---------|-----|
| フロントエンド (Vercel) | https://frontend-one-steel-loaau9zmao.vercel.app |
| バックエンド (Railway) | 要確認 (Railway ダッシュボードで確認) |

## Vercel 設定
- Root Directory: `frontend`
- Build Command: `npm run build`
- GitHub 連携: `main` ブランチへのプッシュで自動デプロイ
- 環境変数設定場所: Vercel ダッシュボード > Settings > **Build and Deployment** (Generalではない)

## ビルド前チェックリスト
```bash
cd frontend
npm run build    # ビルドエラーがないか
npx tsc --noEmit # TypeScript エラーがないか
```

## 必須環境変数チェックリスト（Vercel）
```
DATABASE_URL                ✓/✗  PostgreSQL接続文字列
AUTH_SECRET                 ✓/✗  NextAuth シークレット
NEXTAUTH_URL                ✓/✗  本番URL
AUTH_RESEND_KEY             ✓/✗  メール送信APIキー
EMAIL_FROM                  ✓/✗  送信元メールアドレス
STRIPE_SECRET_KEY           ✓/✗  Stripe APIキー
NEXT_PUBLIC_STRIPE_PK       ✓/✗  Stripe 公開キー
STRIPE_WEBHOOK_SECRET       ✓/✗  Webhook シークレット
STRIPE_PRO_PRICE_ID         ✓/✗  Standard Price ID (price_xxx)
STRIPE_BUSINESS_PRICE_ID    ✓/✗  Pro Price ID (price_xxx)
NEXT_PUBLIC_API_URL         ✓/✗  Railway バックエンドURL
```

## よくあるデプロイ失敗パターン
1. **TypeScript エラー** → `npx tsc --noEmit` で事前確認
2. **環境変数不足** → `process.env.XXX` が undefined でランタイムエラー
3. **Prisma クライアント未生成** → `prisma generate` を build コマンドに含める
4. **`NEXT_PUBLIC_*` の変更が反映されない** → 再ビルド必須

## Railway バックエンド確認
```bash
# ヘルスチェック
curl https://your-api.railway.app/api/health

# Cold start を起こしている場合は最初のリクエストに数秒かかる
```

## デプロイ後の確認手順
1. Vercel ダッシュボードでビルドログを確認
2. 本番URLにアクセスして主要ページを確認
3. `/pricing` → Stripe Payment Link に遷移するか
4. ログイン → ダッシュボードが表示されるか
5. `/api/stripe/webhook` の Stripe ダッシュボード連携を確認

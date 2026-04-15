# 物販チェッカー SaaS デプロイ手順

## 1. データベース（Neon）の準備

1. https://neon.tech でアカウント作成
2. 新しいプロジェクトを作成
3. 接続文字列（`postgresql://...`）をコピー
4. `DATABASE_URL` に設定

### マイグレーション実行
```bash
npx prisma migrate deploy
```

---

## 2. メール送信（Resend）の準備

1. https://resend.com でアカウント作成
2. APIキーを発行 → `AUTH_RESEND_KEY` に設定
3. ドメインを登録（または `@resend.dev` を使う）
4. `EMAIL_FROM` を `noreply@yourdomain.com` に設定

---

## 3. Stripeの準備

### 商品・価格の作成
Stripeダッシュボード → 商品 → 以下を作成：

| プラン     | 価格   | 請求   |
|-----------|--------|--------|
| プロ      | ¥980  | 月次   |
| ビジネス  | ¥2,980 | 月次  |

作成後、各「価格ID」（`price_xxx`）を環境変数に設定：
- `STRIPE_PRO_PRICE_ID`
- `STRIPE_BUSINESS_PRICE_ID`

### Webhookの設定（本番）
Stripeダッシュボード → Developers → Webhooks → エンドポイントを追加：
- URL: `https://your-app.vercel.app/api/stripe/webhook`
- イベント:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- 署名シークレット → `STRIPE_WEBHOOK_SECRET` に設定

### ローカルテスト用
```bash
# Stripe CLIでWebhookを転送
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

---

## 4. Pythonバックエンドのデプロイ（Railway）

1. https://railway.app でアカウント作成
2. 新しいプロジェクト → GitHubリポジトリを接続
3. `bussan-system/` ディレクトリをルートに設定
4. 環境変数を設定
5. デプロイ後のURLを `NEXT_PUBLIC_API_URL` に設定

---

## 5. Vercelへのデプロイ

```bash
# Vercel CLIのインストール
npm i -g vercel

# デプロイ
vercel

# 本番デプロイ
vercel --prod
```

### 環境変数（Vercelダッシュボードで設定）
```
DATABASE_URL          = （Neonの接続文字列）
AUTH_SECRET           = （openssl rand -base64 32 で生成）
AUTH_RESEND_KEY       = （Resend APIキー）
EMAIL_FROM            = noreply@yourdomain.com
NEXTAUTH_URL          = https://your-app.vercel.app
STRIPE_SECRET_KEY     = sk_live_xxx（本番）/ sk_test_xxx（テスト）
STRIPE_WEBHOOK_SECRET = whsec_xxx
STRIPE_PRO_PRICE_ID   = price_xxx
STRIPE_BUSINESS_PRICE_ID = price_xxx
NEXT_PUBLIC_API_URL   = https://your-api.railway.app
```

---

## 6. ローカル開発

```bash
# .env.local を作成
cp .env.example .env.local
# 各値を設定

# DBマイグレーション
npx prisma migrate dev

# 開発サーバー起動
npm run dev
```

---

## プラン機能制限まとめ

| 機能             | フリー | プロ | ビジネス |
|-----------------|--------|------|---------|
| 仕入れ管理       | 30件   | 無制限 | 無制限 |
| 利益計算         | ✅     | ✅   | ✅      |
| ダッシュボード   | ✅     | ✅   | ✅      |
| スキャナー       | ❌     | ✅   | ✅      |
| 相場検索         | ❌     | ✅   | ✅      |
| グローバル検索   | ❌     | ✅   | ✅      |
| ウォッチリスト   | ❌     | ✅   | ✅      |
| レポート・分析   | ❌     | ✅   | ✅      |
| 高度な分析       | ❌     | ❌   | ✅      |

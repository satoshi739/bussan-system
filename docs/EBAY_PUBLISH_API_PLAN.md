# eBay 出品API 実装計画

> 作成日: 2026-05-15 / 対象Phase: Phase 1.4〜1.7
> 前提: eBay Developer Program 申請完了済み

## TL;DR

- 既存 `EbayAccount` モデル + `QuickListing` モデルを活用、新規DBスキーマほぼ追加なし
- 実装は4フェーズ（A: OAuth → B: Inventory Item → C: Offer公開 → D: ガイドUI）
- 各フェーズ独立リリース可能。Phase A だけでも「eBayと接続できるSaaS」として価値あり
- Sandbox で先に通し→本番

---

## 全体アーキテクチャ

```
[ユーザー]
   │ 1. settings/eBay接続 押下
   ▼
[/api/ebay/oauth/start]  → eBay認可画面 (Authorization Code Grant)
   │
   │ 2. eBay側で承諾
   ▼
[/api/ebay/oauth/callback]  ← authorization code
   │ → token交換 (access_token / refresh_token)
   │ → EbayAccount に upsert
   ▼
[settings 「eBay接続済」表示]

────────── 出品時 ──────────

[ユーザー]
   │ /listings/quick/[id] で「eBayで出品」押下
   ▼
[/api/listings/quick/[id]/publish?platform=ebay&mode=api]
   │ → refreshToken からaccess_token更新
   │ → ①Inventory Item PUT (/sell/inventory/v1/inventory_item/{sku})
   │ → ②Offer 作成 POST (/sell/inventory/v1/offer)
   │ → ③Offer 公開 POST (/sell/inventory/v1/offer/{offerId}/publish)
   ▼
[listingUrl・externalId を QuickListing に保存]
```

---

## 必要な環境変数（Vercel / .env.local）

| Key | 用途 | 既存/新規 |
|---|---|---|
| `EBAY_APP_ID` | 検索Browse APIで既存 | 既存 |
| `EBAY_CERT_ID` | 既存（Browse API用） | 既存 |
| `EBAY_ENV` | `sandbox` or `production` 切替 | 既存 |
| `EBAY_RU_NAME` | OAuth Redirect URI (eBay側に登録した名前) | **新規** |
| `EBAY_OAUTH_REDIRECT_URI` | コールバックURL `https://app.upjapan.co.jp/api/ebay/oauth/callback` | **新規** |
| `EBAY_FULFILLMENT_POLICY_ID` | Business Policy ID (発送) | **新規** |
| `EBAY_PAYMENT_POLICY_ID` | Business Policy ID (支払い) | **新規** |
| `EBAY_RETURN_POLICY_ID` | Business Policy ID (返品) | **新規** |
| `EBAY_MERCHANT_LOCATION_KEY` | Inventory Location 識別子 | **新規** |

> 注: Business Policy ID は **各ユーザーのeBayアカウントごとに違う**。本番では DB から引く設計に変える（Phase D で対応）。最初は Satoshi の Policy ID を env で固定して動作確認 → ユーザー個別化はあと。

---

## DB 追加（最小限）

`QuickListing` モデルに **publish 結果保存用フィールド** を追加するのみ:

```prisma
model QuickListing {
  // ... 既存フィールド

  // eBay publish 結果
  ebaySku           String?           // 自分で発番した sku
  ebayOfferId       String?           // eBayが返す offerId
  ebayListingId     String?           // 公開後の itemId
  ebayListingUrl    String?           // 公開後の商品URL
  publishedAt       DateTime?

  // ... 既存
  @@index([userId, ebayListingId])
}
```

migration名: `add_ebay_publish_fields_to_quick_listing`

`EbayAccount` は既存のまま使う（scopes / refreshToken / accessToken / tokenExpiresAt 全部揃っている）。

---

## Phase A: OAuth 認証フロー（半日）

### 目的
ユーザーが「eBayと接続」ボタンを押すだけで refresh_token が DB に保存される状態を作る。

### スコープ（OAuth時に要求）
```
https://api.ebay.com/oauth/api_scope
https://api.ebay.com/oauth/api_scope/sell.inventory
https://api.ebay.com/oauth/api_scope/sell.account.readonly
https://api.ebay.com/oauth/api_scope/sell.fulfillment
```

### 実装ファイル
- `frontend/app/api/ebay/oauth/start/route.ts` (新規)
- `frontend/app/api/ebay/oauth/callback/route.ts` (新規)
- `frontend/lib/ebay-oauth.ts` (新規・token交換ロジック)
- `frontend/app/settings/page.tsx` (既存・eBay接続ボタン追加)

### API 設計
- **GET /api/ebay/oauth/start**: state を生成して session に保存 → eBay の認可URLにリダイレクト
- **GET /api/ebay/oauth/callback?code=&state=**:
  1. state検証
  2. code を `https://api.ebay.com/identity/v1/oauth2/token` で access_token + refresh_token に交換
  3. `EbayAccount` に upsert
  4. settings ページへリダイレクト + toast成功表示

### UI変更
`settings/page.tsx` の eBay セクションに「eBayと接続」ボタン追加。既存の「Finding API キー入力欄」はそのまま残す（用途別）。

### Satoshi事前作業
1. eBay Developer ダッシュボードで **Redirect URI** を登録（`EBAY_RU_NAME` 取得）
2. Redirect URL（コールバック）として `https://app.upjapan.co.jp/api/ebay/oauth/callback` を eBay 側に追加
3. 環境変数 `EBAY_RU_NAME` / `EBAY_OAUTH_REDIRECT_URI` を Vercel に追加

### 完了基準
- 「eBayと接続」ボタン押下 → eBay認可画面 → 戻ってきたら「接続済 (xxx@ebay)」と表示される
- DB の EbayAccount テーブルに refreshToken 保存確認
- 再ログインしても接続維持

---

## Phase B: Inventory Item 作成（半日）

### 目的
出品データを eBay 側の「在庫アイテム」として登録する（公開前のドラフト状態）。

### 実装ファイル
- `frontend/lib/ebay-publish.ts` (新規)
- `frontend/app/api/listings/quick/[id]/publish/route.ts` (既存 or 新規・platform分岐)
- `frontend/lib/publish-adapter.ts` (既存・EbayAdapter API モード実装)

### Inventory Item ペイロード雛形
```json
PUT https://api.ebay.com/sell/inventory/v1/inventory_item/{sku}
{
  "availability": {
    "shipToLocationAvailability": { "quantity": 1 }
  },
  "condition": "USED_GOOD",
  "product": {
    "title": "（AIタイトル・80文字以内）",
    "description": "（AI説明・英語）",
    "imageUrls": ["https://..."],
    "aspects": {
      "Brand": ["Unbranded"],
      "Type": ["（カテゴリ）"]
    }
  }
}
```

### 注意点
- sku は SaaS側で発番（cuid or `upj-{quickListingId}`）
- imageUrls は **HTTPS必須・eBayがクロールできる公開URL必須**
- description は **英語推奨**（既存EbayAdapterは英語想定でAI生成済み）

### 完了基準
- Sandbox で Inventory Item 作成成功
- 同sku で PUT すると上書き更新される動作確認

---

## Phase C: Offer 公開（半日）

### 目的
Inventory Item に対して「いくらで売るか・どのカテゴリで売るか」を Offer として作成し、公開API（publish）で実出品。

### Offer ペイロード雛形
```json
POST https://api.ebay.com/sell/inventory/v1/offer
{
  "sku": "（Phase Bで使ったsku）",
  "marketplaceId": "EBAY_US",
  "format": "FIXED_PRICE",
  "availableQuantity": 1,
  "categoryId": "（カテゴリID）",
  "listingDescription": "（HTMLでもOK）",
  "listingPolicies": {
    "fulfillmentPolicyId": "（env or DB）",
    "paymentPolicyId": "（env or DB）",
    "returnPolicyId": "（env or DB）"
  },
  "pricingSummary": {
    "price": { "value": "（USD価格）", "currency": "USD" }
  },
  "merchantLocationKey": "（env）"
}
```

公開:
```
POST https://api.ebay.com/sell/inventory/v1/offer/{offerId}/publish
```

レスポンスに `listingId` (eBay item ID) が返る → `QuickListing.ebayListingId` / `ebayListingUrl` に保存。

### 価格通貨変換
- AIが生成した推奨価格(JPY) を **当日為替で USD換算** （既存 `currency.py` の `jpy_to(USD)` 流用可能だが、フロント側にも為替変換関数が必要）
- 為替 API は既存実装あり（要確認）

### 完了基準
- Sandbox で実出品 → eBay Sandbox上で商品ページが見られる
- QuickListing の ebayListingUrl から新タブで開ける
- 失敗時のエラーが日本語で表示される（既存 `errors.ts` 流用）

---

## Phase D: Business Policies / Inventory Location セットアップガイド（半日）

### 目的
ユーザーが eBay アカウント側で必要な設定（Business Policies と Inventory Location）を済ませているか確認・誘導する。

### 実装内容
1. `/api/ebay/setup/check` 新規: ユーザーの Business Policies / Location 取得確認
   - `GET /sell/account/v1/fulfillment_policy`
   - `GET /sell/account/v1/payment_policy`
   - `GET /sell/account/v1/return_policy`
   - `GET /sell/inventory/v1/location`
2. settings ページに **「eBay出品準備チェック」セクション** 追加:
   - ✅ Fulfillment Policy あり / ❌ なし → 設定ページへのリンク
   - ✅ Payment Policy / ❌ なし
   - ✅ Return Policy / ❌ なし
   - ✅ Inventory Location / ❌ なし
3. 全部 ✅ になるまで出品ボタンを disabled に

### ユーザー個別 Policy ID DB保存
- `EbayAccount` モデルに `fulfillmentPolicyId / paymentPolicyId / returnPolicyId / merchantLocationKey` を追加
- Phase Cでenv参照していた箇所をDB参照に切替

### 完了基準
- 接続直後のユーザーでも、ガイドUIで何をすべきか分かる
- 設定完了後、eBay出品ボタンが活性化される

---

## Satoshi が事前に進めること

| # | タスク | 所要 |
|---|---|---|
| 1 | eBay Developer ダッシュボードで **Redirect URI 登録**（RuName 発行） | 10分 |
| 2 | eBay Sandbox アカウント作成・Sandbox環境で Business Policies と Inventory Location 設定 | 30分 |
| 3 | eBay 本番アカウント側でも同様に設定（リリース前） | 30分 |
| 4 | Sandbox / Production の AppID / CertID を環境変数として用意 | 5分 |
| 5 | `EBAY_OAUTH_REDIRECT_URI` を Vercel に追加 | 5分 |

> Phase A実装着手 = 1〜4 が揃った時点

---

## リリース戦略

| Phase | リリース判断 | ユーザーに見える価値 |
|---|---|---|
| A | OAuth完了したらすぐ本番 | 「eBayと接続できる」訴求 |
| B | Sandbox通った段階で本番候補に | （内部のみ・UIには出さない） |
| C | Sandbox→本番Satoshi自身で出品テスト→本番リリース | 「ボタン1つで本当にeBay出品」訴求 |
| D | Cと同時 or 直後 | 「eBay出品準備が画面で確認できる」訴求 |

各フェーズで完了したら **「ボタンひとつで eBay 出品」** のSaaSコア価値が **メルカリ→eBayへ拡張** されたことになる。

---

## 想定リスク

| リスク | 対応 |
|---|---|
| eBay 認可がブラウザクロスサイト制限で失敗 | state を Cookie/Session に保存しSameSite=Lax |
| token expire ハンドリング漏れ | publish前に必ず `tokenExpiresAt` チェック→過ぎていたら refresh |
| API レート制限（1日5000リクエスト） | 個人ユーザー数では問題ないが、エラー時はexp backoff |
| 出品エラー（カテゴリ未指定・画像形式NG等） | AI生成段階で eBay 仕様に近い形に整形しておく |
| Sandbox と Production の RuName が別物 | EBAY_ENV 切替で OAuth URL も自動切替 |

---

## 参考リンク

- eBay Developer Portal: https://developer.ebay.com/
- Inventory API: https://developer.ebay.com/api-docs/sell/inventory/overview.html
- OAuth Guide: https://developer.ebay.com/api-docs/static/oauth-tokens.html
- Business Policies: https://developer.ebay.com/api-docs/sell/account/overview.html

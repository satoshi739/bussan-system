# 本番反映手順書: 確認付きワンクリック出品 MVP (QuickListing)

最終更新: 2026-05-12

## 0. 概要

ローカル(dev-quick-listing ブランチ)で動作確認済みの「確認付きワンクリック出品 MVP」を本番に反映する手順書。

### 反映対象
- **DB**: 本番Neon (`ep-round-bread-a1dm903h...`) に `QuickListing` テーブルと `QuickListingStatus` enum を追加
- **コード**: Vercel本番にデプロイ (`/listings/quick`, `/listings/quick/history`, 関連API)

### 反映しないもの
- 既存テーブル (User, purchases, sales, listings, agent_*, fba_*, monetize_* など) は**一切変更しない**
- 既存データへの変更も**一切なし**

---

## 1. リリース前チェックリスト

実行前に以下を確認:

- [ ] ローカル(dev-quick-listing)で8項目すべて動作確認済み
- [ ] `prisma/migrations/20260512100000_add_quick_listing/migration.sql` の中身を目視レビュー済み
- [ ] `scripts/apply-quick-listing-migration.mjs --dry-run` をローカルで実行し、危険操作なしを確認済み
- [ ] 本番DBのバックアップが取れている(Neonの自動Point-in-Time Restoreで十分。明示的なスナップショットを取るなら手動でも可)
- [ ] Vercel本番に対するメンテナンス告知は不要(無停止リリース可)
- [ ] AI生成にはAnthropic Claude APIを使用 — 利用量モニタリング準備済み

---

## 2. 手順1: 本番DBにSQL適用

### 2-1. 本番DATABASE_URLを準備

`.env` の `DATABASE_URL` は本番(`ep-round-bread-a1dm903h...`)を指している前提。
**`.env.local` の dev-quick-listing 用URLには絶対に切り替えない**こと(本番リリースなので)。

ホスト名だけ確認:

```bash
cd bussan-system/frontend
grep -oE "@ep-[a-z0-9-]+\.[a-z0-9.-]+\.neon\.tech" .env | sort -u
# 期待値: @ep-round-bread-a1dm903h.ap-southeast-1.aws.neon.tech
```

### 2-2. dry-run で本番状態を確認

```bash
cd bussan-system/frontend
npx -y dotenv-cli -e .env -- node scripts/apply-quick-listing-migration.mjs --dry-run
```

確認ポイント:
- `target host` が本番(`ep-round-bread-a1dm903h...`)になっている
- `QuickListing テーブル: 未作成` と出る(既に作られていたら適用不要)
- `QuickListingStatus enum: 未作成` と出る
- `✅ SQL内に危険操作なし` が出る

### 2-3. 本番DBに適用

dry-runの結果に問題なければ:

```bash
cd bussan-system/frontend
npx -y dotenv-cli -e .env -- node scripts/apply-quick-listing-migration.mjs
```

- 対話で `Continue? [yes/no]:` と聞かれる。本番ホスト名を再確認してから `yes` を入力
- 適用後に以下が表示されれば成功:
  - `カラム数: 24 (期待値 24)`
  - `インデックス: 3 件` (pkey + 2つの複合index)
  - `外部キー: 1 件 (期待値 1)`
  - `✅ すべての検証パス`

### 2-4. (任意) Prisma migration履歴への記録

本番Neon の `_prisma_migrations` テーブルに「適用済み」マークを残したい場合:

```bash
cd bussan-system/frontend
npx -y dotenv-cli -e .env -- bash -c '
  CLEAN=$(echo "$DATABASE_URL" | sed "s/&channel_binding=require//; s/channel_binding=require&//; s/?channel_binding=require$//")
  DATABASE_URL="$CLEAN" DIRECT_DATABASE_URL="$CLEAN" \
    npx prisma migrate resolve --applied 20260512100000_add_quick_listing
'
```

これでPrismaの履歴上「適用済み」として記録され、次回 `migrate deploy` でスキップされます。

⚠️ もし本番Neonが古いPrismaバージョンで管理されていて `_prisma_migrations` テーブルとの整合性が崩れる場合は、このステップはスキップしても実害ありません。

---

## 3. 手順2: Vercel本番デプロイ

### 3-1. 環境変数の事前確認

Vercel本番に以下が設定されていることを確認:

| 変数名 | 必須 | 用途 | 確認方法 |
|---|---|---|---|
| `DATABASE_URL` | ✅ | 本番Neon (Pooled) | Vercel > Settings > Environment Variables |
| `DIRECT_DATABASE_URL` | ✅ | 本番Neon (Direct, NextAuth migration用) | 同上 |
| `AUTH_SECRET` | ✅ | NextAuth セッション署名 | 同上 |
| `ANTHROPIC_API_KEY` | ✅ | **QuickListing の AI生成で新規必須** | 既に他機能で設定済みのはず |
| `RESEND_API_KEY` | ✅ | メール認証 | 既設定 |
| `STRIPE_*_PRICE_ID` 等 | ✅ | 既存決済 | 既設定 |

⚠️ **`ANTHROPIC_API_KEY` が本番に無いとAI生成が全件失敗します**。先に Vercel本番のEnvに入っているか必ず確認:

```bash
cd bussan-system/frontend
vercel env ls production | grep ANTHROPIC_API_KEY
```

無ければ:
```bash
vercel env add ANTHROPIC_API_KEY production
# キーを貼り付け
```

### 3-2. デプロイ

```bash
cd bussan-system  # monorepoルート
vercel --prod
```

または GitHub main にプッシュ済みなら自動デプロイ待ち。

### 3-3. デプロイ後の動作確認

本番URL (`https://app.upjapan.co.jp` または `https://frontend-one-steel-loaau9zmao.vercel.app`) で:

1. ログインできる(既存ユーザーで)
2. `/listings/quick` が開く(認証必須)
3. 商品名「テスト商品」を入力 → 「AIで出品文を作成」 → プレビュー画面に遷移
4. プレビュー画面で「CSV出力」ボタンが動く
5. `/listings/quick/history` で履歴に表示される
6. サイドバー「出品作成(AI)」「出品履歴」のリンクが正しく表示・遷移する

---

## 4. ロールバック手順

問題発生時:

### 4-1. アプリ側のロールバック(Vercel)

Vercel ダッシュボード > Deployments > 1つ前の本番 deploy で **Promote to Production** をクリック。即時切り戻し。

### 4-2. DB側のロールバック

`QuickListing` テーブルが原因で問題が起きている場合のみ:

```sql
-- 既存データ・既存テーブルへの影響はないので、テーブル削除のみで安全に元に戻る
DROP TABLE IF EXISTS "QuickListing";
DROP TYPE IF EXISTS "QuickListingStatus";
```

実行スクリプト例:
```bash
cd bussan-system/frontend
npx -y dotenv-cli -e .env -- node -e "
const { Client } = require('pg');
let url = (process.env.DATABASE_URL||'').replace(/&channel_binding=require/g,'').replace(/channel_binding=require&/g,'').replace(/\?channel_binding=require$/g,'');
const c = new Client({ connectionString: url });
(async () => {
  await c.connect();
  await c.query('DROP TABLE IF EXISTS \"QuickListing\"');
  await c.query('DROP TYPE IF EXISTS \"QuickListingStatus\"');
  console.log('rolled back');
  await c.end();
})();
"
```

⚠️ ロールバック後、Vercel側のコードに `QuickListing` への参照が残っていると500エラーになります。アプリ→DBの順でロールバックすること。

---

## 5. 既知の注意点

### 5-1. NextAuth Credentials Provider のID
プロバイダーIDは `credentials` ではなく **`admin-password`** です。`auth.ts` の Credentials() 呼び出しで `id: "admin-password"` を指定しています。

### 5-2. AI生成のコスト
- モデル: `claude-haiku-4-5-20251001`
- 1リクエストあたり ~2,000 token = 約 $0.003〜0.01
- 想定使用頻度: 1ユーザー/日5〜10件 → 月100件として ~$1
- Anthropicの利用量モニタリングを有効にしておく

### 5-3. 配送API未連携
送料は `lib/shipping-table.ts` の日本郵便ベース概算のみ。実費とずれがあるためAIが生成する「利益見込み」も概算。
将来のヤマト/佐川/日本郵便API連携(アイデア #003)で精度向上予定。

### 5-4. ヤフオク/eBay APIも未連携
出品先は現在 `none` (CSV/コピー) のみ。
- `lib/publish-adapter.ts` の `YahooAuctionsAdapter` / `EbayAdapter` は「未連携」ステータスを返すだけ
- アイデア #001 (eBay), #002 (ヤフオク) の API承認が下りたら、`publish()` メソッドを実装するだけで切り替え可能

### 5-5. dev-quick-listing ブランチの扱い
リリース完了後:
- 開発が一段落したら **Neon dev-quick-listing ブランチは削除可** (Neon UIから1クリック)
- 削除すると、開発用に設定したパスワード `Dev2026_JPNMhG-S` 等も自動消滅
- `.env.local` の `DATABASE_URL` は手動で削除推奨(本番URL書き戻し不要、`.env`で本番が読まれる)

---

## 6. リリース後の追跡

- リリースから24時間: dev_server.log と Vercel Functions Logs でエラー監視
- リリースから1週間: AI生成のレスポンス時間平均、CSV出力件数、コピー使用率を計測
- アイデア駐車場 #001 / #002 のAPI承認状況をウォッチ → 通ったら次フェーズで連携実装

---

## 7. リリース実行記録(記入欄)

| 項目 | 日時 | 担当 | 結果 |
|---|---|---|---|
| DB migration適用 | | | |
| Vercel本番デプロイ | | | |
| 動作確認完了 | | | |


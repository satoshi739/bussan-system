# 物販チェッカー — CLAUDE.md

## プロジェクト概要

| 項目 | 内容 |
|------|------|
| サービス名 | 物販チェッカー |
| 運営会社 | 株式会社ユニバースプラネットジャパン |
| 代表 | Satoshi |
| 本番ドメイン | app.upjapan.co.jp（予定） |
| 現フロントエンド | https://frontend-one-steel-loaau9zmao.vercel.app |
| バックエンド | FastAPI + SQLite（`api.py` / `data/bussan.db`） |
| フロントエンド | Next.js 16（`frontend/`）|

## システム構成

```
bussan-system/
├── api.py              # FastAPI メインエントリ
├── database.py         # SQLite操作
├── calculators.py      # 利益計算ロジック
├── scrapers.py         # eBay / Yahoo Auctions スクレイパー
├── scrapers_global.py  # Shopee等グローバルスクレイパー
├── currency.py         # 為替換算
├── profit_scanner.py   # 利益スキャン
├── monitor.py          # バックグラウンド監視
├── global_calculator.py
├── agents/             # AIエージェント（Claude API）
│   ├── ceo_agent.py
│   ├── research_agent.py
│   ├── listing_agent.py
│   └── sns_agent.py
└── frontend/           # Next.js フロントエンド
    ├── app/            # App Router（各ページ・APIルート）
    ├── components/     # UIコンポーネント
    ├── lib/            # stripe.ts / prisma.ts / subscription.ts 等
    ├── prisma/         # スキーマ・マイグレーション
    ├── auth.ts         # NextAuth v5 設定
    └── next.config.ts
```

### 主機能
- 利益スキャン（eBay / Shopee / Yahoo Auctions 仕入れ候補の自動検出）
- スクレイピング（eBay・Shopee・Yahoo Auctions）
- 為替換算（USD / PHP → JPY リアルタイム）
- 利益計算（仕入れ値・送料・手数料・粗利・ROI）
- AIエージェント4体（CEO / Research / Listing / SNS）

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Next.js 16 / React 19 / Tailwind CSS v4 |
| 認証 | NextAuth v5（`auth.ts` / `auth.config.ts`） |
| DB | Prisma + PostgreSQL（本番）/ SQLite（バックエンド） |
| 決済 | Stripe（`lib/stripe.ts`） |
| ホスティング | Vercel（フロントエンド） |
| バックエンド | FastAPI（ローカル or Railway） |

## ビジネス前提

### ターゲットユーザー
副業せどらー〜専業物販プレイヤー（初心者〜中級者）

### 料金プラン（月額サブスク）
| プラン | 月額 | 内部キー | 特記 |
|--------|------|----------|------|
| フリー | ¥0 | `PLANS.FREE` | 仕入れ30件まで |
| Standard | ¥9,800 | `PLANS.PRO` | 7日間無料トライアル |
| Pro | ¥19,800 | `PLANS.BUSINESS` | 7日間無料トライアル |

> **注意**: `lib/stripe.ts` の内部キー名（FREE/PRO/BUSINESS）と表示名（フリー/Standard/Pro）が一致していない。混同しないこと。

### 決済・集客
- 決済: Stripe
- 集客: TikTok / Instagram Reels 主軸

### 最優先事項
1. 有料ユーザーの獲得
2. コア機能（利益計算・スキャン）の安定稼働
3. 顧客に見えるUI/エラーは**必ず親切な日本語**

## Claudeへの作業指針

### 出力スタイル
- **結論ファースト**。理由は後。
- 表・箇条書きで整理する
- 専門用語には例え・言い換えを添える
- コードは**コピペで動く形**で出す
- Yes/Noで答えられる質問は短く明確に答える

### やらないこと（厳守）
- 過度な前置き・お世辞・冗長な確認をしない
- 「〜と思います」を連発しない
- **動いている機能を勝手に削除・変更しない**
- **既存のAPIエンドポイント名を変更しない**
- ディレクトリ構造を大幅に変えない
- 確認なしで本番環境に影響する変更をしない
- `.env` / `.env.local` / 秘密情報を絶対に表示・編集・コミットしない

### コード変更のルール
- バックエンド変更時は `api.py` のエンドポイント名を維持する
- フロントエンド変更時は `frontend/` 配下のみ触る
- DB変更（`prisma/schema.prisma`）は必ずマイグレーション手順を示す
- 依存追加時は `requirements.txt`（バックエンド）または `package.json`（フロントエンド）に明記
- Next.js は v16 / React 19 / Tailwind v4 — 旧バージョンの書き方を混入しない

### git ルール
- `git commit` / `git push` は必ずユーザーの明示的な指示があってから実行する
- コミット前に `npm run build` と `npm run lint` を通す

## 現在の優先タスク（2026-04-29時点）

1. **UI改善** — 各ページのレイアウト・UX改善
2. **接続状態改善** — バックエンドAPI接続の安定化・エラー表示改善
3. **Pricingページ訴求強化** — FAQ・社会的証明・機能比較表の追加
4. **Stripe Payment Link動作確認** — Standard/Proの実際の遷移テスト

## ブランド定義

| 名称 | 位置づけ |
|------|---------|
| 物販チェッカー | サービス全体の名前（外部向け正式名称） |
| 利益スキャナー | 機能名（利益スキャン機能を指す） |

## 重要な外部リソース

| リソース | URL / 場所 |
|---------|-----------|
| フロントエンド（Vercel） | https://frontend-one-steel-loaau9zmao.vercel.app |
| 本番予定ドメイン | app.upjapan.co.jp |
| バックエンドAPI | `api.py`（ローカル or Railway） |
| DB（フロントエンド） | Prisma + PostgreSQL（Vercel/Railway） |
| DB（バックエンド） | `data/bussan.db`（SQLite） |

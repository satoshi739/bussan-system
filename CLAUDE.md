# 物販チェッカー — CLAUDE.md

## プロジェクト概要

| 項目 | 内容 |
|------|------|
| サービス名 | 物販チェッカー |
| 運営会社 | ユニバーサルプラネットジャパン株式会社 |
| 代表 | Satoshi |
| 本番ドメイン | app.upjapan.co.jp（予定） |
| 現フロントエンド | https://frontend-one-steel-loaau9zmao.vercel.app |
| バックエンド | FastAPI + SQLite（`api.py` / `data/bussan.db`） |
| フロントエンド | Next.js（`frontend/`） |

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
│   ├── ceo_agent.py    # CEO：戦略判断・指揮
│   ├── research_agent.py # Research：市場調査
│   ├── listing_agent.py  # Listing：出品補助
│   └── sns_agent.py    # SNS：集客コンテンツ生成
└── frontend/           # Next.js フロントエンド
```

### 主機能
- 利益スキャン（eBay / Shopee / Yahoo Auctions 仕入れ候補の自動検出）
- スクレイピング（eBay・Shopee・Yahoo Auctions）
- 為替換算（USD / PHP → JPY リアルタイム）
- 利益計算（仕入れ値・送料・手数料・粗利・ROI）
- AIエージェント4体（CEO / Research / Listing / SNS）

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

### コード変更のルール
- バックエンド変更時は `api.py` のエンドポイント名を維持する
- フロントエンド変更時は `frontend/` 配下のみ触る
- DB変更（`database.py`）は必ずマイグレーション手順を示す
- 依存追加時は `requirements.txt`（バックエンド）または `package.json`（フロントエンド）に明記

## 現在の優先タスク

1. **Pricingページ訴求強化** — FAQ・社会的証明・機能比較表の追加
2. **Stripe Payment Link動作確認** — Standard/Proの実際の遷移テスト
3. **ブランド名の整理** — 「物販チェッカー」と「利益スキャナー」の関係性・表記統一

## ブランド定義（暫定）

| 名称 | 位置づけ |
|------|---------|
| 物販チェッカー | サービス全体の名前（外部向け正式名称） |
| 利益スキャナー | 機能名（利益スキャン機能を指す） |

## 重要な外部リソース

| リソース | URL / 場所 |
|---------|-----------|
| フロントエンド（Vercel） | https://frontend-one-steel-loaau9zmao.vercel.app |
| 本番予定ドメイン | app.upjapan.co.jp |
| バックエンドAPI | `api.py`（ローカル or Render/Railway等でホスト） |
| DB | `data/bussan.db`（SQLite） |

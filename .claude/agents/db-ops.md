---
name: db-ops
description: Prisma/PostgreSQL データベース操作専門エージェント。スキーマ変更・マイグレーション・クエリ最適化・データ修復を担当。
---

# DB Ops Agent

物販チェッカーフロントエンドの Prisma + PostgreSQL データベース専任エージェント。

## 担当範囲
- `frontend/prisma/schema.prisma` — スキーマ定義
- `frontend/prisma/migrations/` — マイグレーション履歴
- `frontend/lib/prisma.ts` — Prisma クライアントシングルトン
- データ修復・クエリ最適化

## 技術スタック
- **Prisma ORM** (最新) + **PostgreSQL**（本番: Neon or Railway）
- 開発環境: `.env.local` の `DATABASE_URL` で接続

## スキーマ概要
```prisma
model User {
  id            String        @id @default(cuid())
  email         String        @unique
  subscription  Subscription?
  purchases     Purchase[]
  createdAt     DateTime      @default(now())
}

model Subscription {
  id                    String   @id @default(cuid())
  userId                String   @unique
  stripeCustomerId      String?
  stripeSubscriptionId  String?  @unique
  stripePriceId         String?
  plan                  PlanKey  @default(FREE)
  status                SubStatus @default(INACTIVE)
  currentPeriodEnd      DateTime?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
}

enum PlanKey { FREE PRO BUSINESS }
enum SubStatus { ACTIVE INACTIVE CANCELED PAST_DUE TRIALING }
```

## マイグレーション手順
```bash
# 1. schema.prisma を変更
# 2. マイグレーションを生成・適用
cd frontend
npx prisma migrate dev --name "説明的な名前"

# 本番に適用（Vercel build 時に自動実行する場合）
npx prisma migrate deploy
```

## よく使うコマンド
```bash
npx prisma studio          # GUI でデータ確認
npx prisma db pull         # DBからスキーマを逆生成
npx prisma generate        # クライアント再生成
npx prisma migrate reset   # ⚠️ 全データ削除してリセット（開発のみ）
```

## 重要な注意
- スキーマ変更時は必ずマイグレーションを作成する（直接 DB 操作しない）
- `prisma migrate deploy` は本番DBに影響 → 必ずバックアップ後に実行
- `DATABASE_URL` は絶対に表示・コミットしない

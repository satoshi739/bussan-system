-- ============================================================
-- 確認付きワンクリック出品 MVP (QuickListing) テーブル追加
-- ============================================================
-- 既存テーブル (User, purchases, sales, listings, agent_*, fba_*, monetize_* など)
-- には一切変更を加えません。新規テーブル・enum・index・外部キーのみ追加。
-- 冪等性: 全ステートメントが IF NOT EXISTS / duplicate_object ハンドリング付き。
-- 再実行しても安全。
-- ============================================================

-- CreateEnum: QuickListingStatus
DO $$ BEGIN
    CREATE TYPE "QuickListingStatus" AS ENUM (
        'DRAFT',
        'CONFIRMED',
        'CSV_EXPORTED',
        'API_PENDING',
        'PUBLISHED'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: QuickListing
CREATE TABLE IF NOT EXISTS "QuickListing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "productName" TEXT NOT NULL,
    "buyPrice" INTEGER,
    "estPrice" INTEGER,
    "condition" TEXT,
    "category" TEXT,
    "notes" TEXT,
    "weightG" INTEGER,
    "sizeCode" TEXT,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiTitle" TEXT,
    "aiDescription" TEXT,
    "aiCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiSuggestedPrice" INTEGER,
    "aiProfitEstimate" INTEGER,
    "aiShippingEstimate" INTEGER,
    "aiWarnings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetPlatform" TEXT NOT NULL DEFAULT 'none',
    "status" "QuickListingStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuickListing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "QuickListing_userId_status_idx"
    ON "QuickListing"("userId", "status");

CREATE INDEX IF NOT EXISTS "QuickListing_userId_updatedAt_idx"
    ON "QuickListing"("userId", "updatedAt");

-- AddForeignKey: QuickListing.userId -> User.id (ON DELETE CASCADE)
DO $$ BEGIN
    ALTER TABLE "QuickListing"
        ADD CONSTRAINT "QuickListing_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

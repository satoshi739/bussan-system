-- CreateTable
CREATE TABLE "OnboardingEmailLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingEmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingEmailLog_userId_kind_key" ON "OnboardingEmailLog"("userId", "kind");

-- CreateIndex
CREATE INDEX "OnboardingEmailLog_userId_idx" ON "OnboardingEmailLog"("userId");

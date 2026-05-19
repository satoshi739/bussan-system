-- CreateTable
CREATE TABLE "ShippingLabel" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "externalOrderId" TEXT NOT NULL,
    "carrier" TEXT NOT NULL DEFAULT 'yamato',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "recipientName" TEXT NOT NULL,
    "recipientPostalCode" TEXT NOT NULL,
    "recipientAddress" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "packageName" TEXT NOT NULL,
    "trackingNumber" TEXT,
    "trackingUrl" TEXT,
    "labelIssueId" TEXT,
    "labelPdfUrl" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingLabel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShippingLabel_userId_idx" ON "ShippingLabel"("userId");

-- CreateIndex
CREATE INDEX "ShippingLabel_externalOrderId_idx" ON "ShippingLabel"("externalOrderId");

-- AddForeignKey
ALTER TABLE "ShippingLabel" ADD CONSTRAINT "ShippingLabel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'PARTIALLY_FAILED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QrItemStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "idRangeStart" INTEGER NOT NULL,
    "idRangeEnd" INTEGER NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "totalItems" INTEGER NOT NULL,
    "completedItems" INTEGER NOT NULL DEFAULT 0,
    "failedItems" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QrItem" (
    "id" TEXT NOT NULL,
    "itemId" INTEGER NOT NULL,
    "status" "QrItemStatus" NOT NULL DEFAULT 'PENDING',
    "imagePath" TEXT,
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "serviceRequestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QrItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceRequest_status_idx" ON "ServiceRequest"("status");

-- CreateIndex
CREATE INDEX "ServiceRequest_createdAt_idx" ON "ServiceRequest"("createdAt");

-- CreateIndex
CREATE INDEX "ServiceRequest_updatedAt_idx" ON "ServiceRequest"("updatedAt");

-- CreateIndex
CREATE INDEX "ServiceRequest_url_idx" ON "ServiceRequest"("url");

-- CreateIndex
CREATE INDEX "QrItem_serviceRequestId_status_idx" ON "QrItem"("serviceRequestId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "QrItem_serviceRequestId_itemId_key" ON "QrItem"("serviceRequestId", "itemId");

-- AddForeignKey
ALTER TABLE "QrItem" ADD CONSTRAINT "QrItem_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

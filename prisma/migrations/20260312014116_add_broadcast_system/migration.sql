-- CreateEnum
CREATE TYPE "BroadcastType" AS ENUM ('INFO', 'UPDATE', 'WARNING', 'SUCCESS');

-- CreateEnum
CREATE TYPE "BroadcastTarget" AS ENUM ('ALL_USERS', 'FREE_USERS', 'PRO_USERS', 'BUSINESS_USERS');

-- CreateTable
CREATE TABLE "BroadcastMessage" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "BroadcastType" NOT NULL DEFAULT 'INFO',
    "target" "BroadcastTarget" NOT NULL DEFAULT 'ALL_USERS',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "dismissible" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BroadcastMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BroadcastDismissal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "broadcastId" TEXT NOT NULL,
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BroadcastDismissal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BroadcastMessage_isActive_idx" ON "BroadcastMessage"("isActive");

-- CreateIndex
CREATE INDEX "BroadcastMessage_createdAt_idx" ON "BroadcastMessage"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BroadcastDismissal_userId_broadcastId_key" ON "BroadcastDismissal"("userId", "broadcastId");

-- CreateTable
CREATE TABLE "HeroImage" (
    "id" TEXT NOT NULL,
    "pageKey" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "overlayOpacity" DOUBLE PRECISION NOT NULL DEFAULT 0.55,
    "blurStrength" DOUBLE PRECISION NOT NULL DEFAULT 6,
    "title" TEXT,
    "subtitle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeroImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HeroImage_pageKey_key" ON "HeroImage"("pageKey");

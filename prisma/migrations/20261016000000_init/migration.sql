-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('BOOSTER_BOX', 'PLAY_BOOSTER_BOX', 'COLLECTOR_BOOSTER_BOX', 'ELITE_TRAINER_BOX', 'BOOSTER_BUNDLE', 'BUNDLE', 'SPECIAL_COLLECTION', 'BOOSTER_PACK', 'CASE', 'OTHER');

-- CreateEnum
CREATE TYPE "OddsSource" AS ENUM ('PUBLISHED', 'COMMUNITY', 'ESTIMATE');

-- CreateEnum
CREATE TYPE "CardFinish" AS ENUM ('NONFOIL', 'FOIL', 'OTHER');

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "tcgplayerCategoryId" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Set" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "releaseDate" TIMESTAMP(3),
    "tcgplayerGroupId" INTEGER,

    CONSTRAINT "Set_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackType" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cardsPerPack" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "PackType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PullTier" (
    "id" TEXT NOT NULL,
    "packTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rarity" TEXT,
    "perPack" DOUBLE PRECISION NOT NULL,
    "oddsSource" "OddsSource" NOT NULL,
    "oddsSourceNote" TEXT,
    "oddsSourceUrl" TEXT,
    "poolSize" INTEGER NOT NULL,
    "unlistedCardValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isChase" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PullTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" TEXT,
    "rarity" TEXT,
    "finish" "CardFinish" NOT NULL DEFAULT 'NONFOIL',
    "variant" TEXT,
    "marketPrice" DOUBLE PRECISION,
    "priceSource" TEXT,
    "priceUpdatedAt" TIMESTAMP(3),
    "tcgplayerProductId" INTEGER,
    "scryfallId" TEXT,
    "pokemontcgId" TEXT,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TierCard" (
    "tierId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,

    CONSTRAINT "TierCard_pkey" PRIMARY KEY ("tierId","cardId")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "productType" "ProductType" NOT NULL,
    "msrp" DOUBLE PRECISION,
    "marketPrice" DOUBLE PRECISION,
    "priceSource" TEXT,
    "priceUpdatedAt" TIMESTAMP(3),
    "releaseDate" TIMESTAMP(3),
    "imageUrl" TEXT,
    "notes" TEXT,
    "tcgplayerProductId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPack" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "packTypeId" TEXT NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "ProductPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductExtra" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "liquidate" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,

    CONSTRAINT "ProductExtra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceSnapshot" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvSnapshot" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "price" DOUBLE PRECISION,
    "evRaw" DOUBLE PRECISION NOT NULL,
    "evNet" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "feePct" DOUBLE PRECISION,
    "perCardCost" DOUBLE PRECISION,
    "sellThreshold" DOUBLE PRECISION,
    "bulkValue" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProduct" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "watching" BOOLEAN NOT NULL DEFAULT false,
    "ownedQty" INTEGER NOT NULL DEFAULT 0,
    "costBasis" DOUBLE PRECISION,
    "alertMaxPrice" DOUBLE PRECISION,
    "alertMinRoi" DOUBLE PRECISION,
    "alertUseNet" BOOLEAN NOT NULL DEFAULT false,
    "lastAlertAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Game_slug_key" ON "Game"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Set_gameId_name_key" ON "Set"("gameId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PackType_setId_name_key" ON "PackType"("setId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PullTier_packTypeId_name_key" ON "PullTier"("packTypeId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Card_setId_key_key" ON "Card"("setId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_gameId_idx" ON "Product"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductPack_productId_packTypeId_key" ON "ProductPack"("productId", "packTypeId");

-- CreateIndex
CREATE INDEX "PriceSnapshot_productId_day_idx" ON "PriceSnapshot"("productId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "PriceSnapshot_productId_source_day_key" ON "PriceSnapshot"("productId", "source", "day");

-- CreateIndex
CREATE UNIQUE INDEX "EvSnapshot_productId_day_key" ON "EvSnapshot"("productId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserProduct_userId_productId_key" ON "UserProduct"("userId", "productId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- AddForeignKey
ALTER TABLE "Set" ADD CONSTRAINT "Set_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackType" ADD CONSTRAINT "PackType_setId_fkey" FOREIGN KEY ("setId") REFERENCES "Set"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullTier" ADD CONSTRAINT "PullTier_packTypeId_fkey" FOREIGN KEY ("packTypeId") REFERENCES "PackType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_setId_fkey" FOREIGN KEY ("setId") REFERENCES "Set"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TierCard" ADD CONSTRAINT "TierCard_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "PullTier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TierCard" ADD CONSTRAINT "TierCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_setId_fkey" FOREIGN KEY ("setId") REFERENCES "Set"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPack" ADD CONSTRAINT "ProductPack_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPack" ADD CONSTRAINT "ProductPack_packTypeId_fkey" FOREIGN KEY ("packTypeId") REFERENCES "PackType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductExtra" ADD CONSTRAINT "ProductExtra_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceSnapshot" ADD CONSTRAINT "PriceSnapshot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvSnapshot" ADD CONSTRAINT "EvSnapshot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProduct" ADD CONSTRAINT "UserProduct_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProduct" ADD CONSTRAINT "UserProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "tcgplayerSubType" TEXT;

-- AlterTable
ALTER TABLE "PullTier" ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "syncIncludeVariants" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "syncNameContains" TEXT,
ADD COLUMN     "syncRarities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "syncSubType" TEXT;


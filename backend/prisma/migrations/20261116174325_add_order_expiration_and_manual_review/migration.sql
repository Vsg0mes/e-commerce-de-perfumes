-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "needsManualReview" BOOLEAN NOT NULL DEFAULT false;

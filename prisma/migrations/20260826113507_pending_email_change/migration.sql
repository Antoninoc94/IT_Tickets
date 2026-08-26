-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pendingEmail" TEXT,
ADD COLUMN     "pendingEmailAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pendingEmailCodeExpiresAt" TIMESTAMP(3),
ADD COLUMN     "pendingEmailCodeHash" TEXT;

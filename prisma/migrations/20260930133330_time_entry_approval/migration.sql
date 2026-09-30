-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('APPROVED', 'PENDING', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApprovalAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN     "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN     "pendingAction" "ApprovalAction",
ADD COLUMN     "pendingDeviceTimestamp" TIMESTAMPTZ,
ADD COLUMN     "pendingType" "PunchType",
ADD COLUMN     "requestReason" VARCHAR(500),
ADD COLUMN     "reviewNote" VARCHAR(500),
ADD COLUMN     "reviewedAt" TIMESTAMPTZ,
ADD COLUMN     "reviewedById" VARCHAR(255);

-- CreateTable
CREATE TABLE "Notification" (
    "id" VARCHAR(255) NOT NULL,
    "userId" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "timeEntryId" VARCHAR(255),
    "readAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushToken" (
    "id" VARCHAR(255) NOT NULL,
    "userId" VARCHAR(255) NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_token_key" ON "PushToken"("token");

-- CreateIndex
CREATE INDEX "TimeEntry_approvalStatus_idx" ON "TimeEntry"("approvalStatus");

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "TimeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

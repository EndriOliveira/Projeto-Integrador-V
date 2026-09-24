-- CreateEnum
CREATE TYPE "HazardType" AS ENUM ('ELETRICO', 'NAO_ELETRICO');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "admissionDate" DATE,
ADD COLUMN     "registrationNumber" VARCHAR(255),
ADD COLUMN     "rg" VARCHAR(255);

-- CreateTable
CREATE TABLE "WorkDay" (
    "id" VARCHAR(255) NOT NULL,
    "userId" VARCHAR(255) NOT NULL,
    "date" DATE NOT NULL,
    "client" VARCHAR(255),
    "project" VARCHAR(255),
    "hazardType" "HazardType",
    "rdoPending" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaidHours" (
    "id" VARCHAR(255) NOT NULL,
    "userId" VARCHAR(255) NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "paid60Minutes" INTEGER NOT NULL DEFAULT 0,
    "paid70Minutes" INTEGER NOT NULL DEFAULT 0,
    "paid100Minutes" INTEGER NOT NULL DEFAULT 0,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaidHours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkDay_userId_date_key" ON "WorkDay"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PaidHours_userId_year_month_key" ON "PaidHours"("userId", "year", "month");

-- AddForeignKey
ALTER TABLE "WorkDay" ADD CONSTRAINT "WorkDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaidHours" ADD CONSTRAINT "PaidHours_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

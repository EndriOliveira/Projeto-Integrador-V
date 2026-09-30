-- CreateEnum
CREATE TYPE "Branch" AS ENUM ('SAVED', 'JRE', 'EMF');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "branch" "Branch";

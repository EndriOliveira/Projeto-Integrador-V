-- AlterTable
ALTER TABLE "Schedule" ADD COLUMN     "intervalEntry" TIMESTAMPTZ,
ADD COLUMN     "intervalExit" TIMESTAMPTZ,
ALTER COLUMN "exit" DROP NOT NULL;

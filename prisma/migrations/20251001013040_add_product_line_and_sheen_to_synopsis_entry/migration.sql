/*
  Warnings:

  - Added the required column `productLine` to the `synopsis_entries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sheen` to the `synopsis_entries` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "synopsis_entries" ADD COLUMN     "productLine" TEXT NOT NULL,
ADD COLUMN     "sheen" TEXT NOT NULL;

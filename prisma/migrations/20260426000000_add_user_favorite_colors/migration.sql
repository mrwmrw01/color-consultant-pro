-- CreateTable
CREATE TABLE "user_favorite_colors" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "colorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_favorite_colors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_favorite_colors_userId_colorId_key" ON "user_favorite_colors"("userId", "colorId");

-- CreateIndex
CREATE INDEX "user_favorite_colors_userId_idx" ON "user_favorite_colors"("userId");

-- CreateIndex
CREATE INDEX "user_favorite_colors_colorId_idx" ON "user_favorite_colors"("colorId");

-- AddForeignKey
ALTER TABLE "user_favorite_colors" ADD CONSTRAINT "user_favorite_colors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorite_colors" ADD CONSTRAINT "user_favorite_colors_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "colors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

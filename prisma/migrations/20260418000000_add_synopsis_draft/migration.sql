-- CreateTable
CREATE TABLE "synopsis_drafts" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "address" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "consultDate" TIMESTAMP(3),
    "structure" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "synopsis_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "synopsis_drafts_projectId_key" ON "synopsis_drafts"("projectId");

-- CreateIndex
CREATE INDEX "synopsis_drafts_projectId_idx" ON "synopsis_drafts"("projectId");

-- AddForeignKey
ALTER TABLE "synopsis_drafts" ADD CONSTRAINT "synopsis_drafts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

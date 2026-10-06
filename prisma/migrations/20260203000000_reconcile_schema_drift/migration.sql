-- Reconcile migration history with schema.prisma.
--
-- The client/property hierarchy, the manufacturer catalog, color lifecycle
-- columns, photo size variants and user tiers were added to the schema with
-- `prisma db push`, so no migration ever created them. A fresh database failed
-- at 20260204000000_add_performance_indexes ("relation clients does not exist").
--
-- Every statement is idempotent: on databases that already have these objects
-- (pushed or previously baselined) this migration is a no-op. Tables created by
-- later migrations (synopsis_drafts, user_favorite_colors) are left to those
-- migrations.

-- users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tier" TEXT NOT NULL DEFAULT 'free';

-- clients
CREATE TABLE IF NOT EXISTS "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "type" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "contactName" TEXT;

CREATE INDEX IF NOT EXISTS "clients_userId_idx" ON "clients"("userId");
CREATE INDEX IF NOT EXISTS "clients_status_idx" ON "clients"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "clients_userId_name_key" ON "clients"("userId", "name");

-- properties
CREATE TABLE IF NOT EXISTS "properties" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "type" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "properties_clientId_idx" ON "properties"("clientId");
CREATE INDEX IF NOT EXISTS "properties_status_idx" ON "properties"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "properties_clientId_address_key" ON "properties"("clientId", "address");

-- projects: property link; legacy client fields become optional
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "propertyId" TEXT;
ALTER TABLE "projects" ALTER COLUMN "clientName" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "projects_userId_idx" ON "projects"("userId");
CREATE INDEX IF NOT EXISTS "projects_status_idx" ON "projects"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "projects_userId_name_key" ON "projects"("userId", "name");

-- photos: size variants and optimization metadata
ALTER TABLE "photos" ADD COLUMN IF NOT EXISTS "medium_path" TEXT;
ALTER TABLE "photos" ADD COLUMN IF NOT EXISTS "thumbnail_path" TEXT;
ALTER TABLE "photos" ADD COLUMN IF NOT EXISTS "blur_placeholder" TEXT;
ALTER TABLE "photos" ADD COLUMN IF NOT EXISTS "optimized_size" INTEGER;
ALTER TABLE "photos" ADD COLUMN IF NOT EXISTS "storage_savings" DOUBLE PRECISION;

-- manufacturers
CREATE TABLE IF NOT EXISTS "manufacturers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "website" TEXT,
    "codePattern" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manufacturers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "manufacturers_name_key" ON "manufacturers"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "manufacturers_abbreviation_key" ON "manufacturers"("abbreviation");
CREATE INDEX IF NOT EXISTS "manufacturers_isActive_idx" ON "manufacturers"("isActive");

-- colors: lifecycle + manufacturer relation; codes are unique per manufacturer
ALTER TABLE "colors" ADD COLUMN IF NOT EXISTS "manufacturerId" TEXT;
ALTER TABLE "colors" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "colors" ADD COLUMN IF NOT EXISTS "supersededById" TEXT;
ALTER TABLE "colors" ADD COLUMN IF NOT EXISTS "introducedYear" INTEGER;
ALTER TABLE "colors" ADD COLUMN IF NOT EXISTS "discontinuedAt" TIMESTAMP(3);
ALTER TABLE "colors" ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT;
ALTER TABLE "colors" ADD COLUMN IF NOT EXISTS "approvedByUserId" TEXT;
ALTER TABLE "colors" ADD COLUMN IF NOT EXISTS "isUserSuggested" BOOLEAN NOT NULL DEFAULT false;

-- colorFamily was removed from the schema; drop it only when it holds no data
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'colors' AND column_name = 'colorFamily'
    ) THEN
        IF NOT EXISTS (SELECT 1 FROM "colors" WHERE "colorFamily" IS NOT NULL) THEN
            ALTER TABLE "colors" DROP COLUMN "colorFamily";
        END IF;
    END IF;
END $$;

DROP INDEX IF EXISTS "colors_colorCode_key";
CREATE UNIQUE INDEX IF NOT EXISTS "colors_manufacturer_colorCode_key" ON "colors"("manufacturer", "colorCode");
CREATE INDEX IF NOT EXISTS "colors_manufacturer_idx" ON "colors"("manufacturer");
CREATE INDEX IF NOT EXISTS "colors_colorCode_idx" ON "colors"("colorCode");
CREATE INDEX IF NOT EXISTS "colors_manufacturerId_idx" ON "colors"("manufacturerId");
CREATE INDEX IF NOT EXISTS "colors_status_idx" ON "colors"("status");
CREATE INDEX IF NOT EXISTS "colors_isUserSuggested_idx" ON "colors"("isUserSuggested");

-- foreign keys (Postgres has no ADD CONSTRAINT IF NOT EXISTS)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clients_userId_fkey') THEN
        ALTER TABLE "clients" ADD CONSTRAINT "clients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'properties_clientId_fkey') THEN
        ALTER TABLE "properties" ADD CONSTRAINT "properties_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_propertyId_fkey') THEN
        ALTER TABLE "projects" ADD CONSTRAINT "projects_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'colors_manufacturerId_fkey') THEN
        ALTER TABLE "colors" ADD CONSTRAINT "colors_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'colors_supersededById_fkey') THEN
        ALTER TABLE "colors" ADD CONSTRAINT "colors_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "colors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'colors_createdByUserId_fkey') THEN
        ALTER TABLE "colors" ADD CONSTRAINT "colors_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'colors_approvedByUserId_fkey') THEN
        ALTER TABLE "colors" ADD CONSTRAINT "colors_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

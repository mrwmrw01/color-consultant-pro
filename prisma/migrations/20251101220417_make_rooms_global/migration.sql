-- AlterTable: Make projectId nullable
ALTER TABLE "rooms" ALTER COLUMN "projectId" DROP NOT NULL;

-- Step 1: Create a temporary table to store the canonical room for each name
CREATE TEMP TABLE canonical_rooms AS
SELECT DISTINCT ON (name) id, name
FROM "rooms"
ORDER BY name, "createdAt" ASC;

-- Step 2: Update photos to use canonical rooms
UPDATE "photos" p
SET "roomId" = cr.id
FROM "rooms" r
JOIN canonical_rooms cr ON r.name = cr.name
WHERE p."roomId" = r.id AND r.id != cr.id;

-- Step 3: Update annotations to use canonical rooms
UPDATE "annotations" a
SET "roomId" = cr.id
FROM "rooms" r
JOIN canonical_rooms cr ON r.name = cr.name
WHERE a."roomId" = r.id AND r.id != cr.id;

-- Step 4: Update synopsis_entries to use canonical rooms
UPDATE "synopsis_entries" se
SET "roomId" = cr.id
FROM "rooms" r
JOIN canonical_rooms cr ON r.name = cr.name
WHERE se."roomId" = r.id AND r.id != cr.id;

-- Step 5: Delete duplicate rooms (keep only canonical ones)
DELETE FROM "rooms"
WHERE id NOT IN (SELECT id FROM canonical_rooms);

-- Step 6: Set all remaining rooms to be global (projectId = NULL)
UPDATE "rooms" SET "projectId" = NULL;

-- Step 7: Add unique constraint on room name
CREATE UNIQUE INDEX "rooms_name_key" ON "rooms"("name");

-- Performance indexes for Color Consultant Pro
-- These indexes improve query performance for common operations

-- Photo indexes (for gallery loading, project photo queries)
CREATE INDEX IF NOT EXISTS "photos_projectId_idx" ON "photos"("projectId");
CREATE INDEX IF NOT EXISTS "photos_roomId_idx" ON "photos"("roomId");
CREATE INDEX IF NOT EXISTS "photos_createdAt_idx" ON "photos"("createdAt");

-- Annotation indexes (for loading annotations by photo, color, or room)
CREATE INDEX IF NOT EXISTS "annotations_photoId_idx" ON "annotations"("photoId");
CREATE INDEX IF NOT EXISTS "annotations_colorId_idx" ON "annotations"("colorId");
CREATE INDEX IF NOT EXISTS "annotations_roomId_idx" ON "annotations"("roomId");

-- Project indexes (for user's projects and filtering by status)
CREATE INDEX IF NOT EXISTS "projects_userId_idx" ON "projects"("userId");
CREATE INDEX IF NOT EXISTS "projects_status_idx" ON "projects"("status");

-- Client indexes (for user's clients and filtering by status)
CREATE INDEX IF NOT EXISTS "clients_userId_idx" ON "clients"("userId");
CREATE INDEX IF NOT EXISTS "clients_status_idx" ON "clients"("status");

-- Property indexes (for client's properties and filtering by status)
CREATE INDEX IF NOT EXISTS "properties_clientId_idx" ON "properties"("clientId");
CREATE INDEX IF NOT EXISTS "properties_status_idx" ON "properties"("status");

-- Synopsis indexes (for project's synopsis)
CREATE INDEX IF NOT EXISTS "color_synopsis_projectId_idx" ON "color_synopsis"("projectId");

-- Synopsis entry indexes (for filtering by synopsis, room, or color)
CREATE INDEX IF NOT EXISTS "synopsis_entries_synopsisId_idx" ON "synopsis_entries"("synopsisId");
CREATE INDEX IF NOT EXISTS "synopsis_entries_roomId_idx" ON "synopsis_entries"("roomId");
CREATE INDEX IF NOT EXISTS "synopsis_entries_colorId_idx" ON "synopsis_entries"("colorId");

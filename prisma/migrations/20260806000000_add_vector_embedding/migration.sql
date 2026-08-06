-- Temporarily unlock tables to allow schema changes
ALTER TABLE "Mission" SET (schema_locked = false);
ALTER TABLE "MemoryCapsule" SET (schema_locked = false);

-- Add vector embedding column to MemoryCapsule for semantic similarity search
ALTER TABLE "MemoryCapsule" ADD COLUMN "embedding" VECTOR(1536);

-- Re-lock the tables for changefeed safety
ALTER TABLE "Mission" SET (schema_locked = true);
ALTER TABLE "MemoryCapsule" SET (schema_locked = true);

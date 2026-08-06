-- Temporarily unlock the table to allow schema changes
ALTER TABLE "MemoryCapsule" SET (schema_locked = false);

-- Add vector embedding column to MemoryCapsule for semantic similarity search
ALTER TABLE "MemoryCapsule" ADD COLUMN "embedding" VECTOR(1536);

-- Re-lock the table for changefeed safety
ALTER TABLE "MemoryCapsule" SET (schema_locked = true);

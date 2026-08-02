-- Add S3 archival outcome status to Mission Snapshots.
-- Additive; existing rows backfill to the 'PENDING' default.
CREATE TYPE "SnapshotArchiveStatus" AS ENUM ('PENDING', 'UPLOADED', 'FAILED', 'SKIPPED');

-- CockroachDB may keep the table schema_locked (a changefeed optimization); unlock
-- for the additive change and re-lock afterward. Both SETs are no-ops if already in
-- the target state.
ALTER TABLE "MissionSnapshot" SET (schema_locked = false);
ALTER TABLE "MissionSnapshot" ADD COLUMN "archiveStatus" "SnapshotArchiveStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "MissionSnapshot" SET (schema_locked = true);

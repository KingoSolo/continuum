-- AlterTable: add optional Amazon S3 archive location for Mission Snapshots.
-- Additive and nullable; existing rows are unaffected.
-- CockroachDB may keep the table schema_locked (a changefeed optimization); unlock
-- for the additive change and re-lock afterward. Both SETs are no-ops if already in
-- the target state, so this is safe on clusters where the table is not locked.
ALTER TABLE "MissionSnapshot" SET (schema_locked = false);
ALTER TABLE "MissionSnapshot" ADD COLUMN "archiveUri" STRING;
ALTER TABLE "MissionSnapshot" SET (schema_locked = true);

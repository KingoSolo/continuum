import { describe, expect, it, vi } from 'vitest';

import { SnapshotArchiveService } from '../src/s3/snapshot-archive.service.js';

type AnyBuild = {
  snapshot: {
    id: string;
    missionId: string;
    version: number;
    archiveUri?: string | null;
    archiveStatus?: string;
  };
  selectedCapsuleIds: string[];
};

const buildFixture = (id = 's1', missionId = 'm1'): AnyBuild => ({
  snapshot: { id, missionId, version: 1, archiveUri: null, archiveStatus: 'PENDING' },
  selectedCapsuleIds: ['c1', 'c2'],
});

describe('SnapshotArchiveService', () => {
  it('records SKIPPED and does not upload when S3 is disabled', async () => {
    const s3 = { isEnabled: () => false, putJson: vi.fn() };
    const prisma = {
      missionSnapshot: {
        update: vi.fn().mockImplementation(({ data }) => ({
          ...buildFixture().snapshot,
          ...data,
        })),
      },
    };
    const service = new SnapshotArchiveService(s3 as never, prisma as never);

    const result = await service.archive('m1', buildFixture() as never);

    expect(s3.putJson).not.toHaveBeenCalled();
    expect(prisma.missionSnapshot.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { archiveStatus: 'SKIPPED' },
    });
    expect(result.snapshot.archiveStatus).toBe('SKIPPED');
  });

  it('uploads to the deterministic key and records UPLOADED with the archive URI', async () => {
    const archiveUri = 's3://bucket/mission/m1/snapshots/s1.json';
    const s3 = { isEnabled: () => true, putJson: vi.fn().mockResolvedValue(archiveUri) };
    const prisma = {
      missionSnapshot: {
        update: vi.fn().mockImplementation(({ data }) => ({ ...buildFixture().snapshot, ...data })),
      },
    };
    const service = new SnapshotArchiveService(s3 as never, prisma as never);

    const result = await service.archive('m1', buildFixture('s1', 'm1') as never);

    expect(s3.putJson).toHaveBeenCalledWith(
      'mission/m1/snapshots/s1.json',
      expect.stringContaining('"selectedCapsuleIds"'),
    );
    // Body is pretty-printed JSON.
    expect(s3.putJson.mock.calls[0][1]).toContain('\n  ');
    expect(prisma.missionSnapshot.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { archiveUri, archiveStatus: 'UPLOADED' },
    });
    expect(result.snapshot.archiveUri).toBe(archiveUri);
    expect(result.snapshot.archiveStatus).toBe('UPLOADED');
    expect(result.selectedCapsuleIds).toEqual(['c1', 'c2']);
  });

  it('records FAILED (and never throws / never rolls back) when the upload fails', async () => {
    const s3 = {
      isEnabled: () => true,
      putJson: vi.fn().mockRejectedValue(new Error('network down')),
    };
    const prisma = {
      missionSnapshot: {
        update: vi.fn().mockImplementation(({ data }) => ({ ...buildFixture().snapshot, ...data })),
      },
    };
    const service = new SnapshotArchiveService(s3 as never, prisma as never);

    const result = await service.archive('m2', buildFixture('s2', 'm2') as never);

    expect(prisma.missionSnapshot.update).toHaveBeenCalledWith({
      where: { id: 's2' },
      data: { archiveStatus: 'FAILED' },
    });
    expect(result.snapshot.archiveStatus).toBe('FAILED');
    // archiveUri is never set on failure.
    expect(result.snapshot.archiveUri).toBeNull();
  });

  it('never throws even if recording the status also fails', async () => {
    const s3 = {
      isEnabled: () => true,
      putJson: vi.fn().mockRejectedValue(new Error('upload failed')),
    };
    const prisma = {
      missionSnapshot: { update: vi.fn().mockRejectedValue(new Error('db write failed')) },
    };
    const service = new SnapshotArchiveService(s3 as never, prisma as never);

    const build = buildFixture('s3', 'm3');
    const result = await service.archive('m3', build as never);

    // Original build returned unchanged; no throw.
    expect(result).toBe(build);
  });
});

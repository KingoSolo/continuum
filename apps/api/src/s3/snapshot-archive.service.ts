import { Inject, Injectable, Logger } from '@nestjs/common';
import { SnapshotArchiveStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import type { MissionSnapshotBuild } from '@continuum/memory-engine';

import type { PrismaService } from '../memory/memory.module.js';
import { S3Service } from './s3.service.js';

/**
 * Best-effort archival of a freshly generated Mission Snapshot to Amazon S3.
 *
 * The snapshot has already been committed to CockroachDB by the Memory Engine.
 * Archival is additive and must never affect that outcome: if S3 is unconfigured
 * the build is returned untouched, and if the upload fails the error is logged
 * and the original build is returned — CockroachDB is never rolled back and the
 * request still succeeds.
 */
@Injectable()
export class SnapshotArchiveService {
  private readonly logger = new Logger(SnapshotArchiveService.name);

  constructor(
    @Inject(S3Service) private readonly s3: S3Service,
    @Inject('PRISMA_SERVICE') private readonly prisma: PrismaService,
  ) {}

  async archive(missionId: string, build: MissionSnapshotBuild): Promise<MissionSnapshotBuild> {
    const { snapshot } = build;

    if (!this.s3.isEnabled()) {
      return this.persistOutcome(build, { archiveStatus: SnapshotArchiveStatus.SKIPPED });
    }

    const key = `mission/${missionId}/snapshots/${snapshot.id}.json`;
    try {
      const body = JSON.stringify(build, null, 2);
      const archiveUri = await this.s3.putJson(key, body);
      this.logger.log(`Archived snapshot ${snapshot.id} to ${archiveUri}.`);
      return this.persistOutcome(build, {
        archiveUri,
        archiveStatus: SnapshotArchiveStatus.UPLOADED,
      });
    } catch (error) {
      this.logger.error(
        `Failed to archive snapshot ${snapshot.id} to S3 (key ${key}); ` +
          'the snapshot remains persisted in CockroachDB and the request succeeds.',
        error instanceof Error ? error.stack : String(error),
      );
      return this.persistOutcome(build, { archiveStatus: SnapshotArchiveStatus.FAILED });
    }
  }

  /**
   * Persist the archival outcome onto the snapshot record. Best-effort: a failure
   * to write the status must never fail snapshot generation, so it is logged and
   * the (unmodified) build is returned.
   */
  private async persistOutcome(
    build: MissionSnapshotBuild,
    data: Prisma.MissionSnapshotUpdateInput,
  ): Promise<MissionSnapshotBuild> {
    try {
      const updated = await this.prisma.missionSnapshot.update({
        where: { id: build.snapshot.id },
        data,
      });
      return { ...build, snapshot: updated };
    } catch (error) {
      this.logger.error(
        `Failed to record archive status for snapshot ${build.snapshot.id}; returning as-is.`,
        error instanceof Error ? error.stack : String(error),
      );
      return build;
    }
  }
}

import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { MemoryEngineService } from '@continuum/memory-engine';

import {
  RecordMemoryCapsuleDto,
  RecordMemoryCapsuleValidationPipe,
} from './dto/record-memory-capsule.dto.js';
import { MemoryApiService } from './memory-api.service.js';

const missionParam = {
  name: 'missionId',
  format: 'uuid',
  example: '00000000-0000-0000-0000-000000000001',
};

@ApiTags('Memory')
@Controller('missions/:missionId')
export class MemoryController {
  constructor(
    @Inject(MemoryEngineService)
    private readonly memoryEngine: MemoryEngineService,
    @Inject(MemoryApiService)
    private readonly memoryApi: MemoryApiService,
  ) {}

  @Post('memory/capsules')
  @ApiOperation({ summary: 'Record a Memory Capsule for a supported mission artifact.' })
  @ApiParam(missionParam)
  @ApiBody({ type: RecordMemoryCapsuleDto })
  @ApiOkResponse({
    description: 'The persisted immutable Memory Capsule.',
    schema: { example: { id: 'uuid', importance: 'HIGH' } },
  })
  recordCapsule(
    @Param('missionId', new ParseUUIDPipe()) missionId: string,
    @Body(new RecordMemoryCapsuleValidationPipe()) body: RecordMemoryCapsuleDto,
  ) {
    return this.memoryEngine
      .recordMemoryCapsule({ ...body, missionId, occurredAt: new Date(body.occurredAt) })
      .then((result) => this.memoryApi.unwrap(result));
  }

  @Get('context')
  @ApiOperation({ summary: 'Build and return the current curated Mission Context.' })
  @ApiParam(missionParam)
  @ApiOkResponse({
    description: 'A curated Mission Context and selected capsule identifiers.',
    schema: { example: { context: { version: 1 }, selectedCapsuleIds: ['uuid'] } },
  })
  context(@Param('missionId', new ParseUUIDPipe()) missionId: string) {
    return this.memoryEngine
      .buildMissionContext(missionId)
      .then((result) => this.memoryApi.unwrap(result));
  }

  @Post('snapshots')
  @ApiOperation({
    summary: 'Generate a published continuity snapshot from the current Mission Context.',
  })
  @ApiParam(missionParam)
  @ApiOkResponse({
    description: 'The immutable snapshot and included capsule identifiers.',
    schema: {
      example: { snapshot: { version: 1, status: 'PUBLISHED' }, selectedCapsuleIds: ['uuid'] },
    },
  })
  snapshot(@Param('missionId', new ParseUUIDPipe()) missionId: string) {
    return this.memoryEngine
      .generateMissionSnapshot(missionId)
      .then((result) => this.memoryApi.unwrap(result));
  }

  @Get('timeline')
  @ApiOperation({ summary: 'Retrieve chronological mission capsule history for Mission Replay.' })
  @ApiParam(missionParam)
  @ApiOkResponse({
    description: 'Memory Capsules ordered by occurrence time.',
    schema: { example: [{ id: 'uuid', occurredAt: '2038-09-16T04:12:00.000Z' }] },
  })
  timeline(@Param('missionId', new ParseUUIDPipe()) missionId: string) {
    return this.memoryEngine
      .retrieveMissionTimeline(missionId)
      .then((result) => this.memoryApi.unwrap(result));
  }

  @Get('knowledge')
  @ApiOperation({ summary: 'Retrieve validated Operational Knowledge relevant to mission work.' })
  @ApiParam(missionParam)
  @ApiOkResponse({
    description: 'Active Knowledge Vault entries with their admitted lessons.',
    schema: {
      example: [{ entry: { status: 'ACTIVE' }, lesson: { title: 'Protect relay geometry' } }],
    },
  })
  knowledge(@Param('missionId', new ParseUUIDPipe()) missionId: string) {
    return this.memoryEngine
      .retrieveOperationalKnowledge(missionId)
      .then((result) => this.memoryApi.unwrap(result));
  }
}

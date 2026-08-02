import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { MemoryEngineService } from '@continuum/memory-engine';

import { MemoryApiService } from '../memory/memory-api.service.js';
// Both DTOs must be value imports: they are consumed at runtime by the
// ValidationPipe. `import type` erases the class, leaving an empty whitelist so
// forbidNonWhitelisted rejects every field (400 "property X should not exist").
// Each is also referenced as a value in an @ApiBody({ type }) so that
// consistent-type-imports does not push them back to `import type`.
import {
  RegisterMissionAgentDto,
  ReplaceMissionAgentDto,
} from '../mission/dto/mission-actions.dto.js';
import { MissionDomainService } from '../mission/mission-domain.service.js';

@ApiTags('Agent')
@Controller('missions/:missionId/agents')
export class AgentController {
  constructor(
    @Inject(MemoryEngineService)
    private readonly memoryEngine: MemoryEngineService,
    @Inject(MemoryApiService)
    private readonly memoryApi: MemoryApiService,
    @Inject(MissionDomainService)
    private readonly domain: MissionDomainService,
  ) {}

  @Get(':agentId/context')
  @ApiOperation({ summary: 'Retrieve the Mission Context an assigned agent should inherit.' })
  @ApiParam({ name: 'missionId', format: 'uuid', example: '00000000-0000-0000-0000-000000000001' })
  @ApiParam({ name: 'agentId', format: 'uuid', example: '00000000-0000-0000-0000-000000000002' })
  @ApiOkResponse({
    description: 'Inherited context and its selected Memory Capsules.',
    schema: { example: { context: { version: 1 }, selectedCapsuleIds: ['uuid'] } },
  })
  context(
    @Param('missionId', new ParseUUIDPipe()) missionId: string,
    @Param('agentId', new ParseUUIDPipe()) agentId: string,
  ) {
    return this.memoryEngine
      .retrieveContextForAgent(missionId, agentId)
      .then((result) => this.memoryApi.unwrap(result));
  }

  @Post()
  @ApiOperation({ summary: 'Register a new agent and active mission assignment.' })
  @ApiBody({
    type: RegisterMissionAgentDto,
  })
  @ApiParam({ name: 'missionId', format: 'uuid' })
  register(
    @Param('missionId', new ParseUUIDPipe()) missionId: string,
    @Body() dto: RegisterMissionAgentDto,
  ) {
    return this.domain.registerAgent(missionId, dto);
  }

  @Post(':agentId/fail')
  @ApiOperation({ summary: 'Suspend a failed mission agent and assignment.' })
  @ApiParam({ name: 'agentId', format: 'uuid' })
  fail(
    @Param('missionId', new ParseUUIDPipe()) missionId: string,
    @Param('agentId', new ParseUUIDPipe()) agentId: string,
  ) {
    return this.domain.failAgent(missionId, agentId);
  }

  @Post(':agentId/replace')
  @ApiOperation({ summary: 'Create a replacement agent and retrieve inherited Mission Context.' })
  @ApiBody({
    type: ReplaceMissionAgentDto,
  })
  @ApiParam({ name: 'agentId', format: 'uuid' })
  replace(
    @Param('missionId', new ParseUUIDPipe()) missionId: string,
    @Param('agentId', new ParseUUIDPipe()) agentId: string,
    @Body() body: ReplaceMissionAgentDto,
  ) {
    return this.domain.replaceAgent(missionId, agentId, body);
  }
}

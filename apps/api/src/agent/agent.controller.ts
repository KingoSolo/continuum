import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { MemoryEngineService } from '@continuum/memory-engine';

import { MemoryApiService } from '../memory/memory-api.service.js';
import type {
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
  @ApiParam({ name: 'missionId', format: 'uuid' })
  register(
    @Param('missionId', new ParseUUIDPipe()) missionId: string,
    @Body() body: RegisterMissionAgentDto,
  ) {
    return this.domain.registerAgent(missionId, body);
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
  replace(
    @Param('missionId', new ParseUUIDPipe()) missionId: string,
    @Param('agentId', new ParseUUIDPipe()) agentId: string,
    @Body() body: ReplaceMissionAgentDto,
  ) {
    return this.domain.replaceAgent(missionId, agentId, body);
  }
}

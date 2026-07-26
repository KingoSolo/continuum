import { Controller, Get, Inject, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { MemoryEngineService } from '@continuum/memory-engine';

import { MemoryApiService } from '../memory/memory-api.service.js';

@ApiTags('Agent')
@Controller('missions/:missionId/agents')
export class AgentController {
  constructor(
    @Inject(MemoryEngineService)
    private readonly memoryEngine: MemoryEngineService,
    @Inject(MemoryApiService)
    private readonly memoryApi: MemoryApiService,
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
}

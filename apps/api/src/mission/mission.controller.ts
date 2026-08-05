import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import {
  CreateDecisionDto,
  CreateReasoningDto,
  RecordLessonDto,
  RecordObservationDto,
  ReportHazardDto,
  ResolveDebateDto,
  StartDebateDto,
  UpdateObjectiveDto,
} from './dto/mission-actions.dto.js';
import { MissionDomainService } from './mission-domain.service.js';

const mission = { name: 'missionId', format: 'uuid' };

@ApiTags('Mission operations')
@Controller('missions/:missionId')
export class MissionController {
  constructor(@Inject(MissionDomainService) private readonly domain: MissionDomainService) {}

  @Post('observations')
  @ApiOperation({ summary: 'Record a new observation and its Memory Capsule.' })
  @ApiParam(mission)
  @ApiBody({ type: RecordObservationDto })
  @ApiOkResponse({ description: 'Recorded observation.' })
  observation(
    @Param('missionId', new ParseUUIDPipe()) missionId: string,
    @Body() body: RecordObservationDto,
  ) {
    return this.domain.recordObservation(missionId, body);
  }

  @Post('hazards')
  @ApiOperation({ summary: 'Report a newly detected hazard and its Memory Capsule.' })
  @ApiParam(mission)
  @ApiBody({ type: ReportHazardDto })
  @ApiOkResponse({ description: 'Reported hazard.' })
  hazard(
    @Param('missionId', new ParseUUIDPipe()) missionId: string,
    @Body() body: ReportHazardDto,
  ) {
    return this.domain.reportHazard(missionId, body);
  }

  @Patch('hazards/:hazardId/resolve')
  @ApiOperation({ summary: 'Mark a hazard as mitigated.' })
  @ApiParam(mission)
  @ApiParam({ name: 'hazardId', format: 'uuid' })
  @ApiOkResponse({ description: 'Mitigated hazard.' })
  resolveHazard(
    @Param('missionId', new ParseUUIDPipe()) missionId: string,
    @Param('hazardId', new ParseUUIDPipe()) hazardId: string,
  ) {
    return this.domain.resolveHazard(missionId, hazardId);
  }

  @Post('reasoning')
  @ApiOperation({ summary: 'Persist reasoning and its Memory Capsule.' })
  @ApiParam(mission)
  @ApiBody({ type: CreateReasoningDto })
  @ApiOkResponse({ description: 'Reasoning artifact.' })
  reasoning(
    @Param('missionId', new ParseUUIDPipe()) missionId: string,
    @Body() body: CreateReasoningDto,
  ) {
    return this.domain.createReasoning(missionId, body);
  }

  @Post('debates')
  @ApiOperation({ summary: 'Start a debate and record its Memory Capsule.' })
  @ApiParam(mission)
  @ApiBody({ type: StartDebateDto })
  @ApiOkResponse({ description: 'Started debate.' })
  debate(@Param('missionId', new ParseUUIDPipe()) missionId: string, @Body() body: StartDebateDto) {
    return this.domain.startDebate(missionId, body);
  }

  @Post('debates/:debateId/resolve')
  @ApiOperation({ summary: 'Resolve a debate without erasing dissent.' })
  @ApiParam(mission)
  @ApiParam({ name: 'debateId', format: 'uuid' })
  @ApiBody({ type: ResolveDebateDto })
  @ApiOkResponse({ description: 'Resolved debate.' })
  resolveDebate(
    @Param('missionId', new ParseUUIDPipe()) missionId: string,
    @Param('debateId', new ParseUUIDPipe()) debateId: string,
    @Body() body: ResolveDebateDto,
  ) {
    return this.domain.resolveDebate(missionId, debateId, body);
  }

  @Post('decisions')
  @ApiOperation({ summary: 'Create an authoritative decision and its Memory Capsule.' })
  @ApiParam(mission)
  @ApiBody({ type: CreateDecisionDto })
  @ApiOkResponse({ description: 'Created decision.' })
  decision(
    @Param('missionId', new ParseUUIDPipe()) missionId: string,
    @Body() body: CreateDecisionDto,
  ) {
    return this.domain.createDecision(missionId, body);
  }

  @Post('decisions/:decisionId/execute')
  @ApiOperation({ summary: 'Mark a decision as executed.' })
  @ApiParam(mission)
  @ApiParam({ name: 'decisionId', format: 'uuid' })
  @ApiOkResponse({ description: 'Executed decision.' })
  executeDecision(
    @Param('missionId', new ParseUUIDPipe()) missionId: string,
    @Param('decisionId', new ParseUUIDPipe()) decisionId: string,
  ) {
    return this.domain.executeDecision(missionId, decisionId);
  }

  @Post('lessons')
  @ApiOperation({ summary: 'Record a lesson candidate and its Memory Capsule.' })
  @ApiParam(mission)
  @ApiBody({ type: RecordLessonDto })
  @ApiOkResponse({ description: 'Lesson candidate.' })
  lesson(
    @Param('missionId', new ParseUUIDPipe()) missionId: string,
    @Body() body: RecordLessonDto,
  ) {
    return this.domain.recordLesson(missionId, body);
  }

  @Post('lessons/:lessonId/promote')
  @ApiOperation({ summary: 'Promote a validated lesson into the Operational Knowledge Vault.' })
  @ApiParam(mission)
  @ApiParam({ name: 'lessonId', format: 'uuid' })
  @ApiOkResponse({ description: 'Vault admission.' })
  promoteLesson(
    @Param('missionId', new ParseUUIDPipe()) missionId: string,
    @Param('lessonId', new ParseUUIDPipe()) lessonId: string,
  ) {
    return this.domain.promoteLesson(missionId, lessonId);
  }

  // Read path for the mission's objectives. Mission Control needs the real
  // persisted status (and ids, to drive PATCH) rather than a local copy; without
  // this the UI has no way to render objective state from the source of truth.
  @Get('objectives')
  @ApiOperation({ summary: "Retrieve the mission's objectives and their current status." })
  @ApiParam(mission)
  @ApiOkResponse({ description: 'Objectives ordered by creation time.' })
  objectives(@Param('missionId', new ParseUUIDPipe()) missionId: string) {
    return this.domain.listObjectives(missionId);
  }

  @Patch('objectives/:objectiveId')
  @ApiOperation({ summary: 'Update objective progress or completion.' })
  @ApiParam(mission)
  @ApiParam({ name: 'objectiveId', format: 'uuid' })
  @ApiBody({ type: UpdateObjectiveDto })
  @ApiOkResponse({ description: 'Updated objective.' })
  objective(
    @Param('missionId', new ParseUUIDPipe()) missionId: string,
    @Param('objectiveId', new ParseUUIDPipe()) objectiveId: string,
    @Body() body: UpdateObjectiveDto,
  ) {
    return this.domain.updateObjective(missionId, objectiveId, body);
  }
}

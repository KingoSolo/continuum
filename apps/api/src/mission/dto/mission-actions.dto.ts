import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AssignmentStatus,
  AuthorityLevel,
  Classification,
  DebatePositionStance,
  DecisionStatus,
  HazardStatus,
  Importance,
  ObjectiveStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class RecordObservationDto {
  @ApiProperty() @IsUUID() authorAgentId!: string;
  @ApiProperty() @IsString() statement!: string;
  @ApiProperty() @IsString() scope!: string;
  @ApiProperty() @IsString() sourceName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() provenanceUri?: string;
  @ApiProperty({ example: true }) @IsBoolean() isDirectEvidence!: boolean;
  @ApiProperty({ enum: Importance }) @IsEnum(Importance) importance!: Importance;
  @ApiProperty({ minimum: 0, maximum: 1 }) @IsNumber() @Min(0) @Max(1) confidence!: number;
  @ApiPropertyOptional({ enum: Classification })
  @IsOptional()
  @IsEnum(Classification)
  classification?: Classification;
  @ApiProperty({ format: 'date-time' }) @IsDateString() capturedAt!: string;
}

export class ReportHazardDto {
  @ApiProperty() @IsUUID() reporterAgentId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() ownerAgentId?: string;
  @ApiProperty() @IsString() title!: string;
  @ApiProperty() @IsString() description!: string;
  @ApiProperty() @IsString() impact!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1) likelihood?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() mitigationPlan?: string;
  @ApiProperty({ enum: Importance }) @IsEnum(Importance) importance!: Importance;
  @ApiPropertyOptional({ enum: Classification })
  @IsOptional()
  @IsEnum(Classification)
  classification?: Classification;
}

export class CreateReasoningDto {
  @ApiProperty() @IsUUID() authorAgentId!: string;
  @ApiProperty() @IsString() claim!: string;
  @ApiProperty() @IsString() conclusion!: string;
  @ApiProperty() @IsString() assumptions!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() alternatives?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() uncertainty?: string;
  @ApiProperty({ enum: Importance }) @IsEnum(Importance) importance!: Importance;
  @ApiProperty({ minimum: 0, maximum: 1 }) @IsNumber() @Min(0) @Max(1) confidence!: number;
}

export class DebatePositionDto {
  @ApiProperty() @IsUUID() agentId!: string;
  @ApiProperty({ enum: DebatePositionStance })
  @IsEnum(DebatePositionStance)
  stance!: DebatePositionStance;
  @ApiProperty() @IsString() argument!: string;
  @ApiPropertyOptional() @IsOptional() isDissent?: boolean;
}

export class StartDebateDto {
  @ApiProperty() @IsUUID() convenedByAgentId!: string;
  @ApiProperty() @IsString() question!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() admissibilityRules?: string;
  @ApiProperty({ enum: Importance }) @IsEnum(Importance) importance!: Importance;
  @ApiPropertyOptional({ type: [DebatePositionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DebatePositionDto)
  positions?: DebatePositionDto[];
}

export class ResolveDebateDto {
  @ApiProperty() @IsString() resolutionSummary!: string;
  @ApiProperty() @IsString() resolutionAuthority!: string;
}

export class CreateDecisionDto {
  @ApiProperty() @IsUUID() proposedByAgentId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() decidedByAgentId?: string;
  @ApiProperty() @IsString() title!: string;
  @ApiProperty() @IsString() chosenOption!: string;
  @ApiProperty() @IsString() rationale!: string;
  @ApiProperty() @IsString() effectiveScope!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reviewTrigger?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reversalConditions?: string;
  @ApiProperty({ enum: Importance }) @IsEnum(Importance) importance!: Importance;
}

export class RecordLessonDto {
  @ApiProperty() @IsUUID() authorAgentId!: string;
  @ApiProperty() @IsString() title!: string;
  @ApiProperty() @IsString() statement!: string;
  @ApiProperty() @IsString() applicability!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() limitations?: string;
  @ApiProperty({ enum: Importance }) @IsEnum(Importance) importance!: Importance;
  @ApiProperty({ minimum: 0, maximum: 1 }) @IsNumber() @Min(0) @Max(1) confidence!: number;
}

export class RegisterMissionAgentDto {
  @ApiProperty() @IsString() handle!: string;
  @ApiProperty() @IsString() displayName!: string;
  @ApiProperty() @IsString() role!: string;
  @ApiProperty({ enum: AuthorityLevel }) @IsEnum(AuthorityLevel) authority!: AuthorityLevel;
  @ApiProperty({ example: ['navigation', 'route-planning'] }) @IsArray() capabilities!: string[];
}

export class ReplaceMissionAgentDto extends RegisterMissionAgentDto {}

export class UpdateObjectiveDto {
  @ApiPropertyOptional() @IsOptional() @IsString() progressSummary?: string;
  @ApiPropertyOptional({ enum: ObjectiveStatus })
  @IsOptional()
  @IsEnum(ObjectiveStatus)
  status?: ObjectiveStatus;
}

export const resolvedHazardStatus = HazardStatus.MITIGATED;
export const executedDecisionStatus = DecisionStatus.EXECUTED;
export const activeAssignmentStatus = AssignmentStatus.ACTIVE;

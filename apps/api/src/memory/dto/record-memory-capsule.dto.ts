import { CapsuleEntityType, Importance } from '@prisma/client';
import { BadRequestException, type PipeTransform } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  validateSync,
} from 'class-validator';

const RECORDABLE_ENTITY_TYPES = [
  CapsuleEntityType.OBSERVATION,
  CapsuleEntityType.REASONING,
  CapsuleEntityType.DECISION,
  CapsuleEntityType.DEBATE,
  CapsuleEntityType.HAZARD,
  CapsuleEntityType.LESSON,
] as const;

export class RecordMemoryCapsuleDto {
  @ApiProperty({ enum: RECORDABLE_ENTITY_TYPES, example: CapsuleEntityType.OBSERVATION })
  @IsEnum(CapsuleEntityType)
  @IsIn(RECORDABLE_ENTITY_TYPES)
  referencedEntityType!: (typeof RECORDABLE_ENTITY_TYPES)[number];

  @ApiProperty({ format: 'uuid', example: '11111111-1111-1111-1111-111111111111' })
  @IsUUID()
  referencedEntityId!: string;

  @ApiProperty({ format: 'uuid', example: '22222222-2222-2222-2222-222222222222' })
  @IsUUID()
  authorAgentId!: string;

  @ApiProperty({ format: 'date-time', example: '2038-09-16T04:12:00.000Z' })
  @IsDateString()
  occurredAt!: string;

  @ApiProperty({ enum: Importance, example: Importance.HIGH })
  @IsEnum(Importance)
  importance!: Importance;

  @ApiProperty({ minimum: 0, maximum: 1, example: 0.91 })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  confidence!: number;

  @ApiProperty({ required: false, example: 'embedding://ares-7/observation/telemetry-0412' })
  @IsOptional()
  @IsString()
  embeddingReference?: string;
}

// Explicit validation preserves the DTO contract for consumers whose transpiler
// does not emit Nest's design-time parameter metadata.
export class RecordMemoryCapsuleValidationPipe implements PipeTransform<
  unknown,
  RecordMemoryCapsuleDto
> {
  transform(value: unknown): RecordMemoryCapsuleDto {
    const dto = plainToInstance(RecordMemoryCapsuleDto, value);
    const errors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length > 0) {
      throw new BadRequestException({ message: 'Request validation failed.', errors });
    }

    return dto;
  }
}

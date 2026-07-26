import { Module } from '@nestjs/common';

import { MemoryModule } from '../memory/memory.module.js';
import { MissionController } from './mission.controller.js';
import { MissionDomainService } from './mission-domain.service.js';

@Module({
  imports: [MemoryModule],
  controllers: [MissionController],
  providers: [MissionDomainService],
  exports: [MissionDomainService],
})
export class MissionModule {}

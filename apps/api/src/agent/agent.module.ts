import { Module } from '@nestjs/common';

import { MemoryModule } from '../memory/memory.module.js';
import { MissionModule } from '../mission/mission.module.js';
import { AgentController } from './agent.controller.js';

@Module({ imports: [MemoryModule, MissionModule], controllers: [AgentController] })
export class AgentModule {}

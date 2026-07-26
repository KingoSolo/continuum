import { Module } from '@nestjs/common';

import { AgentModule } from '../agent/agent.module.js';
import { MemoryModule } from '../memory/memory.module.js';

@Module({ imports: [MemoryModule, AgentModule] })
export class MissionModule {}

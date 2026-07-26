import { Module } from '@nestjs/common';

import { MemoryModule } from '../memory/memory.module.js';
import { AgentController } from './agent.controller.js';

@Module({ imports: [MemoryModule], controllers: [AgentController] })
export class AgentModule {}

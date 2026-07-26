import { Module } from '@nestjs/common';

import { AgentModule } from './agent/agent.module.js';
import { MissionModule } from './mission/mission.module.js';

@Module({ imports: [MissionModule, AgentModule] })
export class AppModule {}

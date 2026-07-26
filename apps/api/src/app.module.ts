import { Module } from '@nestjs/common';

import { MissionModule } from './mission/mission.module.js';

@Module({ imports: [MissionModule] })
export class AppModule {}

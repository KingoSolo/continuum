import { Module } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { MemoryEngineService } from '@continuum/memory-engine';
import { PrismaClient } from '@prisma/client';

import { MemoryApiService } from './memory-api.service.js';
import { MemoryController } from './memory.controller.js';

class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

@Module({
  controllers: [MemoryController],
  providers: [
    PrismaService,
    {
      provide: MemoryEngineService,
      useFactory: (prisma: PrismaService) => new MemoryEngineService(prisma),
      inject: [PrismaService],
    },
    MemoryApiService,
  ],
  exports: [MemoryEngineService, MemoryApiService],
})
export class MemoryModule {}

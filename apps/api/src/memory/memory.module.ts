import { Module } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { MemoryEngineService } from '@continuum/memory-engine';
import { PrismaClient } from '@prisma/client';

import { MemoryApiService } from './memory-api.service.js';
import { MemoryController } from './memory.controller.js';

export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

@Module({
  controllers: [MemoryController],
  providers: [
    PrismaService,
    { provide: 'PRISMA_SERVICE', useExisting: PrismaService },
    {
      provide: MemoryEngineService,
      useFactory: (prisma: PrismaService) => new MemoryEngineService(prisma),
      inject: [PrismaService],
    },
    { provide: 'MEMORY_ENGINE', useExisting: MemoryEngineService },
    MemoryApiService,
  ],
  exports: [
    PrismaService,
    'PRISMA_SERVICE',
    MemoryEngineService,
    'MEMORY_ENGINE',
    MemoryApiService,
  ],
})
export class MemoryModule {}

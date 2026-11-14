import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
      console.log('✅ Base de datos PostgreSQL conectada correctamente.');
    } catch (error: any) {
      console.warn('⚠️ No se pudo conectar a PostgreSQL:', error?.message);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

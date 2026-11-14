import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProductsModule } from './products/products.module.js';
import { TablesModule } from './tables/tables.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { CashModule } from './cash/cash.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';

import { DatabaseModule } from './database/database.module.js';

@Module({
  imports: [
    PrismaModule,
    DatabaseModule,
    ProductsModule,
    TablesModule,
    OrdersModule,
    AuthModule,
    UsersModule,
    CashModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

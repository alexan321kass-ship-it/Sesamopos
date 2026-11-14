import { Module } from '@nestjs/common';
import { ProductsController, CategoriesController } from './products.controller.js';
import { ProductsService } from './products.service.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ProductsController, CategoriesController],
  providers: [ProductsService],
})
export class ProductsModule {}

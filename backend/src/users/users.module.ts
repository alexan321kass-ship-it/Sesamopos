import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { StaffController, UsersController } from './users.controller.js';

@Module({
  imports: [DatabaseModule],
  controllers: [StaffController, UsersController],
  providers: [UsersService],
  exports: [UsersService]
})
export class UsersModule {}

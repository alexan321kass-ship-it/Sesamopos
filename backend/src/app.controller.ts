import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { AppService } from './app.service.js';
import { DatabaseService } from './database/database.service.js';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly db: DatabaseService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Inventory
  @Get('inventory')
  getInventory() {
    return this.db.getAll('inventory');
  }

  @Post('inventory')
  createInventory(@Body() body: any) {
    return this.db.addOne('inventory', body);
  }

  @Patch('inventory/:id')
  updateInventory(@Param('id') id: string, @Body() body: any) {
    return this.db.updateOne('inventory', id, (item: any) => ({ ...item, ...body }));
  }

  @Delete('inventory/:id')
  deleteInventory(@Param('id') id: string) {
    return this.db.deleteOne('inventory', id);
  }

  // Deliveries
  @Get('deliveries')
  getDeliveries() {
    return this.db.getAll('deliveries');
  }

  @Post('deliveries')
  createDelivery(@Body() body: any) {
    return this.db.addOne('deliveries', body);
  }

  @Patch('deliveries/:id')
  updateDelivery(@Param('id') id: string, @Body() body: any) {
    return this.db.updateOne('deliveries', id, (item: any) => ({ ...item, ...body }));
  }

  @Delete('deliveries/:id')
  deleteDelivery(@Param('id') id: string) {
    return this.db.deleteOne('deliveries', id);
  }

  // Reservations
  @Get('reservations')
  getReservations() {
    return this.db.getAll('reservations');
  }

  @Post('reservations')
  createReservation(@Body() body: any) {
    return this.db.addOne('reservations', body);
  }

  @Patch('reservations/:id')
  updateReservation(@Param('id') id: string, @Body() body: any) {
    return this.db.updateOne('reservations', id, (item: any) => ({ ...item, ...body }));
  }

  @Delete('reservations/:id')
  deleteReservation(@Param('id') id: string) {
    return this.db.deleteOne('reservations', id);
  }
}


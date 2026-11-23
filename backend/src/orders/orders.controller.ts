import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { OrdersService } from './orders.service.js';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  getAllOrders() {
    return this.ordersService.findAll();
  }

  @Get(':id')
  getOrderById(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Post()
  createOrder(@Body() createOrderDto: any) {
    return this.ordersService.create(createOrderDto);
  }

  @Patch(':id/status')
  updateOrderStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.ordersService.updateStatus(id, status);
  }

  @Patch(':id')
  updateOrder(@Param('id') id: string, @Body() updateData: any) {
    return this.ordersService.update(id, updateData);
  }

  @Delete(':id')
  deleteOrder(@Param('id') id: string) {
    return this.ordersService.delete(id);
  }
}

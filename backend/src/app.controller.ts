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

  // Settings
  @Get('settings')
  getSettings() {
    return this.db.getSettings();
  }

  @Patch('settings')
  updateSettings(@Body() body: any) {
    return this.db.updateSettings(body);
  }

  @Post('settings')
  saveSettings(@Body() body: any) {
    return this.db.updateSettings(body);
  }

  // Suppliers
  @Get('suppliers')
  getSuppliers() {
    return this.db.getAll('suppliers');
  }

  @Post('suppliers')
  createSupplier(@Body() body: any) {
    return this.db.addOne('suppliers', body);
  }

  @Patch('suppliers/:id')
  updateSupplier(@Param('id') id: string, @Body() body: any) {
    return this.db.updateOne('suppliers', id, (item: any) => ({ ...item, ...body }));
  }

  @Delete('suppliers/:id')
  deleteSupplier(@Param('id') id: string) {
    return this.db.deleteOne('suppliers', id);
  }

  // Purchases
  @Get('purchases')
  getPurchases() {
    return this.db.getAll('purchases');
  }

  @Post('purchases')
  createPurchase(@Body() body: any) {
    return this.db.addOne('purchases', body);
  }

  @Patch('purchases/:id')
  updatePurchase(@Param('id') id: string, @Body() body: any) {
    return this.db.updateOne('purchases', id, (item: any) => ({ ...item, ...body }));
  }

  @Delete('purchases/:id')
  deletePurchase(@Param('id') id: string) {
    return this.db.deleteOne('purchases', id);
  }

  // Recipes
  @Get('recipes')
  getRecipes() {
    return this.db.getAll('recipes');
  }

  @Get('recipes/:productId')
  async getRecipeByProductId(@Param('productId') productId: string) {
    const recipes: any[] = await this.db.getAll('recipes');
    return recipes.find(r => r.productId === productId || r.id === productId) || null;
  }

  @Post('recipes')
  createRecipe(@Body() body: any) {
    return this.db.addOne('recipes', body);
  }

  @Patch('recipes/:id')
  updateRecipe(@Param('id') id: string, @Body() body: any) {
    return this.db.updateOne('recipes', id, (item: any) => ({ ...item, ...body }));
  }

  @Delete('recipes/:id')
  deleteRecipe(@Param('id') id: string) {
    return this.db.deleteOne('recipes', id);
  }

  // Customers
  @Get('customers')
  getCustomers() {
    return this.db.getAll('customers');
  }

  @Post('customers')
  createCustomer(@Body() body: any) {
    return this.db.addOne('customers', body);
  }

  @Patch('customers/:id')
  updateCustomer(@Param('id') id: string, @Body() body: any) {
    return this.db.updateOne('customers', id, (item: any) => ({ ...item, ...body }));
  }

  @Delete('customers/:id')
  deleteCustomer(@Param('id') id: string) {
    return this.db.deleteOne('customers', id);
  }

  @Post('customers/:id/loyalty')
  async addLoyaltyPoints(@Param('id') id: string, @Body() body: { pointsDelta: number }) {
    return this.db.updateOne('customers', id, (c: any) => ({
      ...c,
      loyaltyPoints: Math.max(0, (Number(c.loyaltyPoints) || 0) + (Number(body?.pointsDelta) || 0)),
    }));
  }
}


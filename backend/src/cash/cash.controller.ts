import { Controller, Get, Post, Body } from '@nestjs/common';
import { CashService } from './cash.service.js';

@Controller('cash')
export class CashController {
  constructor(private readonly cashService: CashService) {}

  @Get('current')
  async getCurrentRegister() {
    return await this.cashService.getCurrentRegister();
  }

  @Post('open')
  async openRegister(@Body() body: { initialAmount: number; openedBy: string }) {
    return await this.cashService.openRegister(body.initialAmount, body.openedBy);
  }

  @Post('movements')
  async addMovement(@Body() body: { type: 'INGRESO' | 'GASTO'; amount: number; reason: string }) {
    return await this.cashService.addMovement(body.type, body.amount, body.reason);
  }

  @Get('movements')
  async getMovements() {
    return await this.cashService.getMovements();
  }

  @Post('close')
  async closeRegister(@Body() body: { countedCash: number; notes?: string; closedBy?: string }) {
    return await this.cashService.closeRegister(body.countedCash, body.notes, body.closedBy);
  }

  @Get('history')
  async getHistory() {
    return await this.cashService.getHistory();
  }
}

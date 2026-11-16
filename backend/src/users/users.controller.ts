import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Headers, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service.js';

@Controller('staff')
export class StaffController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getAll() {
    return this.usersService.findAll();
  }

  @Get('shifts')
  async getShifts() {
    return this.usersService.getShifts();
  }

  @Get('shifts/logs')
  async getShiftLogs() {
    return this.usersService.getShiftLogs();
  }

  @Post('shifts')
  async addShift(@Body() body: any, @Headers('x-user-role') role?: string) {
    if (role && !['ADMINISTRADOR', 'GERENTE'].includes(role)) {
      throw new ForbiddenException('Solo el administrador o gerente puede crear registros de turnos manuales');
    }
    return this.usersService.addShift(body);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException('Colaborador no encontrado');
    return user;
  }

  @Post()
  async create(@Body() body: any, @Headers('x-user-role') role?: string) {
    if (role && !['ADMINISTRADOR', 'GERENTE'].includes(role)) {
      throw new ForbiddenException('Solo el administrador o gerente puede agregar colaboradores');
    }
    return this.usersService.addUser(body);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any, @Headers('x-user-role') role?: string) {
    if (role && !['ADMINISTRADOR', 'GERENTE'].includes(role)) {
      throw new ForbiddenException('Solo el administrador o gerente puede modificar datos del personal');
    }
    return this.usersService.updateUser(id, body);
  }

  @Patch(':id')
  async patch(@Param('id') id: string, @Body() body: any, @Headers('x-user-role') role?: string) {
    if (role && !['ADMINISTRADOR', 'GERENTE'].includes(role)) {
      throw new ForbiddenException('Solo el administrador o gerente puede modificar datos del personal');
    }
    return this.usersService.updateUser(id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Headers('x-user-role') role?: string) {
    if (role && !['ADMINISTRADOR', 'GERENTE'].includes(role)) {
      throw new ForbiddenException('Solo el administrador o gerente puede eliminar colaboradores');
    }
    return { success: await this.usersService.deleteUser(id) };
  }

  @Post(':id/clock-in')
  async clockIn(@Param('id') id: string) {
    return this.usersService.clockIn(id);
  }

  @Post(':id/clock-out')
  async clockOut(
    @Param('id') id: string,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-role') role?: string,
  ) {
    const isAdmin = role === 'ADMINISTRADOR' || role === 'ADMIN' || role === 'GERENTE';
    if (!isAdmin && userId && String(userId) !== String(id)) {
      throw new ForbiddenException('Solo tienes autorización para finalizar tu respectivo turno');
    }
    return this.usersService.clockOut(id);
  }

  @Post(':id/break')
  async setBreak(
    @Param('id') id: string,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-role') role?: string,
  ) {
    const isAdmin = role === 'ADMINISTRADOR' || role === 'ADMIN' || role === 'GERENTE';
    if (!isAdmin && userId && String(userId) !== String(id)) {
      throw new ForbiddenException('Solo tienes autorización para pausar o reanudar tu respectivo turno');
    }
    return this.usersService.setBreak(id);
  }
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  @Post()
  async create(@Body() body: any, @Headers('x-user-role') role?: string) {
    if (role && !['ADMINISTRADOR', 'GERENTE'].includes(role)) {
      throw new ForbiddenException('Solo el administrador o gerente puede crear usuarios');
    }
    return this.usersService.addUser(body);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any, @Headers('x-user-role') role?: string) {
    if (role && !['ADMINISTRADOR', 'GERENTE'].includes(role)) {
      throw new ForbiddenException('Solo el administrador o gerente puede modificar usuarios');
    }
    return this.usersService.updateUser(id, body);
  }

  @Patch(':id')
  async patch(@Param('id') id: string, @Body() body: any, @Headers('x-user-role') role?: string) {
    if (role && !['ADMINISTRADOR', 'GERENTE'].includes(role)) {
      throw new ForbiddenException('Solo el administrador o gerente puede modificar usuarios');
    }
    return this.usersService.updateUser(id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Headers('x-user-role') role?: string) {
    if (role && !['ADMINISTRADOR', 'GERENTE'].includes(role)) {
      throw new ForbiddenException('Solo el administrador o gerente puede eliminar usuarios');
    }
    return { success: await this.usersService.deleteUser(id) };
  }
}

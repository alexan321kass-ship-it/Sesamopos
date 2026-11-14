import { Controller, Get, Post, Patch, Delete, Param, Body, Headers, ForbiddenException } from '@nestjs/common';
import { TablesService } from './tables.service.js';

@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get()
  getAllTables() {
    return this.tablesService.findAll();
  }

  @Post()
  createTable(@Body() body: any, @Headers('x-user-role') role?: string) {
    if (role && !['ADMINISTRADOR', 'GERENTE'].includes(role)) {
      throw new ForbiddenException('Solo el administrador o gerente puede agregar mesas');
    }
    return this.tablesService.create(body);
  }

  @Patch(':id')
  updateTable(
    @Param('id') id: string,
    @Body() body: any,
    @Headers('x-user-role') role?: string,
  ) {
    if (role && !['ADMINISTRADOR', 'GERENTE'].includes(role)) {
      throw new ForbiddenException('Solo el administrador o gerente puede hacer cambios estructurales en las mesas');
    }
    return this.tablesService.update(id, body);
  }

  @Delete(':id')
  deleteTable(@Param('id') id: string, @Headers('x-user-role') role?: string) {
    if (role && !['ADMINISTRADOR', 'GERENTE'].includes(role)) {
      throw new ForbiddenException('Solo el administrador o gerente puede eliminar mesas');
    }
    return this.tablesService.delete(id);
  }

  @Patch(':id/assign')
  assignWaiter(
    @Param('id') id: string,
    @Body('waiterId') waiterId?: string,
    @Body('waiterName') waiterName?: string,
    @Headers('x-user-role') role?: string,
  ) {
    // El mesero no debe autoasignarse mesas: potestad exclusiva de Administrador y Gerente
    if (role && !['ADMINISTRADOR', 'GERENTE'].includes(role)) {
      throw new ForbiddenException('Solo el administrador o gerente puede asignar meseros a las mesas');
    }
    return this.tablesService.assignWaiter(id, waiterId, waiterName);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Headers('x-user-role') role?: string,
  ) {
    // El cambio de estado operativo (DISPONIBLE, OCUPADA, PEDIDO_LISTO, etc.) es parte del servicio diario
    const allowedRoles = ['ADMINISTRADOR', 'GERENTE', 'CAJERO', 'MESERO'];
    if (role && !allowedRoles.includes(role)) {
      throw new ForbiddenException('No tiene permisos para modificar el estado de la mesa');
    }
    return this.tablesService.updateStatus(id, status);
  }
}

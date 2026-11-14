import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Headers, ForbiddenException } from '@nestjs/common';
import { ProductsService } from './products.service.js';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  getAllProducts() {
    return this.productsService.findAllProducts();
  }

  @Post()
  createProduct(@Body() body: any, @Headers('x-user-role') role?: string) {
    if (role === 'MESERO') {
      throw new ForbiddenException('El mesero no tiene permisos para agregar productos');
    }
    return this.productsService.createProduct(body);
  }

  @Put(':id')
  updateProduct(@Param('id') id: string, @Body() body: any, @Headers('x-user-role') role?: string) {
    if (role === 'MESERO') {
      throw new ForbiddenException('El mesero no tiene permisos para editar productos');
    }
    return this.productsService.updateProduct(id, body);
  }

  @Patch(':id')
  patchProduct(@Param('id') id: string, @Body() body: any, @Headers('x-user-role') role?: string) {
    if (role === 'MESERO') {
      throw new ForbiddenException('El mesero no tiene permisos para editar productos');
    }
    return this.productsService.updateProduct(id, body);
  }

  @Delete(':id')
  deleteProduct(@Param('id') id: string, @Headers('x-user-role') role?: string) {
    if (role === 'MESERO') {
      throw new ForbiddenException('El mesero no tiene permisos para eliminar productos');
    }
    return this.productsService.deleteProduct(id);
  }
}

@Controller('categories')
export class CategoriesController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  getAllCategories() {
    return this.productsService.findAllCategories();
  }

  @Post()
  createCategory(@Body() body: any, @Headers('x-user-role') role?: string) {
    if (role === 'MESERO') {
      throw new ForbiddenException('El mesero no tiene permisos para agregar categorías');
    }
    return this.productsService.createCategory(body);
  }

  @Put(':id')
  updateCategory(@Param('id') id: string, @Body() body: any, @Headers('x-user-role') role?: string) {
    if (role === 'MESERO') {
      throw new ForbiddenException('El mesero no tiene permisos para editar categorías');
    }
    return this.productsService.updateCategory(id, body);
  }

  @Patch(':id')
  patchCategory(@Param('id') id: string, @Body() body: any, @Headers('x-user-role') role?: string) {
    if (role === 'MESERO') {
      throw new ForbiddenException('El mesero no tiene permisos para editar categorías');
    }
    return this.productsService.updateCategory(id, body);
  }

  @Delete(':id')
  deleteCategory(@Param('id') id: string, @Headers('x-user-role') role?: string) {
    if (role === 'MESERO') {
      throw new ForbiddenException('El mesero no tiene permisos para eliminar categorías');
    }
    return this.productsService.deleteCategory(id);
  }
}


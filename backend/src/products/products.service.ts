import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class ProductsService {
  constructor(private readonly db: DatabaseService) {}

  async findAllProducts() {
    return this.db.getAll<any>('products');
  }

  async createProduct(data: any) {
    return this.db.addOne('products', data);
  }

  async updateProduct(id: string, data: any) {
    return this.db.updateOne('products', id, (item: any) => ({ ...item, ...data }));
  }

  async deleteProduct(id: string) {
    return this.db.deleteOne('products', id);
  }

  async findAllCategories() {
    return this.db.getAll<any>('categories');
  }

  async createCategory(data: any) {
    return this.db.addOne('categories', data);
  }

  async updateCategory(id: string, data: any) {
    return this.db.updateOne('categories', id, (item: any) => ({ ...item, ...data }));
  }

  async deleteCategory(id: string) {
    return this.db.deleteOne('categories', id);
  }
}


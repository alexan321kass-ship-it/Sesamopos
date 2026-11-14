import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service.js';
import { hashPassword, comparePassword } from '../common/utils/hash.util.js';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async login(email: string, pass: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isMatch = await comparePassword(pass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    // Si la contraseña era texto plano, actualizamos automáticamente a bcrypt en la BD
    if (user.password === pass) {
      const hashed = await hashPassword(pass);
      await this.usersService.updatePassword(user.id, hashed).catch(() => {});
    }

    // Excluimos la contraseña antes de devolver el usuario
    const { password, ...result } = user;

    return {
      user: result,
      access_token: 'mock-jwt-token-12345',
    };
  }
}

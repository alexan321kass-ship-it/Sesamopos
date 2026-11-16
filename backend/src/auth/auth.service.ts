import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service.js';
import { hashPassword, comparePassword } from '../common/utils/hash.util.js';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async login(email: string, pass: string, pin?: string) {
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

    // Validación obligatoria del código privado / PIN para iniciar turno
    const expectedPin = String(user.pin || '1234').trim();
    if (!pin || String(pin).trim() !== expectedPin) {
      throw new UnauthorizedException('Código privado incorrecto. Debes ingresar tu PIN de 4 dígitos para iniciar tu turno y acceder al sistema.');
    }

    // Iniciar turno automáticamente en la base de datos al autenticar con el código privado
    await this.usersService.clockIn(user.id).catch(() => {});

    // Si la contraseña era texto plano, actualizamos automáticamente a bcrypt en la BD
    if (user.password === pass) {
      const hashed = await hashPassword(pass);
      await this.usersService.updatePassword(user.id, hashed).catch(() => {});
    }

    const updatedUser = (await this.usersService.findById(user.id)) || user;

    // Excluimos la contraseña antes de devolver el usuario
    const { password, ...result } = updatedUser;

    return {
      user: result,
      access_token: 'mock-jwt-token-12345',
    };
  }
}

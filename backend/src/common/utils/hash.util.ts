import bcrypt from 'bcryptjs';

const BCRYPT_REGEX = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

export function isPasswordHashed(password: string): boolean {
  if (!password || typeof password !== 'string') return false;
  return BCRYPT_REGEX.test(password);
}

export async function hashPassword(plain: string): Promise<string> {
  if (!plain) return plain;
  if (isPasswordHashed(plain)) return plain;
  return bcrypt.hash(plain, 10);
}

export async function comparePassword(plain: string, hashed: string): Promise<boolean> {
  if (!plain || !hashed) return false;
  if (isPasswordHashed(hashed)) {
    return bcrypt.compare(plain, hashed);
  }
  return plain === hashed;
}

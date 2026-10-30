export function getJwtConfig() {
  const secret = process.env.JWT_SECRET;

  if (!secret) throw new Error('JWT_SECRET não informado nas variáveis de ambiente');

  return { secret, expiresIn: process.env.JWT_EXPIRES_IN || '8h' };
}

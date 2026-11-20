export function getJwtConfig() {
  const secret = process.env.JWT_SECRET;

  if (!secret) throw new Error('JWT_SECRET não informado nas variáveis de ambiente');

  if (process.env.NODE_ENV === 'production' && Buffer.byteLength(secret) < 32) {
    throw new Error('JWT_SECRET deve ter pelo menos 32 bytes em produção');
  }

  return { secret, expiresIn: process.env.JWT_EXPIRES_IN || '8h' };
}

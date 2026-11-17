import { createHmac } from 'node:crypto';
import { getJwtConfig } from '../configs/jwt.config.js';

export function passwordVersion(passwordHash) {
  return createHmac('sha256', getJwtConfig().secret).update(passwordHash).digest('hex');
}

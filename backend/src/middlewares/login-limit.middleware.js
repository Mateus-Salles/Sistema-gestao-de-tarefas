import { rateLimit } from 'express-rate-limit';

// O IP é obtido da conexão. Cabeçalhos de proxy não são confiados por padrão.
export const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { erro: 'Muitas tentativas de login. Tente novamente mais tarde.' },
});

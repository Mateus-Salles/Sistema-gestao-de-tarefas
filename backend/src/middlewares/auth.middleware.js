import jwt from 'jsonwebtoken';
import { passwordVersion } from '../utils/session.js';

import authModel from '../models/auth.model.js';
import userModel from '../models/user.model.js';
import { AppError } from '../utils/AppError.js';
import { getJwtConfig } from '../configs/jwt.config.js';

async function authenticate(req, res, next) {
  try {
    const [type, token, extra] = (req.headers.authorization || '').split(' ');

    if (type !== 'Bearer' || !token || extra !== undefined) {
      throw new AppError('Token ausente', 401);
    }

    let payload;

    try {
      payload = jwt.verify(token, getJwtConfig().secret, { algorithms: ['HS256'] });
    } catch {
      throw new AppError('Token inválido ou expirado', 401);
    }

    if (!payload || typeof payload !== 'object' ||
        (typeof payload.sub !== 'string' || !/^[1-9]\d*$/.test(payload.sub)) || Number(payload.sub) > 2_147_483_647 ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.jti ?? '') ||
        !Number.isInteger(payload.exp) || typeof payload.passwordVersion !== 'string') {
      throw new AppError('Token inválido ou expirado', 401);
    }

    if (await authModel.isRevoked(payload.jti)) {
      throw new AppError('Token revogado', 401);
    }

    const user = await userModel.findByIdWithPassword(Number(payload.sub));
    if (!user || user.status !== 'ativo' || payload.passwordVersion !== passwordVersion(user.senha_hash)) {
      throw new AppError('Não autorizado', 401);
    }

    req.user = {
      id: user.id_usuario,
      accessLevel: user.nivel_acesso,
      jti: payload.jti,
      exp: payload.exp,
    };
    return next();
  } catch (err) {
    return next(err);
  }
}

function onlyAdmin(req, res, next) {
  if (req.user?.accessLevel !== 'administrador') {
    return next(new AppError('Ação permitida apenas para administradores', 403));
  }
  return next();
}

export { authenticate, onlyAdmin };

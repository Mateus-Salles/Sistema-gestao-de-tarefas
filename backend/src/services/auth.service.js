import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';

import authModel from '../models/auth.model';
import userModel from '../models/user.model';
import { AppError } from '../utils/AppError';
import { hashPass, verifyPass } from '../utils/Password';
import { getJwtConfig } from '../configs/jwt.config';

const FAKE_HASH = hashPass('fake-password-to-match-time'); // Para não revelar quais e-mails estão cadastrados

function getUserDTO(u) {
  return {
    id_usuario: u.id_usuario,
    nome: u.nome,
    email: u.email,
    nivel_acesso: u.nivel_acesso,
    status: u.status,
    criado_em: u.criado_em,
  };
}

function genToken(user) {
  const { secret, expiresIn } = getJwtConfig();
  return jwt.sign(
    { sub: String(user.id_usuario), accessLevel: user.nivel_acesso },
    secret,
    { algorithm: 'HS256', expiresIn, jwtid: randomUUID() }
  );
}

async function login(email, password) {
  const user = await userModel.findByEmailWithPassword(email.trim());

  const hash = user ? user.senha_hash : await FAKE_HASH;
  const verifiedPassword = await verifyPass(password, hash);

  if (!user || !verifiedPassword) {
    throw new AppError('E-mail ou senha inválidos', 401);
  }

  if (user.status !== 'ativo') {
    throw new AppError('Usuário inativo. Procure um administrador.', 401);
  }

  return { token: genToken(user), user: getUserDTO(user) };
}

async function changePassword(userId, oldPassword, newPassword) {
  const user = await userModel.findByIdWithPassword(userId);

  if (!user || user.status !== 'ativo') {
    throw new AppError('Não autorizado', 401);
  }

  const verifiedPassword = await verifyPass(oldPassword, user.senha_hash);

  if (!verifiedPassword) {
    throw new AppError('Senha atual incorreta', 401);
  }

  const newHash = await hashPass(newPassword);
  await userModel.updateHashPassword(userId, newHash);
}

async function logout(jti, exp) {
  await authModel.revokeToken(jti, new Date(exp * 1000));
  await authModel.clearExpiredTokens();
}

export default { login, changePassword, logout, getUserDTO };

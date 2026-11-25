import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

import { getJwtConfig } from '../configs/jwt.config.js';
import authModel from '../models/auth.model.js';
import userModel from '../models/user.model.js';
import { AppError } from '../utils/AppError.js';
import { hashPass, verifyPass } from '../utils/Password.js';
import { passwordVersion } from '../utils/session.js';

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
    {
      sub: String(user.id_usuario),
      accessLevel: user.nivel_acesso,
      passwordVersion: passwordVersion(user.senha_hash),
    },
    secret,
    { algorithm: 'HS256', expiresIn, jwtid: randomUUID() },
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

  if (user.perfil_pendente) return { perfil_pendente: true };

  return { token: genToken(user), usuario: getUserDTO(user) };
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

async function completeInitialProfile(dados) {
  await userModel.completeInitialProfile(dados, async (user) => {
    const hash = user ? user.senha_hash : await FAKE_HASH;
    const senhaValida = await verifyPass(dados.senha, hash);

    if (!user || !senhaValida) {
      throw new AppError('Credenciais provisórias inválidas', 401);
    }

    if (dados.nome.toLowerCase() === user.nome.trim().toLowerCase()) {
      throw new AppError('Informe um nome diferente do provisório', 400);
    }

    if (dados.novo_email === user.email.trim().toLowerCase()) {
      throw new AppError('Informe um e-mail diferente do provisório', 400);
    }

    return hashPass(dados.nova_senha);
  });
}

export default { login, changePassword, logout, getUserDTO, completeInitialProfile };

import database from '../database';
import { AppError } from '../utils/AppError';

const COLUMNS = 'id_usuario, nome, email, nivel_acesso, status, criado_em';

async function findById(userId) {
  let client;

  try {
    client = await database.getClient();

    const { rows } = await client.query(`SELECT ${COLUMNS} FROM usuario WHERE id_usuario = $1;`, [userId]);

    return rows[0] || null;
  } catch(err) {
    console.error('[user.model] findById: ', err);

    throw new AppError('Erro ao tentar ler o usuário', 500);
  } finally {
    client?.release();
  }
}

async function findByEmailWithPassword(email) {
  let client;

  try {
    client = await database.getClient();

    const { rows } = await client.query(`SELECT ${COLUMNS}, senha_hash FROM usuario WHERE LOWER(email) = LOWER($1);`, [email]);

    return rows[0] || null;
  } catch(err) {
    console.error('[user.model] findByEmailWithPassword: ', err);

    throw new AppError('Erro ao tentar ler o usuário pelo email', 500);
  } finally {
    client?.release();
  }
}

async function findByIdWithPassword(userId) {
  let client;

  try {
    client = await database.getClient();

    const { rows } = await client.query(`SELECT ${COLUMNS}, senha_hash FROM usuario WHERE id_usuario = $1;`, [userId]);

    return rows[0] || null;
  } catch(err) {
    console.error('[user.model] findByIdWithPassword: ', err);

    throw new AppError('Erro ao tentar ler o usuário pelo ID', 500);
  } finally {
    client?.release();
  }
}

async function updateHashPassword(userId, hashPassword) {
  let client;

  try {
    client = await database.getClient();

    await client.query(`UPDATE usuario SET senha_hash = $1 WHERE id_usuario = $2;`, [hashPassword, userId]);
  } catch(err) {
    console.error('[user.model] updateHashPassword: ', err);

    throw new AppError('Erro ao tentar atualizar a senha', 500);
  } finally {
    client?.release();
  }
}

export default {
  findById,
  findByEmailWithPassword,
  findByIdWithPassword,
  updateHashPassword
};

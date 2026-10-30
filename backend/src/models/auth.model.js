import { AppError } from '../utils/AppError';

import database from "../database";

async function revokeToken(jti, expiresIn) {
  let client;

  try {
    client = await database.getClient();

    await client.query('INSERT INTO token_revogado (jti, expira_em) VALUES ($1, $2) ON CONFLICT (jti) DO NOTHING;', [jti, expiresIn]);
  } catch(err) {
    console.error('[auth.model] revokeToken: ', err);

    throw new AppError('Erro ao revogar o token', 500);
  } finally {
    client?.release();
  }
}

async function isRevoked(jti) {
  let client;

  try {
    client = await database.getClient();

    const { rowCount } = await client.query('SELECT 1 FROM token_revogado WHERE jti = $1;', [jti]);

    return rowCount > 0;
  } catch(err) {
    console.error('[auth.model] isRevoked: ', err);

    throw new AppError('Erro ao verificar o token', 500);
  } finally {
    client?.release();
  }
}

async function clearExpiredTokens() {
  let client;

  try {
    client = await database.getClient();

    await client.query('DELETE FROM token_revogado WHERE expira_em < NOW();');
  } catch(err) {
    console.error('[auth.model] clearExpiredTokens: ', err);

    throw new AppError('Erro ao limpar tokens expirados', 500);
  } finally {
    client?.release();
  }
}

export default { revokeToken, isRevoked, clearExpiredTokens };

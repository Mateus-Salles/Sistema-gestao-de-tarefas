import database from '../database/index.js';
import { AppError } from '../utils/AppError.js';

const COLUMNS = 'id_usuario, nome, email, nivel_acesso, status, criado_em';
const UPDATABLE_FIELDS = ['nome', 'email', 'nivel_acesso'];
const PG_UNIQUE_VIOLATION = '23505';

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

async function findAll({ status, limit, offset }) {
  let client;

  try {
    client = await database.getClient();

    const params = [];
    const filters = [];

    if (status) {
      params.push(status);
      filters.push(`status = $${params.length}`);
    }

    const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    const countResult = await client.query(`SELECT COUNT(*) AS total FROM usuario ${where};`, params);

    const { rows } = await client.query(
      `SELECT ${COLUMNS} FROM usuario ${where} ORDER BY nome, id_usuario LIMIT $${params.length + 1} OFFSET $${params.length + 2};`,
      [...params, limit, offset]
    );

    return { rows, total: Number(countResult.rows[0].total) };
  } catch(err) {
    console.error('[user.model] findAll: ', err);

    throw new AppError('Erro ao tentar listar os usuários', 500);
  } finally {
    client?.release();
  }
}

async function create({ name, email, passwordHash, accessLevel }) {
  let client;

  try {
    client = await database.getClient();

    const { rows } = await client.query(
      `INSERT INTO usuario (nome, email, senha_hash, nivel_acesso) VALUES ($1, $2, $3, $4) RETURNING ${COLUMNS};`,
      [name, email, passwordHash, accessLevel]
    );

    return rows[0];
  } catch(err) {
    if (err.code === PG_UNIQUE_VIOLATION) throw new AppError('E-mail já cadastrado', 409);

    console.error('[user.model] create: ', err);

    throw new AppError('Erro ao tentar cadastrar o usuário', 500);
  } finally {
    client?.release();
  }
}

// `fields` usa os nomes das colunas (nome, email, nivel_acesso); só os permitidos entram no UPDATE.
async function update(userId, fields) {
  const entries = Object.entries(fields).filter(([key]) => UPDATABLE_FIELDS.includes(key));

  if (entries.length === 0) return findById(userId);

  const setClause = entries.map(([key], index) => `${key} = $${index + 1}`).join(', ');
  const values = entries.map(([, value]) => value);

  let client;

  try {
    client = await database.getClient();

    const { rows } = await client.query(
      `UPDATE usuario SET ${setClause} WHERE id_usuario = $${values.length + 1} RETURNING ${COLUMNS};`,
      [...values, userId]
    );

    return rows[0] || null;
  } catch(err) {
    if (err.code === PG_UNIQUE_VIOLATION) throw new AppError('E-mail já cadastrado', 409);

    console.error('[user.model] update: ', err);

    throw new AppError('Erro ao tentar atualizar o usuário', 500);
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

async function updateStatus(userId, status) {
  let client;

  try {
    client = await database.getClient();

    const { rows } = await client.query(
      `UPDATE usuario SET status = $1 WHERE id_usuario = $2 RETURNING ${COLUMNS};`,
      [status, userId]
    );

    return rows[0] || null;
  } catch(err) {
    console.error('[user.model] updateStatus: ', err);

    throw new AppError('Erro ao tentar atualizar o status do usuário', 500);
  } finally {
    client?.release();
  }
}

// Tarefas atribuídas ao usuário OU criadas por ele (RF30/RF31, RN01/RN02).
async function findKanban(userId, { division, kanbanStatus }) {
  let client;

  try {
    client = await database.getClient();

    const { rows } = await client.query(
      `SELECT
          t.id_tarefa,
          t.projeto_id,
          p.nome AS projeto_nome,
          t.responsavel_id,
          t.criador_id,
          t.titulo,
          t.descricao,
          t.divisao,
          t.kanban_status,
          t.vencimento,
          COALESCE(t.vencimento < CURRENT_DATE AND t.kanban_status <> 'concluido', FALSE) AS atrasada,
          t.criado_em,
          t.atualizado_em
        FROM tarefa t
        LEFT JOIN projeto p ON p.id_projeto = t.projeto_id
        WHERE (t.responsavel_id = $1 OR t.criador_id = $1)
          AND ($2::varchar IS NULL OR t.divisao = $2)
          AND ($3::varchar IS NULL OR t.kanban_status = $3)
        ORDER BY t.vencimento NULLS LAST, t.criado_em;`,
      [userId, division ?? null, kanbanStatus ?? null]
    );

    return rows;
  } catch(err) {
    console.error('[user.model] findKanban: ', err);

    throw new AppError('Erro ao tentar ler o Kanban do usuário', 500);
  } finally {
    client?.release();
  }
}

export default {
  findById,
  findByEmailWithPassword,
  findByIdWithPassword,
  updateHashPassword,
  findAll,
  create,
  update,
  updateStatus,
  findKanban
};

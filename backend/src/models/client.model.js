import database from '../database/index.js';
import { AppError } from '../utils/AppError.js';

const COLUMNS = 'id_cliente, nome, contato, status, criado_em';
const UPDATABLE_FIELDS = ['nome', 'contato'];

async function findAll({ status, limit, offset, viewerId = null }) {
  try {
    const params = [];
    let where = '';
    const source = status === 'ativa' ? 'vw_clientes_ativos' : 'cliente';

    if (status && status !== 'ativa') {
      params.push(status);
      where = `WHERE status = $${params.length}`;
    }

    params.push(viewerId);
    const access = `($${params.length}::int IS NULL OR EXISTS (
      SELECT 1 FROM projeto p JOIN tarefa t ON t.projeto_id = p.id_projeto
      WHERE p.cliente_id = cliente.id_cliente AND (t.responsavel_id = $${params.length} OR t.criador_id = $${params.length})))`;
    where += where ? ` AND ${access}` : `WHERE ${access}`;

    const countResult = await database.query(
      `SELECT COUNT(*) AS total FROM ${source} AS cliente ${where};`,
      params,
    );

    const { rows } = await database.query(
      `SELECT ${COLUMNS} FROM ${source} AS cliente ${where}
       ORDER BY nome, id_cliente
       LIMIT $${params.length + 1} OFFSET $${params.length + 2};`,
      [...params, limit, offset],
    );

    return { rows, total: Number(countResult.rows[0].total) };
  } catch (err) {
    console.error('[client.model] findAll: ', err);

    throw new AppError('Erro ao tentar listar os clientes', 500);
  }
}

async function findById(clientId) {
  try {
    const { rows } = await database.query(`SELECT ${COLUMNS} FROM cliente WHERE id_cliente = $1;`, [
      clientId,
    ]);

    return rows[0] || null;
  } catch (err) {
    console.error('[client.model] findById: ', err);

    throw new AppError('Erro ao tentar ler o cliente', 500);
  }
}

// O INSERT dispara trigger de autorização, que precisa saber quem é o usuário logado
async function create(userId, { nome, contato }) {
  try {
    return await database.transactionAsUser(userId, async (client) => {
      const { rows } = await client.query(
        `INSERT INTO cliente (nome, contato) VALUES ($1, $2) RETURNING ${COLUMNS};`,
        [nome, contato],
      );

      return rows[0];
    });
  } catch (err) {
    console.error('[client.model] create: ', err);

    throw new AppError('Erro ao tentar cadastrar o cliente', 500);
  }
}

async function update(clientId, data) {
  try {
    const fields = UPDATABLE_FIELDS.filter((field) => data[field] !== undefined);

    if (fields.length === 0) return findById(clientId);

    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    const values = fields.map((field) => data[field]);

    const { rows } = await database.query(
      `UPDATE cliente SET ${setClause} WHERE id_cliente = $${fields.length + 1} RETURNING ${COLUMNS};`,
      [...values, clientId],
    );

    return rows[0] || null;
  } catch (err) {
    console.error('[client.model] update: ', err);

    throw new AppError('Erro ao tentar atualizar o cliente', 500);
  }
}

async function updateStatus(clientId, status) {
  try {
    const { rows } = await database.query(
      `UPDATE cliente SET status = $1 WHERE id_cliente = $2 RETURNING ${COLUMNS};`,
      [status, clientId],
    );

    return rows[0] || null;
  } catch (err) {
    console.error('[client.model] updateStatus: ', err);

    throw new AppError('Erro ao tentar atualizar o status do cliente', 500);
  }
}

async function hasProjects(clientId, userId) {
  const {
    rows: [result],
  } = await database.query(
    `SELECT EXISTS (SELECT 1 FROM projeto p JOIN tarefa t ON t.projeto_id = p.id_projeto
     WHERE p.cliente_id = $1 AND (t.responsavel_id = $2 OR t.criador_id = $2)) AS allowed`,
    [clientId, userId],
  );
  return result.allowed;
}

export default { hasProjects, findAll, findById, create, update, updateStatus };

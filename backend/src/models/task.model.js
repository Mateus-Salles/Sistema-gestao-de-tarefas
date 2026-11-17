import database from '../database/index.js';
import { hasTasks } from './project.model.js';
import { AppError } from '../utils/AppError.js';

const OVERDUE = "COALESCE(vencimento < CURRENT_DATE AND kanban_status <> 'concluido', FALSE)";
const COLUMNS = `id_tarefa, projeto_id, responsavel_id, criador_id, titulo, descricao, divisao,
                 kanban_status, vencimento, ${OVERDUE} AS atrasada, criado_em, atualizado_em`;
const ORDER = 'ORDER BY vencimento NULLS LAST, id_tarefa';
const UPDATABLE_FIELDS = ['titulo', 'descricao', 'divisao', 'vencimento', 'responsavel_id', 'kanban_status'];

async function findAll(viewerId, query) {
  const { projeto_id, responsavel_id, divisao, kanban_status, pagina, tamanho_pagina } = query;
  const params = [viewerId, projeto_id ?? null, responsavel_id ?? null, divisao ?? null, kanban_status ?? null];
  const from = `FROM tarefa
    WHERE ($1::int IS NULL OR responsavel_id = $1 OR criador_id = $1)
      AND ($2::int IS NULL OR projeto_id = $2)
      AND ($3::int IS NULL OR responsavel_id = $3)
      AND ($4::varchar IS NULL OR divisao = $4)
      AND ($5::varchar IS NULL OR kanban_status = $5)`;

  const { rows: [{ total }] } = await database.query(`SELECT COUNT(*) AS total ${from}`, params);
  const { rows } = await database.query(
    `SELECT ${COLUMNS} ${from} ${ORDER} LIMIT $6 OFFSET $7`,
    [...params, tamanho_pagina, (pagina - 1) * tamanho_pagina],
  );
  return { rows, total };
}

async function findOverdue(viewerId) {
  const { rows } = await database.query(
    `SELECT ${COLUMNS} FROM tarefa
     WHERE ${OVERDUE} AND ($1::int IS NULL OR responsavel_id = $1 OR criador_id = $1)
     ${ORDER}`,
    [viewerId],
  );
  return rows;
}

async function findById(id, connection = database, lock = false) {
  if (lock) {
    // Usa a mesma ordem de bloqueio da conclusão do projeto.
    await connection.query(
      'SELECT id_projeto FROM projeto WHERE id_projeto = (SELECT projeto_id FROM tarefa WHERE id_tarefa = $1) FOR UPDATE',
      [id],
    );
  }
  const { rows: [task] } = await connection.query(
    `SELECT ${COLUMNS} FROM tarefa WHERE id_tarefa = $1${lock ? ' FOR UPDATE' : ''}`,
    [id],
  );
  return task;
}

async function requireAssignee(client, id) {
  const { rows: [user] } = await client.query(
    'SELECT nivel_acesso, status FROM usuario WHERE id_usuario = $1 FOR SHARE',
    [id],
  );
  if (!user) throw new AppError('Usuário não encontrado', 404);
  if (user.nivel_acesso !== 'colaborador') throw new AppError('O responsável deve ser um colaborador', 403);
  if (user.status !== 'ativo') throw new AppError('O responsável está inativo', 409);
}

async function create(userId, fields, collaborator = false) {
  const { projeto_id = null, responsavel_id = null, titulo, descricao = null, divisao, vencimento = null } = fields;

  try {
    return await database.transaction(async (client) => {
      if (projeto_id !== null) {
        await client.query('SELECT id_projeto FROM projeto WHERE id_projeto = $1 FOR UPDATE', [projeto_id]);
      }
      if (collaborator && projeto_id !== null && !await hasTasks(projeto_id, userId, client)) {
        throw new AppError('Você precisa ter tarefas no projeto para criar outra tarefa nele', 403);
      }
      if (responsavel_id !== null) await requireAssignee(client, responsavel_id);
      const { rows: [task] } = await client.query(
        `INSERT INTO tarefa (projeto_id, responsavel_id, criador_id, titulo, descricao, divisao, vencimento)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${COLUMNS}`,
        [projeto_id, responsavel_id, userId, titulo, descricao, divisao, vencimento],
      );
      await reopenProject(client, task);
      return task;
    });
  } catch (err) {
    if (err.code === '23503' && err.constraint === 'fk_tarefa_projeto') {
      throw new AppError('Projeto não encontrado', 404);
    }
    throw err;
  }
}

async function update(client, id, fields) {
  const columns = UPDATABLE_FIELDS.filter((field) => Object.hasOwn(fields, field));
  const assignments = columns.map((field, index) => `${field} = $${index + 2}`);
  const { rows: [task] } = await client.query(
    `UPDATE tarefa SET ${assignments.join(', ')} WHERE id_tarefa = $1 RETURNING ${COLUMNS}`,
    [id, ...columns.map((field) => fields[field])],
  );
  await reopenProject(client, task);
  return task;
}

async function remove(userId, id) {
  return database.transactionAsUser(userId, async (client) => {
    const { rowCount } = await client.query('DELETE FROM tarefa WHERE id_tarefa = $1', [id]);
    return rowCount;
  });
}

async function reopenProject(client, task) {
  if (task?.projeto_id != null && task.kanban_status !== 'concluido') {
    await client.query("UPDATE projeto SET status = 'andamento' WHERE id_projeto = $1 AND status = 'concluido'", [task.projeto_id]);
  }
}

export default { findAll, findOverdue, findById, requireAssignee, create, update, remove };

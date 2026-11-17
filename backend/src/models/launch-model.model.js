import database from '../database/index.js';
import { AppError } from '../utils/AppError.js';

const MODEL_COLUMNS = 'id_modelo_lancamento, nome, status, criado_em';
const TASK_COLUMNS = 'id_tarefa_padrao, modelo_lancamento_id, titulo, divisao';

async function findAll({ status = "ativo" } = {}) {
  const { rows } = await database.query(
    `SELECT ${MODEL_COLUMNS} FROM modelo_lancamento WHERE ($1::varchar IS NULL OR status = $1) ORDER BY id_modelo_lancamento`,
    [status === "todos" ? null : status],
  );
  return rows;
}

async function findById(id) {
  const { rows: [model] } = await database.query(
    `SELECT ${MODEL_COLUMNS} FROM modelo_lancamento WHERE id_modelo_lancamento = $1`,
    [id],
  );
  return model;
}

async function create({ nome }) {
  const { rows: [model] } = await database.query(
    `INSERT INTO modelo_lancamento (nome) VALUES ($1) RETURNING ${MODEL_COLUMNS}`,
    [nome],
  );
  return model;
}

async function update(id, { nome }) {
  const { rows: [model] } = await database.query(
    `UPDATE modelo_lancamento SET nome = $2 WHERE id_modelo_lancamento = $1 RETURNING ${MODEL_COLUMNS}`,
    [id, nome],
  );
  return model;
}

async function remove(id) {
  const { rowCount } = await database.query(
    "UPDATE modelo_lancamento SET status = 'inativo' WHERE id_modelo_lancamento = $1",
    [id],
  );
  return rowCount;
}

async function findTasks(id) {
  const { rows } = await database.query(
    `SELECT ${TASK_COLUMNS} FROM tarefa_padrao WHERE modelo_lancamento_id = $1 ORDER BY id_tarefa_padrao`,
    [id],
  );
  return rows;
}

async function createTask(id, { titulo, divisao }) {
  try {
    const { rows: [task] } = await database.query(
      `INSERT INTO tarefa_padrao (modelo_lancamento_id, titulo, divisao)
       VALUES ($1, $2, $3) RETURNING ${TASK_COLUMNS}`,
      [id, titulo, divisao],
    );
    return task;
  } catch (err) {
    if (err.code === '23503' && err.constraint === 'fk_tarefapadrao_modelo') {
      throw new AppError('Modelo de lançamento não encontrado', 404);
    }
    throw err;
  }
}

async function updateTask(id, tarefaId, { titulo, divisao }) {
  const { rows: [task] } = await database.query(
    `UPDATE tarefa_padrao SET titulo = $3, divisao = $4
     WHERE modelo_lancamento_id = $1 AND id_tarefa_padrao = $2 RETURNING ${TASK_COLUMNS}`,
    [id, tarefaId, titulo, divisao],
  );
  return task;
}

async function removeTask(id, tarefaId) {
  const { rowCount } = await database.query(
    'DELETE FROM tarefa_padrao WHERE modelo_lancamento_id = $1 AND id_tarefa_padrao = $2',
    [id, tarefaId],
  );
  return rowCount;
}

export default { findAll, findById, create, update, remove, findTasks, createTask, updateTask, removeTask };

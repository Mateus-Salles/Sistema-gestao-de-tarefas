import database from '../database/index.js';
import { AppError } from '../utils/AppError.js';

const COLUMNS =
  'id_projeto, cliente_id, modelo_lancamento_id, nome, data_comeco, data_final, status, criado_em';

async function createProject(userId, project) {
  const { cliente_id, modelo_lancamento_id, nome, data_comeco, data_final } = project;

  try {
    return await database.transactionAsUser(userId, async (client) => {
      // Bloqueia a alteração de status do cliente até o fim da criação.
      const {
        rows: [customer],
      } = await client.query('SELECT status FROM cliente WHERE id_cliente = $1 FOR SHARE', [cliente_id]);

      if (!customer) throw new AppError('Cliente não encontrado', 404);
      if (customer.status !== 'ativa') {
        throw new AppError('Não é possível criar um projeto para um cliente inativo', 409);
      }

      const {
        rows: [model],
      } = await client.query(
        'SELECT status FROM modelo_lancamento WHERE id_modelo_lancamento = $1 FOR SHARE',
        [modelo_lancamento_id],
      );
      if (!model) throw new AppError('Modelo de lançamento não encontrado', 404);
      if (model.status !== 'ativo') throw new AppError('Modelo de lançamento inativo', 409);

      const {
        rows: [createdProject],
      } = await client.query(
        `INSERT INTO projeto (cliente_id, modelo_lancamento_id, nome, data_comeco, data_final)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING ${COLUMNS}`,
        [cliente_id, modelo_lancamento_id, nome, data_comeco, data_final],
      );

      return createdProject;
    });
  } catch (err) {
    if (err.code === '23503' && err.constraint === 'fk_projeto_modelo') {
      throw new AppError('Modelo de lançamento não encontrado', 404);
    }

    throw err;
  }
}

async function findAll({ cliente_id, status, pagina, tamanho_pagina }, viewerId = null) {
  const params = [cliente_id ?? null, status ?? null, viewerId];
  const from = `FROM projeto WHERE ($1::int IS NULL OR cliente_id = $1) AND ($2::varchar IS NULL OR status = $2)
    AND ($3::int IS NULL OR EXISTS (SELECT 1 FROM tarefa t WHERE t.projeto_id = projeto.id_projeto
      AND (t.responsavel_id = $3 OR t.criador_id = $3)))`;
  const {
    rows: [{ total }],
  } = await database.query(`SELECT COUNT(*) AS total ${from}`, params);
  const { rows } = await database.query(`SELECT ${COLUMNS} ${from} ORDER BY id_projeto LIMIT $4 OFFSET $5`, [
    ...params,
    tamanho_pagina,
    (pagina - 1) * tamanho_pagina,
  ]);

  return { rows, total };
}

async function findById(id) {
  const {
    rows: [project],
  } = await database.query(`SELECT ${COLUMNS} FROM projeto WHERE id_projeto = $1`, [id]);

  return project;
}

async function update(id, fields) {
  return database.transaction(async (client) => {
    const {
      rows: [project],
    } = await client.query('SELECT data_comeco, data_final FROM projeto WHERE id_projeto = $1 FOR UPDATE', [
      id,
    ]);
    if (!project) return;

    const startDate = fields.data_comeco ?? project.data_comeco;
    const endDate = fields.data_final ?? project.data_final;
    if (endDate < startDate) {
      throw new AppError('A data final deve ser igual ou posterior à data de começo', 400);
    }

    const {
      rows: [updated],
    } = await client.query(
      `UPDATE projeto SET nome = COALESCE($2, nome), data_comeco = $3, data_final = $4
       WHERE id_projeto = $1 RETURNING ${COLUMNS}`,
      [id, fields.nome ?? null, startDate, endDate],
    );

    return updated;
  });
}

async function updateStatus(id, status) {
  try {
    const {
      rows: [project],
    } = await database.query(`UPDATE projeto SET status = $2 WHERE id_projeto = $1 RETURNING ${COLUMNS}`, [
      id,
      status,
    ]);

    return project;
  } catch (err) {
    // A trigger existente usa o código padrão de RAISE EXCEPTION.
    if (err.code === 'P0001' && err.where?.includes('fn_valida_conclusao_projeto')) {
      throw new AppError(err.message, 409);
    }

    throw err;
  }
}

async function findKanban(id, { divisao, responsavel_id, kanban_status }) {
  const { rows } = await database.query(
    `SELECT id_tarefa, projeto_id, responsavel_id, criador_id, titulo, descricao, divisao,
            kanban_status, vencimento, atrasada, criado_em, atualizado_em
     FROM vw_kanban_projeto
     WHERE projeto_id = $1
       AND ($2::varchar IS NULL OR divisao = $2)
       AND ($3::int IS NULL OR responsavel_id = $3)
       AND ($4::varchar IS NULL OR kanban_status = $4)
     ORDER BY vencimento NULLS LAST, criado_em, id_tarefa`,
    [id, divisao ?? null, responsavel_id ?? null, kanban_status ?? null],
  );

  return rows;
}

async function findProgress(id) {
  const {
    rows: [progress],
  } = await database.query(
    `SELECT id_projeto, total_tarefas, tarefas_concluidas, tarefas_pendentes,
            COALESCE(percentual_concluido, 0)::double precision AS percentual_concluido
     FROM vw_progresso_projeto WHERE id_projeto = $1`,
    [id],
  );

  return progress;
}

async function hasTasks(projectId, userId, connection = database) {
  const {
    rows: [result],
  } = await connection.query(
    'SELECT EXISTS (SELECT 1 FROM tarefa WHERE projeto_id = $1 AND (responsavel_id = $2 OR criador_id = $2)) AS allowed',
    [projectId, userId],
  );
  return result.allowed;
}

export default { createProject, findAll, findById, update, updateStatus, findKanban, findProgress, hasTasks };

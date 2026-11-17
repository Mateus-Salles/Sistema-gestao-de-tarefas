import database from '../database/index.js';
import taskModel from '../models/task.model.js';
import { AppError } from '../utils/AppError.js';

function isAdmin(user) {
  return user.accessLevel === 'administrador';
}

function requireTask(task) {
  if (!task) throw new AppError('Tarefa não encontrada', 404);
  return task;
}

function requireVisibility(user, task) {
  if (!isAdmin(user) && user.id !== task.criador_id && user.id !== task.responsavel_id) {
    throw new AppError('Acesso à tarefa proibido', 403);
  }
}

async function list(user, query) {
  const { rows, total } = await taskModel.findAll(isAdmin(user) ? null : user.id, query);
  return {
    dados: rows,
    paginacao: { pagina: query.pagina, tamanho_pagina: query.tamanho_pagina, total },
  };
}

async function listOverdue(user) {
  return taskModel.findOverdue(isAdmin(user) ? null : user.id);
}

async function getById(user, id) {
  const task = requireTask(await taskModel.findById(id));
  requireVisibility(user, task);
  return task;
}

async function create(user, fields) {
  if (!isAdmin(user) && fields.responsavel_id != null && fields.responsavel_id !== user.id) {
    throw new AppError('Atribuir a tarefa a outro usuário exige perfil de administrador', 403);
  }
  return taskModel.create(user.id, fields, !isAdmin(user));
}

async function update(user, id, fields) {
  return database.transaction(async (client) => {
    const task = requireTask(await taskModel.findById(id, client, true));
    requireVisibility(user, task);
    if (!isAdmin(user) && task.responsavel_id !== null && task.responsavel_id !== user.id) {
      throw new AppError('Somente o responsável ou um administrador pode editar uma tarefa atribuída', 403);
    }
    return taskModel.update(client, id, fields);
  });
}

async function assign(id, responsavelId) {
  return database.transaction(async (client) => {
    requireTask(await taskModel.findById(id, client, true));
    await taskModel.requireAssignee(client, responsavelId);
    return taskModel.update(client, id, { responsavel_id: responsavelId });
  });
}

async function move(user, id, status) {
  return database.transactionAsUser(user.id, async (client) => {
    const task = requireTask(await taskModel.findById(id, client, true));
    if (!isAdmin(user) && task.responsavel_id !== user.id) {
      throw new AppError('Somente o responsável ou um administrador pode mover a tarefa', 403);
    }
    return taskModel.update(client, id, { kanban_status: status });
  });
}

async function remove(user, id) {
  if (!await taskModel.remove(user.id, id)) throw new AppError('Tarefa não encontrada', 404);
}

export default { list, listOverdue, getById, create, update, assign, move, remove };

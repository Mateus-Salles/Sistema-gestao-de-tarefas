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
  return taskModel.update(id, fields, (lockedTask) => {
    const task = requireTask(lockedTask);
    requireVisibility(user, task);
    if (!isAdmin(user) && Object.hasOwn(fields, 'responsavel_id')) {
      throw new AppError('Atribuir ou remover o responsável exige perfil de administrador', 403);
    }
    if (!isAdmin(user) && task.responsavel_id !== null && task.responsavel_id !== user.id) {
      throw new AppError('Somente o responsável ou um administrador pode editar uma tarefa atribuída', 403);
    }
  });
}

async function assign(id, responsavelId) {
  return taskModel.assign(id, responsavelId);
}

async function move(user, id, status) {
  return taskModel.move(user.id, id, status, (lockedTask) => {
    const task = requireTask(lockedTask);
    if (!isAdmin(user) && task.responsavel_id !== user.id) {
      throw new AppError('Somente o responsável ou um administrador pode mover a tarefa', 403);
    }
  });
}

async function remove(user, id) {
  if (!(await taskModel.remove(user.id, id))) throw new AppError('Tarefa não encontrada', 404);
}

export default { list, listOverdue, getById, create, update, assign, move, remove };

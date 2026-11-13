import userModel from '../models/user.model.js';
import { AppError } from '../utils/AppError.js';
import { hashPass } from '../utils/Password.js';

const NOT_FOUND_MESSAGE = 'Usuário não encontrado';

async function list(query) {
  const { status, pagina: page, tamanho_pagina: pageSize } = query;

  const { rows, total } = await userModel.findAll({
    status,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return {
    dados: rows,
    paginacao: { pagina: page, tamanho_pagina: pageSize, total },
  };
}

async function getById(userId) {
  const user = await userModel.findById(userId);

  if (!user) throw new AppError(NOT_FOUND_MESSAGE, 404);

  return user;
}

async function create(data) {
  const passwordHash = await hashPass(data.senha);

  return userModel.create({
    name: data.nome,
    email: data.email,
    passwordHash,
    accessLevel: data.nivel_acesso,
  });
}

async function update(currentUser, userId, data) {
  // Evita que o admin se tire do próprio cargo e deixe o sistema sem administrador.
  const isChangingOwnLevel =
    userId === currentUser.id &&
    data.nivel_acesso !== undefined &&
    data.nivel_acesso !== currentUser.accessLevel;

  if (isChangingOwnLevel) {
    throw new AppError('Você não pode alterar o seu próprio nível de acesso', 409);
  }

  const user = await userModel.update(userId, data);

  if (!user) throw new AppError(NOT_FOUND_MESSAGE, 404);

  return user;
}

async function updateStatus(currentUser, userId, status) {
  if (userId === currentUser.id && status === 'inativo') {
    throw new AppError('Você não pode inativar a própria conta', 409);
  }

  const user = await userModel.updateStatus(userId, status);

  if (!user) throw new AppError(NOT_FOUND_MESSAGE, 404);

  return user;
}

function toKanbanFilters(filters) {
  return { division: filters.divisao, kanbanStatus: filters.kanban_status };
}

// Kanban do próprio usuário logado (ele já existe, pois passou pelo authenticate)
async function getKanban(userId, filters) {
  return userModel.findKanban(userId, toKanbanFilters(filters));
}

// Kanban de qualquer usuário, visto pelo administrador
async function getKanbanByUserId(userId, filters) {
  await getById(userId);

  return userModel.findKanban(userId, toKanbanFilters(filters));
}

export default {
  list,
  getById,
  create,
  update,
  updateStatus,
  getKanban,
  getKanbanByUserId,
};

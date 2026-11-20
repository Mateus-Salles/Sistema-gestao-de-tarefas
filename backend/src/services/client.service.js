import clientModel from '../models/client.model.js';
import { AppError } from '../utils/AppError.js';

function visibleClient(client, user) {
  if (!user || user.accessLevel === 'administrador') return client;
  const { contato, ...summary } = client;
  return summary;
}

async function list({ status, page, pageSize }, user) {
  const offset = (page - 1) * pageSize;

  const viewerId = user && user.accessLevel !== "administrador" ? user.id : null;
  const { rows, total } = await clientModel.findAll({ status, limit: pageSize, offset, viewerId });

  return {
    dados: rows.map((client) => visibleClient(client, user)),
    paginacao: { pagina: page, tamanho_pagina: pageSize, total },
  };
}

async function getById(clientId, user) {
  const client = await clientModel.findById(clientId);

  if (!client) throw new AppError('Cliente não encontrado', 404);

  if (user && user.accessLevel !== 'administrador' && !await clientModel.hasProjects(clientId, user.id)) {
    throw new AppError('Acesso ao cliente proibido', 403);
  }
  return visibleClient(client, user);
}

async function create(userId, data) {
  return clientModel.create(userId, data);
}

async function update(clientId, data) {
  const client = await clientModel.update(clientId, data);

  if (!client) throw new AppError('Cliente não encontrado', 404);

  return client;
}

async function updateStatus(clientId, status) {
  const client = await clientModel.updateStatus(clientId, status);

  if (!client) throw new AppError('Cliente não encontrado', 404);

  return client;
}

export default { list, getById, create, update, updateStatus };

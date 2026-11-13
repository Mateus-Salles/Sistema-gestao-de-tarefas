import clientModel from '../models/client.model.js';
import { AppError } from '../utils/AppError.js';

async function list({ status, page, pageSize }) {
  const offset = (page - 1) * pageSize;

  const { rows, total } = await clientModel.findAll({ status, limit: pageSize, offset });

  return {
    dados: rows,
    paginacao: { pagina: page, tamanho_pagina: pageSize, total },
  };
}

async function getById(clientId) {
  const client = await clientModel.findById(clientId);

  if (!client) throw new AppError('Cliente não encontrado', 404);

  return client;
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

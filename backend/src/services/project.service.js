import * as projectModel from '../models/project.model.js';
import { AppError } from '../utils/AppError.js';

function requireProject(project) {
  if (!project) throw new AppError('Projeto não encontrado', 404);

  return project;
}

async function list(query, user) {
  const viewerId = user.accessLevel === "administrador" ? null : user.id;
  const { rows, total } = await projectModel.findAll(query, viewerId);

  return {
    dados: rows,
    paginacao: { pagina: query.pagina, tamanho_pagina: query.tamanho_pagina, total },
  };
}

async function getById(id, user) {
  const project = requireProject(await projectModel.findById(id));
  if (user && user.accessLevel !== "administrador" && !await projectModel.hasTasks(id, user.id)) {
    throw new AppError("Acesso ao projeto proibido", 403);
  }
  return project;
}

async function update(id, fields) {
  return requireProject(await projectModel.update(id, fields));
}

async function updateStatus(id, status) {
  return requireProject(await projectModel.updateStatus(id, status));
}

async function getKanban(id, filters) {
  await getById(id);

  return projectModel.findKanban(id, filters);
}

async function getProgress(id, user) {
  await getById(id, user);
  return requireProject(await projectModel.findProgress(id));
}

export default { list, getById, create: projectModel.createProject, update, updateStatus, getKanban, getProgress };

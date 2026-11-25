import launchModel from '../models/launch-model.model.js';
import { AppError } from '../utils/AppError.js';

const MODEL_NOT_FOUND = 'Modelo de lançamento não encontrado';
const TASK_NOT_FOUND = 'Tarefa padrão não encontrada';

async function getModel(id) {
  const model = await launchModel.findById(id);
  if (!model) throw new AppError(MODEL_NOT_FOUND, 404);
  return model;
}

async function getById(id) {
  const model = await getModel(id);
  return { ...model, tarefas_padrao: await launchModel.findTasks(id) };
}

async function update(id, fields) {
  const model = await launchModel.update(id, fields);
  if (!model) throw new AppError(MODEL_NOT_FOUND, 404);
  return model;
}

async function remove(id) {
  if (!(await launchModel.remove(id))) throw new AppError(MODEL_NOT_FOUND, 404);
}

async function listTasks(id) {
  await getModel(id);
  return launchModel.findTasks(id);
}

async function updateTask(id, tarefaId, fields) {
  const task = await launchModel.updateTask(id, tarefaId, fields);
  if (!task) throw new AppError(TASK_NOT_FOUND, 404);
  return task;
}

async function removeTask(id, tarefaId) {
  if (!(await launchModel.removeTask(id, tarefaId))) throw new AppError(TASK_NOT_FOUND, 404);
}

export default {
  list: launchModel.findAll,
  create: launchModel.create,
  createTask: launchModel.createTask,
  getById,
  update,
  remove,
  listTasks,
  updateTask,
  removeTask,
};

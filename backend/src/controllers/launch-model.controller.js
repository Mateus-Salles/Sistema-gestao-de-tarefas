import launchModelService from '../services/launch-model.service.js';

async function list(req, res) {
  const models = await launchModelService.list(req.validatedQuery);
  res.status(200).json(models);
}

async function create(req, res) {
  const model = await launchModelService.create(req.body);
  res.status(201).json(model);
}

async function getById(req, res) {
  const model = await launchModelService.getById(req.validatedParams.id);
  res.status(200).json(model);
}

async function update(req, res) {
  const model = await launchModelService.update(req.validatedParams.id, req.body);
  res.status(200).json(model);
}

async function remove(req, res) {
  await launchModelService.remove(req.validatedParams.id);
  res.status(204).send();
}

async function listTasks(req, res) {
  const tasks = await launchModelService.listTasks(req.validatedParams.id);
  res.status(200).json(tasks);
}

async function createTask(req, res) {
  const task = await launchModelService.createTask(req.validatedParams.id, req.body);
  res.status(201).json(task);
}

async function updateTask(req, res) {
  const { id, tarefaId } = req.validatedParams;
  const task = await launchModelService.updateTask(id, tarefaId, req.body);
  res.status(200).json(task);
}

async function removeTask(req, res) {
  const { id, tarefaId } = req.validatedParams;
  await launchModelService.removeTask(id, tarefaId);
  res.status(204).send();
}

export default { list, create, getById, update, remove, listTasks, createTask, updateTask, removeTask };

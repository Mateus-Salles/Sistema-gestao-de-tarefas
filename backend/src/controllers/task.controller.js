import taskService from '../services/task.service.js';

async function list(req, res) {
  const result = await taskService.list(req.user, req.validatedQuery);
  res.status(200).json(result);
}

async function listOverdue(req, res) {
  const tasks = await taskService.listOverdue(req.user);
  res.status(200).json(tasks);
}

async function getById(req, res) {
  const task = await taskService.getById(req.user, req.validatedParams.id);
  res.status(200).json(task);
}

async function create(req, res) {
  const task = await taskService.create(req.user, req.body);
  res.status(201).json(task);
}

async function update(req, res) {
  const task = await taskService.update(req.user, req.validatedParams.id, req.body);
  res.status(200).json(task);
}

async function assign(req, res) {
  const task = await taskService.assign(req.validatedParams.id, req.body.responsavel_id);
  res.status(200).json(task);
}

async function move(req, res) {
  const task = await taskService.move(req.user, req.validatedParams.id, req.body.kanban_status);
  res.status(200).json(task);
}

async function remove(req, res) {
  await taskService.remove(req.user, req.validatedParams.id);
  res.status(204).send();
}

export default { list, listOverdue, getById, create, update, assign, move, remove };

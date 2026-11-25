import launchModelService from '../services/launch-model.service.js';

async function list(req, res, next) {
  try {
    const models = await launchModelService.list(req.validatedQuery);

    res.status(200).json(models);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const model = await launchModelService.create(req.body);

    res.status(201).json(model);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const model = await launchModelService.getById(req.validatedParams.id);

    res.status(200).json(model);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const model = await launchModelService.update(req.validatedParams.id, req.body);

    res.status(200).json(model);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await launchModelService.remove(req.validatedParams.id);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function listTasks(req, res, next) {
  try {
    const tasks = await launchModelService.listTasks(req.validatedParams.id);

    res.status(200).json(tasks);
  } catch (err) {
    next(err);
  }
}

async function createTask(req, res, next) {
  try {
    const task = await launchModelService.createTask(req.validatedParams.id, req.body);

    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
}

async function updateTask(req, res, next) {
  try {
    const { id, tarefaId } = req.validatedParams;
    const task = await launchModelService.updateTask(id, tarefaId, req.body);

    res.status(200).json(task);
  } catch (err) {
    next(err);
  }
}

async function removeTask(req, res, next) {
  try {
    const { id, tarefaId } = req.validatedParams;
    await launchModelService.removeTask(id, tarefaId);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export { list, create, getById, update, remove, listTasks, createTask, updateTask, removeTask };

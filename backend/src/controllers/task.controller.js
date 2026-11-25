import taskService from '../services/task.service.js';

async function list(req, res, next) {
  try {
    const result = await taskService.list(req.user, req.validatedQuery);

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function listOverdue(req, res, next) {
  try {
    const tasks = await taskService.listOverdue(req.user);

    res.status(200).json(tasks);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const task = await taskService.getById(req.user, req.validatedParams.id);

    res.status(200).json(task);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const task = await taskService.create(req.user, req.body);

    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const task = await taskService.update(req.user, req.validatedParams.id, req.body);

    res.status(200).json(task);
  } catch (err) {
    next(err);
  }
}

async function assign(req, res, next) {
  try {
    const task = await taskService.assign(req.validatedParams.id, req.body.responsavel_id);

    res.status(200).json(task);
  } catch (err) {
    next(err);
  }
}

async function move(req, res, next) {
  try {
    const task = await taskService.move(req.user, req.validatedParams.id, req.body.kanban_status);

    res.status(200).json(task);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await taskService.remove(req.user, req.validatedParams.id);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export { list, listOverdue, getById, create, update, assign, move, remove };

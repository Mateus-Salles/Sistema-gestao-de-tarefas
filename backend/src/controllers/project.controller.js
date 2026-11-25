import projectService from '../services/project.service.js';

async function list(req, res, next) {
  try {
    const result = await projectService.list(req.validatedQuery, req.user);

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const project = await projectService.getById(req.validatedParams.id, req.user);

    res.status(200).json(project);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const project = await projectService.create(req.user.id, req.body);

    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const project = await projectService.update(req.validatedParams.id, req.body);

    res.status(200).json(project);
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const project = await projectService.updateStatus(req.validatedParams.id, req.body.status);

    res.status(200).json(project);
  } catch (err) {
    next(err);
  }
}

async function getKanban(req, res, next) {
  try {
    const tasks = await projectService.getKanban(req.validatedParams.id, req.validatedQuery);

    res.status(200).json(tasks);
  } catch (err) {
    next(err);
  }
}

async function getProgress(req, res, next) {
  try {
    const progress = await projectService.getProgress(req.validatedParams.id, req.user);

    res.status(200).json(progress);
  } catch (err) {
    next(err);
  }
}

export { list, getById, create, update, updateStatus, getKanban, getProgress };

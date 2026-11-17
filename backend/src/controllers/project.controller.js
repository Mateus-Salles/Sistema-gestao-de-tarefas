import projectService from '../services/project.service.js';

async function list(req, res) {
  const result = await projectService.list(req.validatedQuery, req.user);
  res.status(200).json(result);
}

async function getById(req, res) {
  const project = await projectService.getById(req.validatedParams.id, req.user);
  res.status(200).json(project);
}

async function create(req, res) {
  const project = await projectService.create(req.user.id, req.body);
  res.status(201).json(project);
}

async function update(req, res) {
  const project = await projectService.update(req.validatedParams.id, req.body);
  res.status(200).json(project);
}

async function updateStatus(req, res) {
  const project = await projectService.updateStatus(req.validatedParams.id, req.body.status);
  res.status(200).json(project);
}

async function getKanban(req, res) {
  const tasks = await projectService.getKanban(req.validatedParams.id, req.validatedQuery);
  res.status(200).json(tasks);
}

async function getProgress(req, res) {
  const progress = await projectService.getProgress(req.validatedParams.id, req.user);
  res.status(200).json(progress);
}

export default { list, getById, create, update, updateStatus, getKanban, getProgress };

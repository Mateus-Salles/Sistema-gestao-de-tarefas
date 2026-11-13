import usersService from '../services/user.service.js';

async function listUsers(req, res, next) {
  try {
    const result = await usersService.list(req.validatedQuery);

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const user = await usersService.create(req.body);

    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await usersService.getById(req.user.id);

    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}

async function getMyKanban(req, res, next) {
  try {
    const tasks = await usersService.getKanban(req.user.id, req.validatedQuery);

    res.status(200).json(tasks);
  } catch (err) {
    next(err);
  }
}

async function getUserById(req, res, next) {
  try {
    const user = await usersService.getById(req.validatedParams.id);

    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const user = await usersService.update(req.user, req.validatedParams.id, req.body);

    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}

async function updateUserStatus(req, res, next) {
  try {
    const user = await usersService.updateStatus(req.user, req.validatedParams.id, req.body.status);

    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}

async function getUserKanban(req, res, next) {
  try {
    const tasks = await usersService.getKanbanByUserId(req.validatedParams.id, req.validatedQuery);

    res.status(200).json(tasks);
  } catch (err) {
    next(err);
  }
}

export {
  listUsers,
  createUser,
  getMe,
  getMyKanban,
  getUserById,
  updateUser,
  updateUserStatus,
  getUserKanban,
};

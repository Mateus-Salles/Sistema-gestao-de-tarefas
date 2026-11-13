import authService from '../services/auth.service.js';

async function login(req, res, next) {
  try {
    const { email, senha } = req.body;

    const result = await authService.login(email, senha);

    res.status(200).json(result);
  } catch(err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    await authService.logout(req.user.jti, req.user.exp);

    res.status(204).send();
  } catch(err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { senha_atual, senha_nova } = req.body;

    await authService.changePassword(req.user.id, senha_atual, senha_nova);

    res.status(204).send();
  } catch(err) {
    next(err);
  }
}

export {
  login,
  logout,
  changePassword
};

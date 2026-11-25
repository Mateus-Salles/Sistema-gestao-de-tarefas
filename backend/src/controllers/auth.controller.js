import authService from '../services/auth.service.js';

async function login(req, res, next) {
  try {
    const { email, senha } = req.body;

    const result = await authService.login(email, senha);

    if (result.perfil_pendente) {
      return res.status(403).json({
        codigo: 'PERFIL_PENDENTE',
        erro: 'Altere seu nome, e-mail e senha para continuar.',
      });
    }

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    await authService.logout(req.user.jti, req.user.exp);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { senha_atual, senha_nova } = req.body;

    await authService.changePassword(req.user.id, senha_atual, senha_nova);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function concluirPerfilInicial(req, res, next) {
  try {
    await authService.completeInitialProfile(req.body);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export { login, logout, changePassword, concluirPerfilInicial };

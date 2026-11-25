import { Router } from 'express';
import { login, logout, changePassword, concluirPerfilInicial } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validateSchema } from '../middlewares/validate.middleware.js';
import { loginSchema, changePasswordSchema, perfilInicialSchema } from '../schemas/auth.schema.js';

import { loginLimit } from '../middlewares/login-limit.middleware.js';

const router = Router();

router.post('/login', loginLimit, validateSchema(loginSchema), login);
router.post('/logout', authenticate, logout);
router.post('/perfil-inicial', loginLimit, validateSchema(perfilInicialSchema), concluirPerfilInicial);
router.patch('/senha', authenticate, validateSchema(changePasswordSchema), changePassword);

export default router;

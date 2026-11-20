import { Router } from 'express';

import { listUsers, createUser, getUserById, updateUser, updateUserStatus, getUserKanban, getMyKanban, getMe } from '../controllers/user.controller.js';
import { authenticate, onlyAdmin } from '../middlewares/auth.middleware.js';
import { validateSchema, validateParams, validateQuery } from '../middlewares/validate.middleware.js';
import { idParamSchema, listUsersQuerySchema, kanbanQuerySchema, createUserSchema, updateUserSchema, updateUserStatusSchema } from '../schemas/user.schema.js';

const router = Router();

router.use(authenticate);

// ── Qualquer usuário logado ─────────────────────────────────
router.get('/me', getMe);
router.get('/me/kanban', validateQuery(kanbanQuerySchema), getMyKanban);

// ── Somente administrador ───────────────────────────────────
router.get('/', onlyAdmin, validateQuery(listUsersQuerySchema), listUsers);
router.post('/', onlyAdmin, validateSchema(createUserSchema), createUser);

router.get('/:id', onlyAdmin, validateParams(idParamSchema), getUserById);
router.patch('/:id', onlyAdmin, validateParams(idParamSchema), validateSchema(updateUserSchema), updateUser);
router.patch('/:id/status', onlyAdmin, validateParams(idParamSchema), validateSchema(updateUserStatusSchema), updateUserStatus);
router.get('/:id/kanban', onlyAdmin, validateParams(idParamSchema), validateQuery(kanbanQuerySchema), getUserKanban);

export default router;

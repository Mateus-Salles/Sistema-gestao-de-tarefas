import { Router } from 'express';

import {
  list,
  listOverdue,
  getById,
  create,
  update,
  assign,
  move,
  remove,
} from '../controllers/task.controller.js';
import { authenticate, onlyAdmin } from '../middlewares/auth.middleware.js';
import { validateParams, validateQuery, validateSchema } from '../middlewares/validate.middleware.js';
import { idParamSchema } from '../schemas/user.schema.js';
import {
  assignTaskSchema,
  createTaskSchema,
  listTasksQuerySchema,
  moveTaskSchema,
  updateTaskSchema,
} from '../schemas/task.schema.js';

const router = Router();

router.use(authenticate);

router.get('/', validateQuery(listTasksQuerySchema), list);
router.get('/atrasadas', listOverdue);
router.get('/:id', validateParams(idParamSchema), getById);
router.post('/', validateSchema(createTaskSchema), create);
router.patch('/:id', validateParams(idParamSchema), validateSchema(updateTaskSchema), update);
router.patch(
  '/:id/responsavel',
  onlyAdmin,
  validateParams(idParamSchema),
  validateSchema(assignTaskSchema),
  assign,
);
router.patch('/:id/status', validateParams(idParamSchema), validateSchema(moveTaskSchema), move);
router.delete('/:id', onlyAdmin, validateParams(idParamSchema), remove);

export default router;

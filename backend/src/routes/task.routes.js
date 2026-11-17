import { Router } from 'express';

import taskController from '../controllers/task.controller.js';
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

router.get('/', validateQuery(listTasksQuerySchema), taskController.list);
router.get('/atrasadas', taskController.listOverdue);
router.get('/:id', validateParams(idParamSchema), taskController.getById);
router.post('/', validateSchema(createTaskSchema), taskController.create);
router.patch('/:id', validateParams(idParamSchema), validateSchema(updateTaskSchema), taskController.update);
router.patch('/:id/responsavel', onlyAdmin, validateParams(idParamSchema), validateSchema(assignTaskSchema), taskController.assign);
router.patch('/:id/status', validateParams(idParamSchema), validateSchema(moveTaskSchema), taskController.move);
router.delete('/:id', onlyAdmin, validateParams(idParamSchema), taskController.remove);

export default router;

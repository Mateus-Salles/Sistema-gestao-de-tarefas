import { Router } from 'express';

import {
  list,
  create,
  getById,
  update,
  remove,
  listTasks,
  createTask,
  updateTask,
  removeTask,
} from '../controllers/launch-model.controller.js';
import { authenticate, onlyAdmin } from '../middlewares/auth.middleware.js';
import { validateParams, validateSchema, validateQuery } from '../middlewares/validate.middleware.js';
import {
  listLaunchModelsSchema,
  idParamSchema,
  taskParamsSchema,
  launchModelSchema,
  standardTaskSchema,
} from '../schemas/launch-model.schema.js';

const router = Router();

router.use(authenticate, onlyAdmin);

router.get('/', validateQuery(listLaunchModelsSchema), list);
router.get('/:id', validateParams(idParamSchema), getById);
router.get('/:id/tarefas-padrao', validateParams(idParamSchema), listTasks);

router.post('/', onlyAdmin, validateSchema(launchModelSchema), create);
router.patch('/:id', onlyAdmin, validateParams(idParamSchema), validateSchema(launchModelSchema), update);
router.delete('/:id', onlyAdmin, validateParams(idParamSchema), remove);
router.post(
  '/:id/tarefas-padrao',
  onlyAdmin,
  validateParams(idParamSchema),
  validateSchema(standardTaskSchema),
  createTask,
);
router.patch(
  '/:id/tarefas-padrao/:tarefaId',
  onlyAdmin,
  validateParams(taskParamsSchema),
  validateSchema(standardTaskSchema),
  updateTask,
);
router.delete('/:id/tarefas-padrao/:tarefaId', onlyAdmin, validateParams(taskParamsSchema), removeTask);

export default router;

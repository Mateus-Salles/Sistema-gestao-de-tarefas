import { Router } from 'express';

import controller from '../controllers/launch-model.controller.js';
import { authenticate, onlyAdmin } from '../middlewares/auth.middleware.js';
import { validateParams, validateSchema, validateQuery } from '../middlewares/validate.middleware.js';
import { listLaunchModelsSchema, idParamSchema, taskParamsSchema, launchModelSchema, standardTaskSchema } from '../schemas/launch-model.schema.js';

const router = Router();

router.use(authenticate, onlyAdmin);

router.get('/', validateQuery(listLaunchModelsSchema), controller.list);
router.get('/:id', validateParams(idParamSchema), controller.getById);
router.get('/:id/tarefas-padrao', validateParams(idParamSchema), controller.listTasks);

router.post('/', onlyAdmin, validateSchema(launchModelSchema), controller.create);
router.patch('/:id', onlyAdmin, validateParams(idParamSchema), validateSchema(launchModelSchema), controller.update);
router.delete('/:id', onlyAdmin, validateParams(idParamSchema), controller.remove);
router.post('/:id/tarefas-padrao', onlyAdmin, validateParams(idParamSchema), validateSchema(standardTaskSchema), controller.createTask);
router.patch('/:id/tarefas-padrao/:tarefaId', onlyAdmin, validateParams(taskParamsSchema), validateSchema(standardTaskSchema), controller.updateTask);
router.delete('/:id/tarefas-padrao/:tarefaId', onlyAdmin, validateParams(taskParamsSchema), controller.removeTask);

export default router;

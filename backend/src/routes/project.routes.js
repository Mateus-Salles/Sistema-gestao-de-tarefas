import { Router } from 'express';

import projectController from '../controllers/project.controller.js';
import { authenticate, onlyAdmin } from '../middlewares/auth.middleware.js';
import { validateParams, validateQuery, validateSchema } from '../middlewares/validate.middleware.js';
import {
  createProjectSchema,
  listProjectsQuerySchema,
  projectIdSchema,
  projectKanbanQuerySchema,
  updateProjectSchema,
  updateProjectStatusSchema,
} from '../schemas/project.schema.js';

const router = Router();

router.use(authenticate);

router.get('/', validateQuery(listProjectsQuerySchema), projectController.list);
router.get('/:id', validateParams(projectIdSchema), projectController.getById);
router.get('/:id/progresso', validateParams(projectIdSchema), projectController.getProgress);

router.post('/', onlyAdmin, validateSchema(createProjectSchema), projectController.create);
router.patch('/:id', onlyAdmin, validateParams(projectIdSchema), validateSchema(updateProjectSchema), projectController.update);
router.patch('/:id/status', onlyAdmin, validateParams(projectIdSchema), validateSchema(updateProjectStatusSchema), projectController.updateStatus);
router.get('/:id/kanban', onlyAdmin, validateParams(projectIdSchema), validateQuery(projectKanbanQuerySchema), projectController.getKanban);

export default router;

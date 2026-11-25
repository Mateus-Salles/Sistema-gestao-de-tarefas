import { Router } from 'express';

import {
  list,
  getById,
  create,
  update,
  updateStatus,
  getKanban,
  getProgress,
} from '../controllers/project.controller.js';
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

router.get('/', validateQuery(listProjectsQuerySchema), list);
router.get('/:id', validateParams(projectIdSchema), getById);
router.get('/:id/progresso', validateParams(projectIdSchema), getProgress);

router.post('/', onlyAdmin, validateSchema(createProjectSchema), create);
router.patch('/:id', onlyAdmin, validateParams(projectIdSchema), validateSchema(updateProjectSchema), update);
router.patch(
  '/:id/status',
  onlyAdmin,
  validateParams(projectIdSchema),
  validateSchema(updateProjectStatusSchema),
  updateStatus,
);
router.get(
  '/:id/kanban',
  onlyAdmin,
  validateParams(projectIdSchema),
  validateQuery(projectKanbanQuerySchema),
  getKanban,
);

export default router;

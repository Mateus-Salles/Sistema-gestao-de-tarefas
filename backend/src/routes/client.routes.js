import { Router } from 'express';

import { list, getById, create, update, updateStatus } from '../controllers/client.controller.js';
import { authenticate, onlyAdmin } from '../middlewares/auth.middleware.js';
import { validateSchema, validateParams, validateQuery } from '../middlewares/validate.middleware.js';
import { idParamSchema } from '../schemas/common.schema.js';
import {
  listClientsQuerySchema,
  createClientSchema,
  updateClientSchema,
  updateClientStatusSchema,
} from '../schemas/client.schema.js';

const router = Router();

router.use(authenticate);

// RF09 — qualquer usuário autenticado pode listar/consultar
router.get('/', validateQuery(listClientsQuerySchema), list);
router.get('/:id', validateParams(idParamSchema), getById);

// RF06/RN04, RF07, RF08 — somente administrador
router.post('/', onlyAdmin, validateSchema(createClientSchema), create);
router.patch('/:id', onlyAdmin, validateParams(idParamSchema), validateSchema(updateClientSchema), update);
router.patch(
  '/:id/status',
  onlyAdmin,
  validateParams(idParamSchema),
  validateSchema(updateClientStatusSchema),
  updateStatus,
);

export default router;

import { z } from 'zod';

import { paginationQuerySchema } from './common.schema.js';
import { kanbanQuerySchema } from './user.schema.js';

const projectReference = z.number().int().positive().max(2_147_483_647);

export const createProjectSchema = z.object({
  cliente_id: projectReference,
  modelo_lancamento_id: projectReference,
  nome: z.string().trim().min(1).max(150),
  data_comeco: z.iso.date(),
  data_final: z.iso.date(),
}).refine(({ data_comeco, data_final }) => data_final >= data_comeco, {
  path: ['data_final'],
  message: 'A data final deve ser igual ou posterior à data de começo',
});

const referenceQuery = z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(projectReference);
const projectStatus = z.enum(['andamento', 'concluido', 'cancelado']);

export const projectIdSchema = z.object({ id: referenceQuery });

export const listProjectsQuerySchema = paginationQuerySchema.extend({
  cliente_id: referenceQuery.optional(),
  status: projectStatus.optional(),
});

export const updateProjectSchema = z.object({
  nome: z.string().trim().min(1).max(150).optional(),
  data_comeco: z.iso.date().optional(),
  data_final: z.iso.date().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Informe pelo menos um campo para atualizar',
});

export const updateProjectStatusSchema = z.object({ status: projectStatus });

export const projectKanbanQuerySchema = kanbanQuerySchema.extend({
  responsavel_id: referenceQuery.optional(),
});

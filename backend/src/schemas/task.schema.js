import { z } from 'zod';

import { paginationQuerySchema } from './common.schema.js';
import { idParamSchema, kanbanQuerySchema } from './user.schema.js';

const referenceId = z.number().int().positive().max(2_147_483_647);
const editableFields = z.object({
  titulo: z.string().trim().min(1).max(200),
  descricao: z.string().nullable().optional(),
  divisao: kanbanQuerySchema.shape.divisao.unwrap(),
  vencimento: z.iso.date().nullable().optional(),
});

const listTasksQuerySchema = paginationQuerySchema.merge(kanbanQuerySchema).extend({
  projeto_id: idParamSchema.shape.id.optional(),
  responsavel_id: idParamSchema.shape.id.optional(),
});

const createTaskSchema = editableFields.extend({
  projeto_id: referenceId.nullable().optional(),
  responsavel_id: referenceId.nullable().optional(),
});

const updateTaskSchema = editableFields
  .partial()
  .extend({ responsavel_id: referenceId.nullable().optional() })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe pelo menos um campo para atualizar',
  });

const assignTaskSchema = z.object({ responsavel_id: referenceId });
const moveTaskSchema = z.object({ kanban_status: kanbanQuerySchema.shape.kanban_status.unwrap() });

export { listTasksQuerySchema, createTaskSchema, updateTaskSchema, assignTaskSchema, moveTaskSchema };

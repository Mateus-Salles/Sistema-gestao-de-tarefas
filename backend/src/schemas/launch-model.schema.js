import { z } from 'zod';

import { idParamSchema } from './user.schema.js';

const requiredText = z.string().trim().min(1).max(150);

const listLaunchModelsSchema = z.object({ status: z.enum(['ativo', 'inativo', 'todos']).default('ativo') });
const taskParamsSchema = idParamSchema.extend({ tarefaId: idParamSchema.shape.id });
const launchModelSchema = z.object({ nome: requiredText });
const standardTaskSchema = z.object({
  titulo: requiredText,
  divisao: z.enum(['produto', 'conteudo', 'trafego', 'disparos']),
});

export { listLaunchModelsSchema, taskParamsSchema, launchModelSchema, standardTaskSchema, idParamSchema };

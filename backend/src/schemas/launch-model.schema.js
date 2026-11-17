import { z } from 'zod';

import { idParamSchema } from './user.schema.js';

const requiredText = z.string().trim().min(1).max(150);

export const listLaunchModelsSchema = z.object({ status: z.enum(['ativo', 'inativo', 'todos']).default('ativo') });
export { idParamSchema };
export const taskParamsSchema = idParamSchema.extend({ tarefaId: idParamSchema.shape.id });
export const launchModelSchema = z.object({ nome: requiredText });
export const standardTaskSchema = z.object({
  titulo: requiredText,
  divisao: z.enum(['produto', 'conteudo', 'trafego', 'disparos']),
});

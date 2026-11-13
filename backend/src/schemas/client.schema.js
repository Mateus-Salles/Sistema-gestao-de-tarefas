import { z } from 'zod';

import { paginationQuerySchema } from './common.schema.js';

const NAME_MAX = 150;
const CONTACT_MAX = 150;

const clientStatusSchema = z.enum(['ativa', 'inativa'], { error: 'status deve ser "ativa" ou "inativa"' });

const nameField = z.string().trim().min(1, 'Nome é obrigatório').max(NAME_MAX, `Nome deve ter no máximo ${NAME_MAX} caracteres`);
const contactField = z.string().trim().min(1, 'Contato é obrigatório').max(CONTACT_MAX, `Contato deve ter no máximo ${CONTACT_MAX} caracteres`);

const listClientsQuerySchema = paginationQuerySchema.extend({
  status: clientStatusSchema.optional(),
});

const createClientSchema = z.object({
  nome: nameField,
  contato: contactField,
});

const updateClientSchema = z
  .object({
    nome: nameField.optional(),
    contato: contactField.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualizar (nome ou contato)',
  });

const updateClientStatusSchema = z.object({
  status: clientStatusSchema,
});

export { listClientsQuerySchema, createClientSchema, updateClientSchema, updateClientStatusSchema };

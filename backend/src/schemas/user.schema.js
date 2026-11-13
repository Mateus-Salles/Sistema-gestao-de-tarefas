import { z } from 'zod';

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const NAME_MAX = 150;
const EMAIL_MAX = 150;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;
const PG_INT_MAX = 2_147_483_647;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const ACCESS_LEVELS = ['administrador', 'colaborador'];
const USER_STATUSES = ['ativo', 'inativo'];
const DIVISIONS = ['produto', 'conteudo', 'trafego', 'disparos'];
const KANBAN_STATUSES = ['a_fazer', 'em_andamento', 'em_revisao', 'concluido'];

const optionsMessage = (field, values) => ({
  error: `${field} deve ser um destes valores: ${values.join(', ')}`,
});

const positiveInt = (field) =>
  z
    .string()
    .regex(/^[1-9]\d*$/, `${field} deve ser um inteiro positivo`)
    .transform(Number)
    .refine((value) => value <= PG_INT_MAX, `${field} fora do intervalo permitido`);

const idParamSchema = z.object({
  id: positiveInt('id'),
});

const listUsersQuerySchema = z.object({
  status: z.enum(USER_STATUSES, optionsMessage('status', USER_STATUSES)).optional(),
  pagina: positiveInt('pagina').default(1),
  tamanho_pagina: positiveInt('tamanho_pagina')
    .refine((value) => value <= MAX_PAGE_SIZE, `tamanho_pagina deve ser no máximo ${MAX_PAGE_SIZE}`)
    .default(DEFAULT_PAGE_SIZE),
});

const kanbanQuerySchema = z.object({
  divisao: z.enum(DIVISIONS, optionsMessage('divisao', DIVISIONS)).optional(),
  kanban_status: z.enum(KANBAN_STATUSES, optionsMessage('kanban_status', KANBAN_STATUSES)).optional(),
});

const createUserSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório').max(NAME_MAX, 'Nome muito longo'),
  email: z
    .string()
    .trim()
    .max(EMAIL_MAX, 'E-mail muito longo')
    .regex(EMAIL_RE, 'E-mail inválido')
    .toLowerCase(),
  senha: z
    .string()
    .min(PASSWORD_MIN, `A senha deve ter no mínimo ${PASSWORD_MIN} caracteres`)
    .max(PASSWORD_MAX, `A senha deve ter no máximo ${PASSWORD_MAX} caracteres`),
  nivel_acesso: z.enum(ACCESS_LEVELS, optionsMessage('nivel_acesso', ACCESS_LEVELS)),
});

const updateUserSchema = createUserSchema
  .pick({ nome: true, email: true, nivel_acesso: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Informe pelo menos um campo para atualizar');

const updateUserStatusSchema = z.object({
  status: z.enum(USER_STATUSES, optionsMessage('status', USER_STATUSES)),
});

export {
  idParamSchema,
  listUsersQuerySchema,
  kanbanQuerySchema,
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
};

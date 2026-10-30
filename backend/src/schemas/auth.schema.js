import { z } from "zod";

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const SENHA_MIN = 8;
const SENHA_MAX = 128;

const loginSchema = z.object({
  email: z.string().trim().regex(EMAIL_RE, 'E-mail inválido'),
  senha: z.string().min(1, 'Senha é obrigatória').max(SENHA_MAX, 'Senha muito longa')
});

const changePasswordSchema = z.object({
  senha_atual: z.string().min(1, 'Senha atual é obrigatória').max(SENHA_MAX, 'Senha atual muito longa'),
  senha_nova: z.string().min(SENHA_MIN, `A nova senha deve ter no mínimo ${SENHA_MIN} caracteres`).max(SENHA_MAX, `A nova senha deve no máximo ${SENHA_MAX} caracteres`)
}).refine((data) => data.senha_nova !== data.senha_atual, {
  message: 'A nova senha deve ser diferente da atual',
  path: ['senha_nova']
});

export { loginSchema, changePasswordSchema };

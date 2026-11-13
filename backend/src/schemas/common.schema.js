import { z } from 'zod';

const MAX_PAGE_SIZE = 100;

const idParamSchema = z.object({
  id: z.coerce.number({ error: 'ID inválido' }).int('ID inválido').positive('ID inválido'),
});

const paginationQuerySchema = z.object({
  pagina: z.coerce.number({ error: 'pagina inválida' }).int().min(1, 'pagina deve ser no mínimo 1').default(1),
  tamanho_pagina: z.coerce
    .number({ error: 'tamanho_pagina inválido' })
    .int()
    .min(1, 'tamanho_pagina deve ser no mínimo 1')
    .max(MAX_PAGE_SIZE, `tamanho_pagina deve ser no máximo ${MAX_PAGE_SIZE}`)
    .default(20),
});

export { idParamSchema, paginationQuerySchema };

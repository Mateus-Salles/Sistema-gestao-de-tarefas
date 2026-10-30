import { AppError } from "../utils/AppError";

export function validateSchema(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});

    if (!result.success) {
      const message = result.error.issues.map((issue) => {
        const field = issue.path.join('.') || 'body';

        if (issue.code === 'invalid_type') return `${field}: Campo obrigatório e deve ser texto`;

        return issue.message;
      }).join('; ');

      return next(new AppError(`Dados inválidos: ${message}`, 400));
    }

    req.body = result.data;

    return next();
  }
}

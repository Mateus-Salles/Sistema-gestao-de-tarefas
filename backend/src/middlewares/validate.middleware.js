import { AppError } from '../utils/AppError.js';

function formatIssues(error) {
  return error.issues
    .map((issue) => {
      const field = issue.path.join('.') || 'body';

      if (issue.code === 'invalid_type') return `${field}: Campo obrigatório ou com tipo inválido`;

      return `${field}: ${issue.message}`;
    })
    .join('; ');
}

function parseOrThrow(schema, data) {
  const result = schema.safeParse(data ?? {});

  if (!result.success) {
    throw new AppError(`Dados inválidos: ${formatIssues(result.error)}`, 400);
  }

  return result.data;
}

export function validateSchema(schema) {
  return (req, res, next) => {
    try {
      req.body = parseOrThrow(schema, req.body);

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

// No Express 5, req.query é somente leitura, então o resultado validado vai para req.validatedQuery.
export function validateQuery(schema) {
  return (req, res, next) => {
    try {
      req.validatedQuery = parseOrThrow(schema, req.query);

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

export function validateParams(schema) {
  return (req, res, next) => {
    try {
      req.validatedParams = parseOrThrow(schema, req.params);

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

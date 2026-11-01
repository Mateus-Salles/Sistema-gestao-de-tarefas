import express from 'express';

import routes from './routes'
import { AppError } from './utils/AppError';

const API_PREFIX = '/v1';

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use(API_PREFIX, routes);

app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ erro: 'Corpo da requisição muito grande' });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode || 500).json({ erro: err.message });
  }

  console.error('[app] erro não tratado:', err);
  return res.status(500).json({ erro: 'Erro interno do servidor' });
});

export { app };

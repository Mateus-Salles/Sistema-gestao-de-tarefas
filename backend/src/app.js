import express from 'express';
import helmet from 'helmet';

import routes from './routes/index.js';
import { AppError } from './utils/AppError.js';

const API_PREFIX = '/v1';
const DEFAULT_CORS_ORIGINS = 'http://localhost:5173,http://127.0.0.1:5173';
const corsOrigins = new Set(
  (process.env.CORS_ORIGINS ?? DEFAULT_CORS_ORIGINS).split(',').map((origin) => origin.trim()),
);

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use((req, res, next) => {
  res.vary('Origin');

  const origin = req.get('Origin');
  if (!origin || !corsOrigins.has(origin)) return next();

  res.set('Access-Control-Allow-Origin', origin);

  if (req.method === 'OPTIONS' && req.get('Access-Control-Request-Method')) {
    res.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, PATCH, DELETE');
    res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    return res.sendStatus(204);
  }

  next();
});
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
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

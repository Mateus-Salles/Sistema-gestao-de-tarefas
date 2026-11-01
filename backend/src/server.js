import { app } from './app';
import database from './database';
import { getJwtConfig } from './configs/jwt.config';

const PORT = Number(process.env.APP_PORT) || 3000;

async function verifyDatabase() {
  const client = await database.getClient();

  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}

async function start() {
  try {
    getJwtConfig();
    
    await verifyDatabase();
  } catch (err) {
    console.error('[server] falha ao iniciar:', err.message);
    process.exit(1);
  }

  const server = app.listen(PORT, () => { console.log(`[server] rodando na porta ${PORT}`) });

  const stop = (sinal) => {
    console.log(`[server] ${sinal} recebido, encerrando...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => stop('SIGTERM'));
  process.on('SIGINT', () => stop('SIGINT'));
}

start();

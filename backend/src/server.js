import { app } from './app.js';
import database from './database/index.js';
import { getJwtConfig } from './configs/jwt.config.js';

const PORT = Number(process.env.APP_PORT) || 3000;

async function start() {
  try {
    getJwtConfig();

    await database.connect();
  } catch (err) {
    console.error('[server] falha ao iniciar:', err.message);
    process.exit(1);
  }

  const server = app.listen(PORT, () => { console.log(`[server] rodando na porta ${PORT}`) });

  const stop = (sinal) => {
    console.log(`[server] ${sinal} recebido, encerrando...`);
    server.close(async () => {
      await database.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => stop('SIGTERM'));
  process.on('SIGINT', () => stop('SIGINT'));
}

start();

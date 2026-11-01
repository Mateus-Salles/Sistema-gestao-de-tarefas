const forNum = (val, def) => {
  const numericENV = Number(val);
  const returneValue = Number.isFinite(numericENV) && val !== undefined && val !== '' ? numericENV : def;

  return returneValue;
};

function loadDatabaseConfig(env = process.env) {
  const config = {
    connectionString:         env.DATABASE_URL || undefined,
    host:                     env.DB_HOST || 'localhost',
    port:                     forNum(env.DB_PORT, 5432),
    user:                     env.DB_USER,
    password:                 env.DB_PASSWORD,
    database:                 env.DB_NAME,

    max:                      forNum(env.DB_POOL_MAX, 10),
    idleTimeoutMillis:        forNum(env.DB_IDLE_TIMEOUT, 30000),
    connectionTimeoutMillis:  forNum(env.DB_CONNECTION_TIMEOUT, 5000),

    ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  }

  if (!config.connectionString) {
    const missing = ['user', 'password', 'database'].filter((key) => !config[key]);

    if (missing.length > 0) {
      const names = { user: 'DB_USER', password: 'DB_PASSWORD', database: 'DB_NAME' };

      throw new Error(`[Config] Variáveis de ambiente do banco ausentes: ${missing.map((m) => names[m]).join(', ')}\n\n(ou defina DATABASE_URL).`);
    }
  }

  return config;
}

export { loadDatabaseConfig };

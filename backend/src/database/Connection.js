import { Pool, types } from "pg";

const OID_BIGINT = 20;
const OID_DATE = 1082;

export const customType = {
  getTypeParser(oid, format) {
    if (oid === OID_DATE) return (valor) => valor;
    if (oid === OID_BIGINT) return (valor) => parseInt(valor, 10);

    return types.getTypeParser(oid, format);
  },
};

export class Database {
  constructor(config, PoolClass = Pool) {
    this.config = config;
    this.PoolClass = PoolClass;
    this.pool = null;
  }

  async connect() {
    if (this.pool) return this.pool;

    this.pool = new this.PoolClass({ ...this.config, types: customType });

    this.pool.on('error', (err) => {
      console.error('[Database] Erro inesperado em conexão ociosa: ', err.message);
    });

    try {
      await this.pool.query('SELECT 1');

      console.log('[Database] Conectado ao PostgreSQL com sucesso.');
    } catch(err) {
      await this.pool.end().catch(() => {});

      this.pool = null;
      throw new Error(`[Database] Falha ao conectar ao PostgreSQL: ${err.message}`);
    }

    return this.pool;
  }

  async query(text, params = []) {
    this.#ensurePool();

    return this.pool.query(text, params);
  }

  async getClient() {
    this.#ensurePool();

    return this.pool.connect();
  }

  async transaction(callback) {
    return this.#executeTransaction(callback);
  }

  async transactionAsUser(userId, callback) {
    const id = typeof userId === 'string' ? Number(userId) : userId;

    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('[Database] userId inválido para transactionAsUser');
    }

    return this.#executeTransaction(callback, id);
  }

  async healthCheck() {
    try {
      await this.query('SELECT 1');

      return true;
    } catch {
      return false;
    }
  }

  async close() {
    if (!this.pool) return;

    await this.pool.end();
    this.pool = null;

    console.log('[Database] Conexão encerrada.');
  }

  async #executeTransaction(callback, userId = null) {
    const client = await this.getClient();

    try {
      await client.query('BEGIN');

      if (userId !== null) {
        await client.query('SELECT set_config(\'app.current_user_id\', $1, true)', [String(userId),]);
      }

      const result = await callback(client);

      await client.query('COMMIT');

      return result;
    } catch(err) {
      await client.query('ROLLBACK');

      throw err;
    } finally {
      client.release();
    }
  }

  #ensurePool() {
    if (!this.pool) throw new Error('[Database] Pool não inicializado. Chame Database.connect() primeiro.');
  }
}

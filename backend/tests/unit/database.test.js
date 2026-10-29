import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadDatabaseConfig } from '../../src/configs/database.config.js';

const ENV_MINIMO = {
  DB_USER: 'app',
  DB_PASSWORD: 'segredo',
  DB_NAME: 'forge',
};

describe('loadDatabaseConfig', () => {
  describe('valores padrão', () => {
    it('aplica os padrões quando só as variáveis obrigatórias são informadas', () => {
      const config = loadDatabaseConfig(ENV_MINIMO);

      assert.deepEqual(config, {
        connectionString: undefined,
        host: 'localhost',
        port: 5432,
        user: 'app',
        password: 'segredo',
        database: 'forge',
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        ssl: false,
      });
    });

    it('lê process.env quando nenhum objeto é passado', () => {
      const chaves = ['DATABASE_URL', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_HOST'];
      const backup = Object.fromEntries(chaves.map((c) => [c, process.env[c]]));

      try {
        delete process.env.DATABASE_URL;
        process.env.DB_USER = 'do_processo';
        process.env.DB_PASSWORD = 'senha_processo';
        process.env.DB_NAME = 'banco_processo';
        process.env.DB_HOST = 'host-do-processo';

        const config = loadDatabaseConfig();

        assert.equal(config.user, 'do_processo');
        assert.equal(config.password, 'senha_processo');
        assert.equal(config.database, 'banco_processo');
        assert.equal(config.host, 'host-do-processo');
      } finally {
        for (const [chave, valor] of Object.entries(backup)) {
          if (valor === undefined) delete process.env[chave];
          else process.env[chave] = valor;
        }
      }
    });
  });

  describe('valores customizados', () => {
    it('usa host, porta e parâmetros de pool informados, convertendo texto em número', () => {
      const config = loadDatabaseConfig({
        ...ENV_MINIMO,
        DB_HOST: 'postgres',
        DB_PORT: '5433',
        DB_POOL_MAX: '20',
        DB_IDLE_TIMEOUT: '1000',
        DB_CONNECTION_TIMEOUT: '2000',
      });

      assert.equal(config.host, 'postgres');
      assert.equal(config.port, 5433);
      assert.equal(config.max, 20);
      assert.equal(config.idleTimeoutMillis, 1000);
      assert.equal(config.connectionTimeoutMillis, 2000);
    });

    it('usa o padrão quando um valor numérico é inválido (texto)', () => {
      const config = loadDatabaseConfig({
        ...ENV_MINIMO,
        DB_PORT: 'abc',
        DB_POOL_MAX: 'muitos',
      });

      assert.equal(config.port, 5432);
      assert.equal(config.max, 10);
    });

    it('usa o padrão quando um valor numérico é texto vazio (e não 0)', () => {
      const config = loadDatabaseConfig({ ...ENV_MINIMO, DB_PORT: '' });

      assert.equal(config.port, 5432);
    });
  });

  describe('DATABASE_URL', () => {
    const URL = 'postgresql://app:segredo@postgres:5432/forge';

    it('aceita somente a DATABASE_URL, sem exigir as variáveis individuais', () => {
      const config = loadDatabaseConfig({ DATABASE_URL: URL });

      assert.equal(config.connectionString, URL);
      assert.equal(config.user, undefined);
      assert.equal(config.password, undefined);
      assert.equal(config.database, undefined);
    });

    it('trata DATABASE_URL vazia como ausente e passa a exigir as variáveis individuais', () => {
      const config = loadDatabaseConfig({ ...ENV_MINIMO, DATABASE_URL: '' });
      assert.equal(config.connectionString, undefined);

      assert.throws(() => loadDatabaseConfig({ DATABASE_URL: '' }), /DB_USER/);
    });
  });

  describe('validação das variáveis obrigatórias', () => {
    it('lança erro listando todas as variáveis ausentes', () => {
      assert.throws(
        () => loadDatabaseConfig({}),
        (erro) => {
          assert.match(erro.message, /\[Config\]/);
          assert.match(erro.message, /DB_USER/);
          assert.match(erro.message, /DB_PASSWORD/);
          assert.match(erro.message, /DB_NAME/);
          assert.match(erro.message, /DATABASE_URL/);
          return true;
        }
      );
    });

    it('lista apenas as variáveis que realmente faltam', () => {
      assert.throws(
        () => loadDatabaseConfig({ DB_USER: 'app', DB_NAME: 'forge' }),
        (erro) => {
          assert.match(erro.message, /DB_PASSWORD/);
          assert.doesNotMatch(erro.message, /DB_USER/);
          assert.doesNotMatch(erro.message, /DB_NAME/);
          return true;
        }
      );
    });

    it('considera texto vazio como variável ausente', () => {
      assert.throws(
        () => loadDatabaseConfig({ ...ENV_MINIMO, DB_PASSWORD: '' }),
        /DB_PASSWORD/
      );
    });
  });

  describe('SSL', () => {
    it('habilita SSL somente quando DB_SSL é exatamente "true"', () => {
      const config = loadDatabaseConfig({ ...ENV_MINIMO, DB_SSL: 'true' });

      assert.deepEqual(config.ssl, { rejectUnauthorized: false });
    });

    it('mantém SSL desabilitado para "false", ausente ou qualquer outro valor', () => {
      assert.equal(loadDatabaseConfig({ ...ENV_MINIMO, DB_SSL: 'false' }).ssl, false);
      assert.equal(loadDatabaseConfig({ ...ENV_MINIMO }).ssl, false);
      assert.equal(loadDatabaseConfig({ ...ENV_MINIMO, DB_SSL: '1' }).ssl, false);
    });
  });
});

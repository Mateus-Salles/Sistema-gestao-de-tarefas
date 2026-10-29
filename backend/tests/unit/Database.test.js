import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { inspect } from 'node:util';
import pg from 'pg';
import { Database, customType } from '../../src/database/Connection.js';
import { criarPoolFake } from '../../helpers/poolFake.js';

const CONFIG = {
  host: 'localhost',
  port: 5432,
  user: 'app',
  password: 'segredo',
  database: 'forge',
};

const SQL_SET_CONFIG = "SELECT set_config('app.current_user_id', $1, true)";

/** Cria um Database já conectado a um Pool falso. */
async function criarConectado(opcoes) {
  const fake = criarPoolFake(opcoes);
  const db = new Database(CONFIG, fake.PoolFake);
  await db.connect();
  return { db, ...fake };
}

/** Cria um Database que ainda NÃO conectou. */
function criarSemConexao() {
  const fake = criarPoolFake();
  return { db: new Database(CONFIG, fake.PoolFake), ...fake };
}

/** Faz o client registrar, em ordem, tudo que for executado nele. */
function registrarOrdem(client) {
  const ordem = [];
  client.query.mock.mockImplementation(async (sql, params) => {
    ordem.push({ sql, params });
    return { rows: [], rowCount: 0 };
  });
  return ordem;
}

describe('Database', () => {
  beforeEach(() => {
    // Silencia os logs durante os testes
    mock.method(console, 'log', () => {});
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe('connect', () => {
    it('cria o pool com a configuração recebida e testa a conexão com SELECT 1', async () => {
      const { db, pool, estado } = await criarConectado();

      const { types, ...configSemTypes } = estado.configRecebida;
      assert.equal(estado.criacoes, 1);
      assert.deepEqual(configSemTypes, CONFIG);
      assert.equal(pool.query.mock.callCount(), 1);
      assert.equal(pool.query.mock.calls[0].arguments[0], 'SELECT 1');
      assert.equal(db.pool, pool);
    });

    it('aplica os parsers personalizados ao pool pela opção "types"', async () => {
      const { estado } = await criarConectado();

      assert.equal(estado.configRecebida.types, customType);
    });

    it('não cria outro pool se já estiver conectado', async () => {
      const { db, estado } = await criarConectado();

      await db.connect();

      assert.equal(estado.criacoes, 1);
    });

    it('registra um ouvinte de "error" que apenas loga o erro, sem lançar exceção', async () => {
      const { pool } = await criarConectado();
      const consoleError = mock.method(console, 'error', () => {});

      assert.equal(pool.on.mock.calls[0].arguments[0], 'error');
      const ouvinte = pool.on.mock.calls[0].arguments[1];

      assert.doesNotThrow(() => ouvinte(new Error('conexão caiu')));
      assert.match(consoleError.mock.calls[0].arguments.join(' '), /conexão caiu/);
    });

    it('lança erro, encerra o pool e zera db.pool quando o teste de conexão falha', async () => {
      const fake = criarPoolFake({
        queryImpl: async () => {
          throw new Error('ECONNREFUSED');
        },
      });
      const db = new Database(CONFIG, fake.PoolFake);

      await assert.rejects(() => db.connect(), /Falha ao conectar ao PostgreSQL: ECONNREFUSED/);

      assert.equal(fake.pool.end.mock.callCount(), 1);
      assert.equal(db.pool, null);
    });

    it('ignora erro ao encerrar o pool durante a limpeza e lança o erro original', async () => {
      const fake = criarPoolFake({
        queryImpl: async () => {
          throw new Error('ECONNREFUSED');
        },
      });
      fake.pool.end.mock.mockImplementation(async () => {
        throw new Error('falha ao encerrar');
      });
      const db = new Database(CONFIG, fake.PoolFake);

      await assert.rejects(() => db.connect(), (erro) => {
        assert.match(erro.message, /ECONNREFUSED/);
        assert.doesNotMatch(erro.message, /falha ao encerrar/);
        return true;
      });
    });

    it('permite tentar conectar de novo depois de uma falha', async () => {
      let chamadas = 0;
      const fake = criarPoolFake({
        queryImpl: async () => {
          chamadas += 1;
          if (chamadas === 1) throw new Error('banco indisponível');
          return { rows: [], rowCount: 0 };
        },
      });
      const db = new Database(CONFIG, fake.PoolFake);

      await assert.rejects(() => db.connect(), /banco indisponível/);
      await db.connect();

      assert.equal(fake.estado.criacoes, 2);
      assert.equal(db.pool, fake.pool);
    });
  });

  describe('query', () => {
    it('lança erro se o pool não foi inicializado', async () => {
      const { db } = criarSemConexao();

      await assert.rejects(() => db.query('SELECT 1'), /Pool não inicializado/);
    });

    it('repassa o SQL e os parâmetros ao pool e devolve o resultado', async () => {
      const linhas = [{ id_cliente: 1, nome: 'Acme' }];
      const { db, pool } = await criarConectado();
      pool.query.mock.mockImplementation(async () => ({ rows: linhas, rowCount: 1 }));

      const resultado = await db.query('SELECT * FROM cliente WHERE status = $1', ['ativa']);

      assert.deepEqual(resultado.rows, linhas);
      const ultima = pool.query.mock.calls.at(-1).arguments;
      assert.equal(ultima[0], 'SELECT * FROM cliente WHERE status = $1');
      assert.deepEqual(ultima[1], ['ativa']);
    });
  });

  describe('getClient', () => {
    it('lança erro se o pool não foi inicializado', async () => {
      const { db } = criarSemConexao();

      await assert.rejects(() => db.getClient(), /Pool não inicializado/);
    });
  });

  describe('transaction', () => {
    it('executa BEGIN, o callback e COMMIT, nessa ordem', async () => {
      const { db, client } = await criarConectado();
      const ordem = registrarOrdem(client);

      await db.transaction(async () => {
        ordem.push({ sql: 'callback' });
      });

      assert.deepEqual(
        ordem.map((o) => o.sql),
        ['BEGIN', 'callback', 'COMMIT']
      );
    });

    it('passa o client ao callback, devolve o resultado e devolve o client ao pool', async () => {
      const { db, client } = await criarConectado();
      let recebido;

      const resultado = await db.transaction(async (c) => {
        recebido = c;
        return { id_projeto: 10 };
      });

      assert.equal(recebido, client);
      assert.deepEqual(resultado, { id_projeto: 10 });
      assert.equal(client.release.mock.callCount(), 1);
    });

    it('faz ROLLBACK, relança o erro, não faz COMMIT e devolve o client quando o callback falha', async () => {
      const { db, client } = await criarConectado();
      const ordem = registrarOrdem(client);
      const erroOriginal = new Error('violação de trigger');

      await assert.rejects(
        () =>
          db.transaction(async () => {
            throw erroOriginal;
          }),
        (erro) => erro === erroOriginal
      );

      assert.deepEqual(
        ordem.map((o) => o.sql),
        ['BEGIN', 'ROLLBACK']
      );
      assert.equal(client.release.mock.callCount(), 1);
    });
  });

  describe('transactionAsUser', () => {
    it('executa BEGIN, set_config local com o id (texto), o callback e COMMIT, nessa ordem', async () => {
      const { db, client } = await criarConectado();
      const ordem = registrarOrdem(client);

      await db.transactionAsUser(7, async () => {
        ordem.push({ sql: 'callback' });
      });

      assert.deepEqual(
        ordem.map((o) => o.sql),
        ['BEGIN', SQL_SET_CONFIG, 'callback', 'COMMIT']
      );
      assert.deepEqual(ordem[1].params, ['7']);
    });

    it('aceita o id como texto numérico (ex.: vindo do JWT)', async () => {
      const { db, client } = await criarConectado();
      const ordem = registrarOrdem(client);

      await db.transactionAsUser('42', async () => {});

      assert.deepEqual(ordem[1].params, ['42']);
    });

    it('faz ROLLBACK sem executar o callback quando o set_config falha', async () => {
      const { db, client } = await criarConectado();
      const ordem = [];
      client.query.mock.mockImplementation(async (sql) => {
        ordem.push(sql);
        if (String(sql).includes('set_config')) throw new Error('falha no set_config');
        return { rows: [] };
      });
      const callback = mock.fn(async () => {});

      await assert.rejects(() => db.transactionAsUser(7, callback), /falha no set_config/);

      assert.equal(callback.mock.callCount(), 0);
      assert.deepEqual(ordem, ['BEGIN', SQL_SET_CONFIG, 'ROLLBACK']);
      assert.equal(client.release.mock.callCount(), 1);
    });

    describe('validação do usuarioId', () => {
      const invalidos = [0, -1, 1.5, 'abc', null, undefined, true];

      for (const invalido of invalidos) {
        it(`rejeita ${inspect(invalido)} sem abrir transação nem executar o callback`, async () => {
          const { db, pool } = await criarConectado();
          const callback = mock.fn(async () => {});

          await assert.rejects(
            () => db.transactionAsUser(invalido, callback),
            'usuarioId inválido'
          );

          assert.equal(pool.connect.mock.callCount(), 0);
          assert.equal(callback.mock.callCount(), 0);
        });
      }
    });
  });

  describe('healthCheck', () => {
    it('devolve true quando o banco responde', async () => {
      const { db } = await criarConectado();

      assert.equal(await db.healthCheck(), true);
    });

    it('devolve false (sem lançar erro) quando a consulta falha', async () => {
      const { db, pool } = await criarConectado();
      pool.query.mock.mockImplementation(async () => {
        throw new Error('timeout');
      });

      assert.equal(await db.healthCheck(), false);
    });
  });

  describe('close', () => {
    it('encerra o pool e zera db.pool', async () => {
      const { db, pool } = await criarConectado();

      await db.close();

      assert.equal(pool.end.mock.callCount(), 1);
      assert.equal(db.pool, null);
    });

    it('não faz nada (nem lança erro) se não houver pool', async () => {
      const { db, pool } = criarSemConexao();

      await assert.doesNotReject(() => db.close());

      assert.equal(pool.end.mock.callCount(), 0);
    });
  });

  describe('customType', () => {
    it('mantém DATE como texto "YYYY-MM-DD" e converte BIGINT (COUNT) em número', () => {
      assert.equal(customType.getTypeParser(1082)('2026-10-28'), '2026-10-28');
      assert.strictEqual(customType.getTypeParser(20)('42'), 42);
    });

    it('delega ao comportamento padrão do pg para os demais tipos', () => {
      const TEXT = 25;
      const INT4 = 23;

      assert.equal(customType.getTypeParser(TEXT), pg.types.getTypeParser(TEXT));
      assert.equal(customType.getTypeParser(INT4), pg.types.getTypeParser(INT4));
    });

    it('não altera os parsers globais do módulo pg', () => {
      // padrão do pg: BIGINT continua texto e DATE continua virando objeto Date
      assert.strictEqual(pg.types.getTypeParser(20)('42'), '42');
      assert.ok(pg.types.getTypeParser(1082)('2026-10-28') instanceof Date);
    });
  });
});

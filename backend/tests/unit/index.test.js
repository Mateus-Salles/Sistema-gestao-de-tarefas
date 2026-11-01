import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

const CHAVES = ['DATABASE_URL', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];

describe('src/database/index.js (singleton)', () => {
  const backup = {};

  before(() => {
    for (const chave of CHAVES) backup[chave] = process.env[chave];

    delete process.env.DATABASE_URL;
    process.env.DB_HOST = 'host-de-teste';
    process.env.DB_USER = 'usuario_teste';
    process.env.DB_PASSWORD = 'senha_teste';
    process.env.DB_NAME = 'banco_teste';
  });

  after(() => {
    for (const chave of CHAVES) {
      if (backup[chave] === undefined) delete process.env[chave];
      else process.env[chave] = backup[chave];
    }
  });

  it('exporta uma instância de Database criada com a configuração do ambiente', async () => {
    const { default: database, Database } = await import('../../src/database/index.js');

    assert.ok(database instanceof Database);
    assert.equal(database.config.host, 'host-de-teste');
    assert.equal(database.config.user, 'usuario_teste');
    assert.equal(database.config.database, 'banco_teste');
  });

  it('não conecta ao banco apenas por ser importado', async () => {
    const { default: database } = await import('../../src/database/index.js');

    assert.equal(database.pool, null);
  });
});

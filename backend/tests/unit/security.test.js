import { it } from 'node:test';
import assert from 'node:assert/strict';
import { loadDatabaseConfig } from '../../src/configs/database.config.js';
import { getJwtConfig } from '../../src/configs/jwt.config.js';
import { verifyPass } from '../../src/utils/Password.js';

it('valida certificado TLS e aceita uma CA própria sem desativar a verificação', () => {
  const config = loadDatabaseConfig({
    DATABASE_URL: 'postgres://user:password@localhost/database',
    DB_SSL: 'true',
    DB_SSL_CA: 'certificado PEM',
  });
  assert.deepEqual(config.ssl, { rejectUnauthorized: true, ca: 'certificado PEM' });
  assert.throws(() =>
    loadDatabaseConfig({
      DATABASE_URL: 'postgres://user:password@localhost/database?sslmode=no-verify',
    }),
  );
  assert.throws(() =>
    loadDatabaseConfig({
      DATABASE_URL: 'postgres://user:password@localhost/database?sslmode=disable',
      DB_SSL: 'true',
    }),
  );
});

it('rejeita chave curta para assinar tokens em produção', () => {
  const oldEnv = process.env.NODE_ENV;
  const oldSecret = process.env.JWT_SECRET;
  try {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'curto';
    assert.throws(getJwtConfig, /32 bytes/);
    process.env.JWT_SECRET = 'a'.repeat(64);
    assert.equal(getJwtConfig().secret.length, 64);
  } finally {
    if (oldEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = oldEnv;
    if (oldSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = oldSecret;
  }
});

it('rejeita hash malformado sem usar seu tamanho como parâmetro do scrypt', async () => {
  assert.equal(await verifyPass('senha', 'a'.repeat(32) + ':' + 'a'.repeat(100000)), false);
  assert.equal(await verifyPass('senha', 'salt:hash'), false);
});

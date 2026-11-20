import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { iniciarAmbiente, esperar } from '../../helpers/e2e.js';

describe('E2E · Infraestrutura da aplicação', () => {
  let env;

  before(async () => {
    env = await iniciarAmbiente();
  });

  after(async () => {
    await env.encerrar();
  });

  it('GET /health · 200 {status: "ok"} (fora do prefixo /v1)', async () => {
    const body = esperar(await env.request('GET', '/health', { foraDoPrefixo: true }), 200);

    assert.deepEqual(body, { status: 'ok' });
  });

  it('não expõe o cabeçalho x-powered-by', async () => {
    const res = await env.request('GET', '/health', { foraDoPrefixo: true });

    assert.equal(res.headers.get('x-powered-by'), null);
  });

  it('rota inexistente · 404 {erro: "Rota não encontrada"}', async () => {
    const body = esperar(await env.api.get('/rota-que-nao-existe'), 404);

    assert.deepEqual(body, { erro: 'Rota não encontrada' });
  });

  it('JSON malformado · 400 {erro: "JSON inválido"}', async () => {
    const res = await env.request('POST', '/auth/login', { body: '{ email: quebrado' });

    assert.equal(esperar(res, 400).erro, 'JSON inválido');
  });

  it('corpo acima de 100kb · 413', async () => {
    const grande = JSON.stringify({ email: 'a@b.co', senha: 'x'.repeat(200_000) });
    const res = await env.request('POST', '/auth/login', { body: grande });

    assert.equal(esperar(res, 413).erro, 'Corpo da requisição muito grande');
  });
});

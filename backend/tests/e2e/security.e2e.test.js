import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { iniciarAmbiente, esperar, SENHA_PADRAO } from '../../helpers/e2e.js';
import { loginLimit } from '../../src/middlewares/login-limit.middleware.js';

describe('Segurança', () => {
  let env;
  let ctx;
  before(async () => {
    env = await iniciarAmbiente();
  });
  after(async () => {
    await env?.encerrar();
  });
  beforeEach(async () => {
    ctx = await env.preparar();
  });

  it('trocar a senha invalida tokens antigos e permite um novo login', async () => {
    esperar(
      await env.api.patch(
        '/auth/senha',
        {
          senha_atual: SENHA_PADRAO,
          senha_nova: 'NovaSenha#2026',
        },
        ctx.token.colabA,
      ),
      204,
    );
    esperar(await env.api.get('/usuarios/me', ctx.token.colabA), 401);
    const session = esperar(
      await env.api.post('/auth/login', {
        email: ctx.colabA.email,
        senha: 'NovaSenha#2026',
      }),
      200,
    );
    esperar(await env.api.get('/usuarios/me', session.token), 200);
  });

  it('rejeita token assinado sem expiração ou identificador de revogação', async () => {
    const token = jwt.sign({ sub: String(ctx.admin.id_usuario) }, process.env.JWT_SECRET);
    esperar(await env.api.get('/usuarios/me', token), 401);
  });

  it('impede cache de respostas privadas e envia cabeçalhos de proteção', async () => {
    const response = await env.api.get('/usuarios/me', ctx.token.admin);
    esperar(response, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  });

  it('limita tentativas de login mesmo com cabeçalho de proxy forjado', async (t) => {
    await loginLimit.resetKey('127.0.0.1');
    t.after(async () => {
      await loginLimit.resetKey('127.0.0.1');
    });
    for (let index = 0; index < 30; index++) {
      esperar(
        await env.request('POST', '/auth/login', {
          body: {},
          headers: { 'x-forwarded-for': '198.51.100.' + (index + 1) },
        }),
        400,
      );
    }
    const blocked = await env.api.post('/auth/login', { email: ctx.admin.email, senha: SENHA_PADRAO });
    esperar(blocked, 429);
    assert.ok(blocked.headers.get('retry-after'));
  });
});

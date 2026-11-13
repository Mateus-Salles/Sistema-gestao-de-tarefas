import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';

import {
  iniciarAmbiente,
  esperar,
  criarUsuario,
  consultar,
  gerarToken,
  SENHA_PADRAO,
} from '../../helpers/e2e.js';

const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

describe('E2E · Autenticação', () => {
  let env;
  let ctx;

  before(async () => {
    env = await iniciarAmbiente();
  });

  after(async () => {
    await env.encerrar();
  });

  beforeEach(async () => {
    ctx = await env.preparar();
  });

  /* ---------------------------------------------------------------- */
  describe('POST /auth/login (RF01)', () => {
    it('200 · devolve token JWT e os dados do usuário, sem expor senha/hash', async () => {
      const body = esperar(
        await env.api.post('/auth/login', { email: 'admin@forge.test', senha: SENHA_PADRAO }),
        200
      );

      assert.equal(typeof body.token, 'string');

      const payload = jwt.verify(body.token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      assert.equal(payload.sub, String(ctx.admin.id_usuario));
      assert.ok(payload.jti, 'o token precisa de jti para poder ser revogado');
      assert.ok(payload.exp > payload.iat);

      // O contrato (OpenAPI) define a chave como "usuario"
      assert.equal(body.usuario.id_usuario, ctx.admin.id_usuario);
      assert.equal(body.usuario.nome, 'Ana Admin');
      assert.equal(body.usuario.email, 'admin@forge.test');
      assert.equal(body.usuario.nivel_acesso, 'administrador');
      assert.equal(body.usuario.status, 'ativo');
      assert.ok(body.usuario.criado_em);
      assert.equal('senha' in body.usuario, false);
      assert.equal('senha_hash' in body.usuario, false);
    });

    it('200 · ignora caixa e espaços ao redor do e-mail', async () => {
      const res = await env.api.post('/auth/login', { email: '  ADMIN@Forge.TEST ', senha: SENHA_PADRAO });

      esperar(res, 200);
    });

    it('200 · o token devolvido autentica as demais rotas', async () => {
      const { token } = esperar(
        await env.api.post('/auth/login', { email: 'caio@forge.test', senha: SENHA_PADRAO }),
        200
      );

      const me = esperar(await env.api.get('/usuarios/me', token), 200);
      assert.equal(me.id_usuario, ctx.colabA.id_usuario);
    });

    it('401 · senha incorreta', async () => {
      const res = await env.api.post('/auth/login', { email: 'admin@forge.test', senha: 'errada-errada' });

      assert.equal(esperar(res, 401).erro, 'E-mail ou senha inválidos');
    });

    it('401 · e-mail não cadastrado (mesma mensagem, para não revelar quais e-mails existem)', async () => {
      const res = await env.api.post('/auth/login', { email: 'ninguem@forge.test', senha: SENHA_PADRAO });

      assert.equal(esperar(res, 401).erro, 'E-mail ou senha inválidos');
    });

    it('401 · usuário inativo não consegue entrar', async () => {
      await criarUsuario({ email: 'inativo@forge.test', status: 'inativo' });

      const res = await env.api.post('/auth/login', { email: 'inativo@forge.test', senha: SENHA_PADRAO });

      assert.equal(esperar(res, 401).erro, 'Usuário inativo. Procure um administrador.');
    });

    it('400 · e-mail em formato inválido', async () => {
      esperar(await env.api.post('/auth/login', { email: 'isso-nao-e-email', senha: SENHA_PADRAO }), 400);
    });

    it('400 · campos obrigatórios ausentes', async () => {
      esperar(await env.api.post('/auth/login', {}), 400);
      esperar(await env.api.post('/auth/login', { email: 'admin@forge.test' }), 400);
      esperar(await env.api.post('/auth/login', { senha: SENHA_PADRAO }), 400);
    });

    it('400 · senha vazia', async () => {
      esperar(await env.api.post('/auth/login', { email: 'admin@forge.test', senha: '' }), 400);
    });
  });

  /* ---------------------------------------------------------------- */
  describe('POST /auth/logout', () => {
    it('204 · revoga o token: ele deixa de funcionar e o jti fica registrado', async () => {
      const jti = randomUUID();
      const token = gerarToken(ctx.colabA, { jti });

      esperar(await env.api.get('/usuarios/me', token), 200);

      const res = await env.api.post('/auth/logout', undefined, token);
      assert.equal(res.status, 204);
      assert.equal(res.texto, '');

      const revogados = await consultar('SELECT jti FROM token_revogado');
      assert.deepEqual(revogados.map((r) => r.jti), [jti]);

      const depois = await env.api.get('/usuarios/me', token);
      assert.equal(esperar(depois, 401).erro, 'Token revogado');
    });

    it('204 · logout não derruba outras sessões do mesmo usuário', async () => {
      const tokenA = gerarToken(ctx.colabA);
      const tokenB = gerarToken(ctx.colabA);

      await env.api.post('/auth/logout', undefined, tokenA);

      esperar(await env.api.get('/usuarios/me', tokenB), 200);
    });

    it('204 · limpa da lista de revogados os tokens que já expiraram', async () => {
      await consultar(`INSERT INTO token_revogado (jti, expira_em) VALUES ($1, NOW() - INTERVAL '1 day')`, [
        randomUUID(),
      ]);

      await env.api.post('/auth/logout', undefined, ctx.token.colabA);

      const expirados = await consultar(`SELECT 1 FROM token_revogado WHERE expira_em < NOW()`);
      assert.equal(expirados.length, 0);
    });

    it('401 · sem token', async () => {
      esperar(await env.api.post('/auth/logout'), 401);
    });
  });

  /* ---------------------------------------------------------------- */
  describe('PATCH /auth/senha (RF04)', () => {
    const NOVA = 'NovaSenha#456';

    it('204 · troca a senha: a antiga para de funcionar e a nova passa a valer', async () => {
      const res = await env.api.patch(
        '/auth/senha',
        { senha_atual: SENHA_PADRAO, senha_nova: NOVA },
        ctx.token.colabA
      );
      assert.equal(res.status, 204);

      const antiga = await env.api.post('/auth/login', { email: 'caio@forge.test', senha: SENHA_PADRAO });
      esperar(antiga, 401);

      const nova = await env.api.post('/auth/login', { email: 'caio@forge.test', senha: NOVA });
      esperar(nova, 200);
    });

    it('204 · guarda a senha apenas como hash', async () => {
      await env.api.patch('/auth/senha', { senha_atual: SENHA_PADRAO, senha_nova: NOVA }, ctx.token.colabA);

      const [{ senha_hash }] = await consultar('SELECT senha_hash FROM usuario WHERE id_usuario = $1', [
        ctx.colabA.id_usuario,
      ]);

      assert.notEqual(senha_hash, NOVA);
      assert.ok(!senha_hash.includes(NOVA));
    });

    it('401 · senha atual incorreta (e a senha não muda)', async () => {
      const res = await env.api.patch(
        '/auth/senha',
        { senha_atual: 'nao-e-essa-aqui', senha_nova: NOVA },
        ctx.token.colabA
      );

      assert.equal(esperar(res, 401).erro, 'Senha atual incorreta');
      esperar(await env.api.post('/auth/login', { email: 'caio@forge.test', senha: SENHA_PADRAO }), 200);
    });

    it('400 · nova senha igual à atual', async () => {
      const res = await env.api.patch(
        '/auth/senha',
        { senha_atual: SENHA_PADRAO, senha_nova: SENHA_PADRAO },
        ctx.token.colabA
      );

      esperar(res, 400);
    });

    it('400 · nova senha com menos de 8 caracteres', async () => {
      const res = await env.api.patch(
        '/auth/senha',
        { senha_atual: SENHA_PADRAO, senha_nova: 'curta' },
        ctx.token.colabA
      );

      esperar(res, 400);
    });

    it('400 · campos obrigatórios ausentes', async () => {
      esperar(await env.api.patch('/auth/senha', {}, ctx.token.colabA), 400);
      esperar(await env.api.patch('/auth/senha', { senha_nova: NOVA }, ctx.token.colabA), 400);
    });

    it('401 · sem token', async () => {
      esperar(await env.api.patch('/auth/senha', { senha_atual: SENHA_PADRAO, senha_nova: NOVA }), 401);
    });
  });

  /* ---------------------------------------------------------------- */
  describe('Validação do token Bearer (transversal a todas as rotas protegidas)', () => {
    const rota = '/usuarios/me';

    it('401 · cabeçalho Authorization ausente', async () => {
      assert.equal(esperar(await env.api.get(rota), 401).erro, 'Token ausente');
    });

    it('401 · esquema diferente de Bearer', async () => {
      const res = await env.request('GET', rota, { headers: { authorization: 'Basic abc123' } });

      esperar(res, 401);
    });

    it('401 · "Bearer" sem o token', async () => {
      const res = await env.request('GET', rota, { headers: { authorization: 'Bearer' } });

      esperar(res, 401);
    });

    it('401 · token malformado', async () => {
      esperar(await env.api.get(rota, 'isso.nao.e-jwt'), 401);
    });

    it('401 · token expirado', async () => {
      const expirado = gerarToken(ctx.admin, { expiresIn: -60 });

      assert.equal(esperar(await env.api.get(rota, expirado), 401).erro, 'Token inválido ou expirado');
    });

    it('401 · token assinado com outro segredo', async () => {
      const falso = gerarToken(ctx.admin, { secret: 'segredo-do-atacante' });

      esperar(await env.api.get(rota, falso), 401);
    });

    it('401 · token com algoritmo "none"', async () => {
      const semAssinatura = `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({
        sub: String(ctx.admin.id_usuario),
        jti: randomUUID(),
        exp: Math.floor(Date.now() / 1000) + 3600,
      })}.`;

      esperar(await env.api.get(rota, semAssinatura), 401);
    });

    it('401 · token de usuário que não existe mais', async () => {
      const fantasma = gerarToken({ id_usuario: 999999, nivel_acesso: 'administrador' });

      esperar(await env.api.get(rota, fantasma), 401);
    });

    it('401 · token de usuário que foi inativado depois do login', async () => {
      await consultar(`UPDATE usuario SET status = 'inativo' WHERE id_usuario = $1`, [ctx.colabA.id_usuario]);

      esperar(await env.api.get(rota, ctx.token.colabA), 401);
    });
  });
});

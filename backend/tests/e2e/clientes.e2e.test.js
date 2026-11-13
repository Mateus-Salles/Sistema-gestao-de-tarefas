import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  iniciarAmbiente,
  esperar,
  ids,
  criarCliente,
  criarModelo,
  TAREFAS_DO_MODELO_PADRAO,
} from '../../helpers/e2e.js';

describe('E2E · Clientes', () => {
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
  describe('GET /clientes (RF09)', () => {
    it('200 · lista clientes com paginação padrão', async () => {
      const a = await criarCliente({ nome: 'Acme' });
      const b = await criarCliente({ nome: 'Beta', status: 'inativa' });

      const body = esperar(await env.api.get('/clientes', ctx.token.admin), 200);

      assert.deepEqual(ids(body.dados, 'id_cliente'), [a.id_cliente, b.id_cliente]);
      assert.deepEqual(body.paginacao, { pagina: 1, tamanho_pagina: 20, total: 2 });

      const acme = body.dados.find((c) => c.id_cliente === a.id_cliente);
      assert.equal(acme.nome, 'Acme');
      assert.ok(acme.contato);
      assert.equal(acme.status, 'ativa');
      assert.ok(acme.criado_em);
    });

    it('200 · filtra por status', async () => {
      const ativa = await criarCliente({ status: 'ativa' });
      const inativa = await criarCliente({ status: 'inativa' });

      const ativas = esperar(await env.api.get('/clientes?status=ativa', ctx.token.admin), 200);
      assert.deepEqual(ids(ativas.dados, 'id_cliente'), [ativa.id_cliente]);

      const inativas = esperar(await env.api.get('/clientes?status=inativa', ctx.token.admin), 200);
      assert.deepEqual(ids(inativas.dados, 'id_cliente'), [inativa.id_cliente]);
    });

    it('200 · pagina os resultados', async () => {
      for (let i = 0; i < 3; i++) await criarCliente();

      const pagina2 = esperar(await env.api.get('/clientes?pagina=2&tamanho_pagina=2', ctx.token.admin), 200);

      assert.equal(pagina2.dados.length, 1);
      assert.deepEqual(pagina2.paginacao, { pagina: 2, tamanho_pagina: 2, total: 3 });
    });

    it('200 · colaborador também consegue listar', async () => {
      await criarCliente();

      const body = esperar(await env.api.get('/clientes', ctx.token.colabA), 200);

      assert.equal(body.dados.length, 1);
    });

    it('401 · sem token', async () => {
      esperar(await env.api.get('/clientes'), 401);
    });
  });

  /* ---------------------------------------------------------------- */
  describe('POST /clientes (RF06, RN04)', () => {
    it('201 · administrador cadastra cliente, que nasce "ativa"', async () => {
      const criado = esperar(
        await env.api.post('/clientes', { nome: 'Nova Cliente', contato: 'contato@nova.com' }, ctx.token.admin),
        201
      );

      assert.ok(Number.isInteger(criado.id_cliente));
      assert.equal(criado.nome, 'Nova Cliente');
      assert.equal(criado.contato, 'contato@nova.com');
      assert.equal(criado.status, 'ativa');
      assert.ok(criado.criado_em);

      const lido = esperar(await env.api.get(`/clientes/${criado.id_cliente}`, ctx.token.admin), 200);
      assert.equal(lido.nome, 'Nova Cliente');
    });

    it('400 · nome ou contato ausentes', async () => {
      esperar(await env.api.post('/clientes', { contato: 'x@y.com' }, ctx.token.admin), 400);
      esperar(await env.api.post('/clientes', { nome: 'Sem contato' }, ctx.token.admin), 400);
      esperar(await env.api.post('/clientes', {}, ctx.token.admin), 400);
    });

    it('403 · RN04 — colaborador não pode cadastrar cliente', async () => {
      esperar(await env.api.post('/clientes', { nome: 'X', contato: 'x@y.com' }, ctx.token.colabA), 403);
    });

    it('401 · sem token', async () => {
      esperar(await env.api.post('/clientes', { nome: 'X', contato: 'x@y.com' }), 401);
    });
  });

  /* ---------------------------------------------------------------- */
  describe('GET /clientes/{id} (RF06)', () => {
    it('200 · devolve o cliente', async () => {
      const c = await criarCliente({ nome: 'Detalhe', contato: 'det@cliente.com' });

      const body = esperar(await env.api.get(`/clientes/${c.id_cliente}`, ctx.token.admin), 200);

      assert.equal(body.id_cliente, c.id_cliente);
      assert.equal(body.nome, 'Detalhe');
      assert.equal(body.contato, 'det@cliente.com');
    });

    it('404 · cliente inexistente', async () => {
      esperar(await env.api.get('/clientes/999999', ctx.token.admin), 404);
    });

    it('401 · sem token', async () => {
      esperar(await env.api.get('/clientes/1'), 401);
    });
  });

  /* ---------------------------------------------------------------- */
  describe('PATCH /clientes/{id} (RF08)', () => {
    it('200 · administrador edita nome e contato', async () => {
      const c = await criarCliente({ nome: 'Antes' });

      const editado = esperar(
        await env.api.patch(`/clientes/${c.id_cliente}`, { nome: 'Depois', contato: 'novo@contato.com' }, ctx.token.admin),
        200
      );

      assert.equal(editado.nome, 'Depois');
      assert.equal(editado.contato, 'novo@contato.com');
      assert.equal(editado.status, 'ativa');
    });

    it('200 · atualização parcial mantém o que não foi enviado', async () => {
      const c = await criarCliente({ nome: 'Mantido', contato: 'fica@igual.com' });

      const editado = esperar(
        await env.api.patch(`/clientes/${c.id_cliente}`, { contato: 'mudou@contato.com' }, ctx.token.admin),
        200
      );

      assert.equal(editado.nome, 'Mantido');
      assert.equal(editado.contato, 'mudou@contato.com');
    });

    it('200 · não altera o status por esta rota (existe /status para isso)', async () => {
      const c = await criarCliente();

      const editado = esperar(
        await env.api.patch(`/clientes/${c.id_cliente}`, { nome: 'Novo nome', status: 'inativa' }, ctx.token.admin),
        200
      );

      assert.equal(editado.status, 'ativa');
    });

    it('403 · colaborador não pode editar cliente', async () => {
      const c = await criarCliente();

      esperar(await env.api.patch(`/clientes/${c.id_cliente}`, { nome: 'X' }, ctx.token.colabA), 403);
    });

    it('404 · cliente inexistente', async () => {
      esperar(await env.api.patch('/clientes/999999', { nome: 'X' }, ctx.token.admin), 404);
    });

    it('401 · sem token', async () => {
      esperar(await env.api.patch('/clientes/1', { nome: 'X' }), 401);
    });
  });

  /* ---------------------------------------------------------------- */
  describe('PATCH /clientes/{id}/status (RF07, RF08, RN05)', () => {
    it('200 · inativa e reativa o cliente', async () => {
      const c = await criarCliente();

      const inativada = esperar(
        await env.api.patch(`/clientes/${c.id_cliente}/status`, { status: 'inativa' }, ctx.token.admin),
        200
      );
      assert.equal(inativada.status, 'inativa');

      const reativada = esperar(
        await env.api.patch(`/clientes/${c.id_cliente}/status`, { status: 'ativa' }, ctx.token.admin),
        200
      );
      assert.equal(reativada.status, 'ativa');
    });

    it('RN05 · cliente inativado não aceita novos projetos; reativado volta a aceitar', async () => {
      const c = await criarCliente();
      const modelo = await criarModelo({ tarefas: TAREFAS_DO_MODELO_PADRAO });
      const projeto = {
        cliente_id: c.id_cliente,
        modelo_lancamento_id: modelo.id_modelo_lancamento,
        nome: 'Lançamento Verão',
        data_comeco: '2026-12-01',
        data_final: '2027-01-31',
      };

      await env.api.patch(`/clientes/${c.id_cliente}/status`, { status: 'inativa' }, ctx.token.admin);
      esperar(await env.api.post('/projetos', projeto, ctx.token.admin), 409);

      await env.api.patch(`/clientes/${c.id_cliente}/status`, { status: 'ativa' }, ctx.token.admin);
      esperar(await env.api.post('/projetos', projeto, ctx.token.admin), 201);
    });

    it('400 · status inválido', async () => {
      const c = await criarCliente();

      esperar(await env.api.patch(`/clientes/${c.id_cliente}/status`, { status: 'pausada' }, ctx.token.admin), 400);
    });

    it('403 · colaborador não pode alterar o status', async () => {
      const c = await criarCliente();

      esperar(await env.api.patch(`/clientes/${c.id_cliente}/status`, { status: 'inativa' }, ctx.token.colabA), 403);
    });

    it('401 · sem token', async () => {
      esperar(await env.api.patch('/clientes/1/status', { status: 'inativa' }), 401);
    });
  });
});

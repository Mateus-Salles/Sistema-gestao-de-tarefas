import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  iniciarAmbiente,
  esperar,
  ids,
  criarCliente,
  criarModelo,
  criarProjeto,
  tarefasPorDivisao,
  definirStatus,
  concluirTodasAsTarefas,
  TAREFAS_DO_MODELO_PADRAO,
} from '../../helpers/e2e.js';

describe('E2E · Projetos', () => {
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

  async function corpoDeProjeto(extra = {}) {
    const cliente = await criarCliente();
    const modelo = await criarModelo({ tarefas: TAREFAS_DO_MODELO_PADRAO });

    return {
      cliente_id: cliente.id_cliente,
      modelo_lancamento_id: modelo.id_modelo_lancamento,
      nome: 'Lançamento Black Friday',
      data_comeco: '2026-11-01',
      data_final: '2026-11-30',
      ...extra,
    };
  }

  /* ---------------------------------------------------------------- */
  describe('GET /projetos (RF15)', () => {
    it('200 · lista projetos com paginação padrão', async () => {
      const p1 = await criarProjeto({ nome: 'Projeto 1' });
      const p2 = await criarProjeto({ nome: 'Projeto 2' });

      const body = esperar(await env.api.get('/projetos', ctx.token.admin), 200);

      assert.deepEqual(ids(body.dados, 'id_projeto'), [p1.id_projeto, p2.id_projeto]);
      assert.deepEqual(body.paginacao, { pagina: 1, tamanho_pagina: 20, total: 2 });

      const lido = body.dados.find((p) => p.id_projeto === p1.id_projeto);
      assert.equal(lido.nome, 'Projeto 1');
      assert.equal(lido.cliente_id, p1.cliente_id);
      assert.equal(lido.modelo_lancamento_id, p1.modelo_lancamento_id);
      assert.equal(lido.data_comeco, '2026-01-01');
      assert.equal(lido.data_final, '2026-12-31');
      assert.equal(lido.status, 'andamento');
    });

    it('200 · filtra por cliente_id', async () => {
      const clienteA = await criarCliente();
      const clienteB = await criarCliente();
      const doA = await criarProjeto({ clienteId: clienteA.id_cliente });
      await criarProjeto({ clienteId: clienteB.id_cliente });

      const body = esperar(await env.api.get(`/projetos?cliente_id=${clienteA.id_cliente}`, ctx.token.admin), 200);

      assert.deepEqual(ids(body.dados, 'id_projeto'), [doA.id_projeto]);
    });

    it('200 · filtra por status', async () => {
      await criarProjeto();
      const cancelado = await criarProjeto({ status: 'cancelado' });

      const body = esperar(await env.api.get('/projetos?status=cancelado', ctx.token.admin), 200);

      assert.deepEqual(ids(body.dados, 'id_projeto'), [cancelado.id_projeto]);
    });

    it('200 · pagina os resultados', async () => {
      for (let i = 0; i < 3; i++) await criarProjeto();

      const pagina2 = esperar(await env.api.get('/projetos?pagina=2&tamanho_pagina=2', ctx.token.admin), 200);

      assert.equal(pagina2.dados.length, 1);
      assert.deepEqual(pagina2.paginacao, { pagina: 2, tamanho_pagina: 2, total: 3 });
    });

    it('401 · sem token', async () => {
      esperar(await env.api.get('/projetos'), 401);
    });
  });

  /* ---------------------------------------------------------------- */
  describe('POST /projetos (RF15, RF16, RN05)', () => {
    it('201 · cria o projeto "em andamento" vinculado a cliente e modelo', async () => {
      const entrada = await corpoDeProjeto();

      const criado = esperar(await env.api.post('/projetos', entrada, ctx.token.admin), 201);

      assert.ok(Number.isInteger(criado.id_projeto));
      assert.equal(criado.cliente_id, entrada.cliente_id);
      assert.equal(criado.modelo_lancamento_id, entrada.modelo_lancamento_id);
      assert.equal(criado.nome, 'Lançamento Black Friday');
      assert.equal(criado.data_comeco, '2026-11-01');
      assert.equal(criado.data_final, '2026-11-30');
      assert.equal(criado.status, 'andamento');
    });

    it('RF16 · gera automaticamente as tarefas do modelo, distribuídas nas divisões', async () => {
      const entrada = await corpoDeProjeto();

      const criado = esperar(await env.api.post('/projetos', entrada, ctx.token.admin), 201);

      const lista = esperar(await env.api.get(`/tarefas?projeto_id=${criado.id_projeto}`, ctx.token.admin), 200);

      assert.equal(lista.dados.length, TAREFAS_DO_MODELO_PADRAO.length);
      assert.deepEqual(lista.dados.map((t) => t.divisao).sort(), ['conteudo', 'disparos', 'produto', 'trafego']);

      for (const t of lista.dados) {
        assert.equal(t.projeto_id, criado.id_projeto);
        assert.equal(t.kanban_status, 'a_fazer');
        assert.equal(t.responsavel_id, null);
        assert.equal(t.criador_id, ctx.admin.id_usuario);
      }

      const titulos = lista.dados.map((t) => t.titulo).sort();
      assert.deepEqual(titulos, TAREFAS_DO_MODELO_PADRAO.map((t) => t.titulo).sort());
    });

    it('201 · modelo sem tarefas padrão cria projeto vazio', async () => {
      const modelo = await criarModelo();
      const entrada = await corpoDeProjeto({ modelo_lancamento_id: modelo.id_modelo_lancamento });

      const criado = esperar(await env.api.post('/projetos', entrada, ctx.token.admin), 201);

      const lista = esperar(await env.api.get(`/tarefas?projeto_id=${criado.id_projeto}`, ctx.token.admin), 200);
      assert.equal(lista.dados.length, 0);
    });

    it('409 · RN05 — cliente inativo não pode receber projeto (e nada é criado)', async () => {
      const inativo = await criarCliente({ status: 'inativa' });
      const entrada = await corpoDeProjeto({ cliente_id: inativo.id_cliente });

      esperar(await env.api.post('/projetos', entrada, ctx.token.admin), 409);

      const lista = esperar(await env.api.get('/projetos', ctx.token.admin), 200);
      assert.equal(lista.dados.length, 0);
    });

    it('400 · campos obrigatórios ausentes', async () => {
      const entrada = await corpoDeProjeto();
      const { nome, ...semNome } = entrada;
      const { data_final, ...semDataFinal } = entrada;

      esperar(await env.api.post('/projetos', semNome, ctx.token.admin), 400);
      esperar(await env.api.post('/projetos', semDataFinal, ctx.token.admin), 400);
      esperar(await env.api.post('/projetos', {}, ctx.token.admin), 400);
    });

    it('400 · data final anterior à data de começo', async () => {
      const entrada = await corpoDeProjeto({ data_comeco: '2026-12-31', data_final: '2026-01-01' });

      esperar(await env.api.post('/projetos', entrada, ctx.token.admin), 400);
    });

    it('403 · colaborador não pode criar projeto', async () => {
      const entrada = await corpoDeProjeto();

      esperar(await env.api.post('/projetos', entrada, ctx.token.colabA), 403);
    });

    it('401 · sem token', async () => {
      esperar(await env.api.post('/projetos', await corpoDeProjeto()), 401);
    });
  });

  /* ---------------------------------------------------------------- */
  describe('GET /projetos/{id} (RF17)', () => {
    it('200 · devolve o projeto', async () => {
      const p = await criarProjeto({ nome: 'Detalhe' });

      const body = esperar(await env.api.get(`/projetos/${p.id_projeto}`, ctx.token.admin), 200);

      assert.equal(body.id_projeto, p.id_projeto);
      assert.equal(body.nome, 'Detalhe');
    });

    it('404 · projeto inexistente', async () => {
      esperar(await env.api.get('/projetos/999999', ctx.token.admin), 404);
    });

    it('401 · sem token', async () => {
      esperar(await env.api.get('/projetos/1'), 401);
    });
  });

  /* ---------------------------------------------------------------- */
  describe('PATCH /projetos/{id} (RF17)', () => {
    it('200 · administrador edita nome e datas', async () => {
      const p = await criarProjeto();

      const editado = esperar(
        await env.api.patch(
          `/projetos/${p.id_projeto}`,
          { nome: 'Nome novo', data_comeco: '2026-02-01', data_final: '2026-03-01' },
          ctx.token.admin
        ),
        200
      );

      assert.equal(editado.nome, 'Nome novo');
      assert.equal(editado.data_comeco, '2026-02-01');
      assert.equal(editado.data_final, '2026-03-01');
    });

    it('200 · atualização parcial mantém o restante', async () => {
      const p = await criarProjeto({ nome: 'Mantém datas' });

      const editado = esperar(await env.api.patch(`/projetos/${p.id_projeto}`, { nome: 'Só o nome' }, ctx.token.admin), 200);

      assert.equal(editado.nome, 'Só o nome');
      assert.equal(editado.data_comeco, '2026-01-01');
      assert.equal(editado.data_final, '2026-12-31');
    });

    it('200 · não troca cliente, modelo nem status por esta rota', async () => {
      const p = await criarProjeto();
      const outro = await criarCliente();

      const editado = esperar(
        await env.api.patch(
          `/projetos/${p.id_projeto}`,
          { nome: 'X', cliente_id: outro.id_cliente, status: 'cancelado' },
          ctx.token.admin
        ),
        200
      );

      assert.equal(editado.cliente_id, p.cliente_id);
      assert.equal(editado.status, 'andamento');
    });

    it('400 · data final anterior à de começo', async () => {
      const p = await criarProjeto();

      esperar(await env.api.patch(`/projetos/${p.id_projeto}`, { data_final: '2025-01-01' }, ctx.token.admin), 400);
    });

    it('403 · colaborador não pode editar projeto', async () => {
      const p = await criarProjeto();

      esperar(await env.api.patch(`/projetos/${p.id_projeto}`, { nome: 'X' }, ctx.token.colabA), 403);
    });

    it('401 · sem token', async () => {
      esperar(await env.api.patch('/projetos/1', { nome: 'X' }), 401);
    });
  });

  /* ---------------------------------------------------------------- */
  describe('PATCH /projetos/{id}/status (RF19, RN07)', () => {
    it('409 · RN07 — não conclui enquanto houver tarefa fora da coluna Concluído', async () => {
      const p = await criarProjeto();
      const tarefas = await tarefasPorDivisao(p.id_projeto);
      await definirStatus(tarefas.produto.id_tarefa, 'concluido');

      esperar(await env.api.patch(`/projetos/${p.id_projeto}/status`, { status: 'concluido' }, ctx.token.admin), 409);

      const lido = esperar(await env.api.get(`/projetos/${p.id_projeto}`, ctx.token.admin), 200);
      assert.equal(lido.status, 'andamento');
    });

    it('200 · conclui quando todas as tarefas estão em Concluído', async () => {
      const p = await criarProjeto();
      await concluirTodasAsTarefas(p.id_projeto);

      const body = esperar(
        await env.api.patch(`/projetos/${p.id_projeto}/status`, { status: 'concluido' }, ctx.token.admin),
        200
      );

      assert.equal(body.status, 'concluido');
    });

    it('200 · projeto sem tarefas pode ser concluído', async () => {
      const modelo = await criarModelo();
      const p = await criarProjeto({ modeloId: modelo.id_modelo_lancamento });

      const body = esperar(
        await env.api.patch(`/projetos/${p.id_projeto}/status`, { status: 'concluido' }, ctx.token.admin),
        200
      );

      assert.equal(body.status, 'concluido');
    });

    it('200 · cancelar não depende do estado das tarefas', async () => {
      const p = await criarProjeto();

      const body = esperar(
        await env.api.patch(`/projetos/${p.id_projeto}/status`, { status: 'cancelado' }, ctx.token.admin),
        200
      );

      assert.equal(body.status, 'cancelado');
    });

    it('400 · status inválido', async () => {
      const p = await criarProjeto();

      esperar(await env.api.patch(`/projetos/${p.id_projeto}/status`, { status: 'arquivado' }, ctx.token.admin), 400);
    });

    it('403 · colaborador não pode alterar o status do projeto', async () => {
      const p = await criarProjeto();

      esperar(await env.api.patch(`/projetos/${p.id_projeto}/status`, { status: 'cancelado' }, ctx.token.colabA), 403);
    });

    it('401 · sem token', async () => {
      esperar(await env.api.patch('/projetos/1/status', { status: 'cancelado' }), 401);
    });
  });

  /* ---------------------------------------------------------------- */
  describe('GET /projetos/{id}/progresso (RN07)', () => {
    it('200 · começa com 0% e acompanha as tarefas concluídas', async () => {
      const p = await criarProjeto();
      const tarefas = await tarefasPorDivisao(p.id_projeto);

      const inicio = esperar(await env.api.get(`/projetos/${p.id_projeto}/progresso`, ctx.token.admin), 200);
      assert.equal(inicio.id_projeto, p.id_projeto);
      assert.equal(inicio.total_tarefas, 4);
      assert.equal(inicio.tarefas_concluidas, 0);
      assert.equal(inicio.tarefas_pendentes, 4);
      assert.equal(typeof inicio.percentual_concluido, 'number');
      assert.equal(inicio.percentual_concluido, 0);

      await definirStatus([tarefas.produto.id_tarefa, tarefas.conteudo.id_tarefa], 'concluido');

      const meio = esperar(await env.api.get(`/projetos/${p.id_projeto}/progresso`, ctx.token.admin), 200);
      assert.equal(meio.tarefas_concluidas, 2);
      assert.equal(meio.tarefas_pendentes, 2);
      assert.equal(meio.percentual_concluido, 50);

      await concluirTodasAsTarefas(p.id_projeto);

      const fim = esperar(await env.api.get(`/projetos/${p.id_projeto}/progresso`, ctx.token.admin), 200);
      assert.equal(fim.tarefas_pendentes, 0);
      assert.equal(fim.percentual_concluido, 100);
    });

    it('200 · tarefas em andamento ou revisão contam como pendentes', async () => {
      const p = await criarProjeto();
      const tarefas = await tarefasPorDivisao(p.id_projeto);
      await definirStatus(tarefas.produto.id_tarefa, 'em_andamento');
      await definirStatus(tarefas.conteudo.id_tarefa, 'em_revisao');

      const body = esperar(await env.api.get(`/projetos/${p.id_projeto}/progresso`, ctx.token.admin), 200);

      assert.equal(body.tarefas_concluidas, 0);
      assert.equal(body.tarefas_pendentes, 4);
    });

    it('200 · projeto sem tarefas devolve total 0 (sem divisão por zero)', async () => {
      const modelo = await criarModelo();
      const p = await criarProjeto({ modeloId: modelo.id_modelo_lancamento });

      const body = esperar(await env.api.get(`/projetos/${p.id_projeto}/progresso`, ctx.token.admin), 200);

      assert.equal(body.total_tarefas, 0);
      assert.ok([0, null].includes(body.percentual_concluido));
    });

    it('401 · sem token', async () => {
      esperar(await env.api.get('/projetos/1/progresso'), 401);
    });
  });
});

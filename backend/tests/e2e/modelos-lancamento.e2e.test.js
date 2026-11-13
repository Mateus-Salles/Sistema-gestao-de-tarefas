import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  iniciarAmbiente,
  esperar,
  ids,
  criarModelo,
  criarProjeto,
  consultar,
  TAREFAS_DO_MODELO_PADRAO,
} from '../../helpers/e2e.js';

describe('E2E · Modelos de Lançamento', () => {
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
  describe('GET /modelos-lancamento (RF11)', () => {
    it('200 · lista os modelos (array simples, sem paginação)', async () => {
      const a = await criarModelo({ nome: 'Lançamento Semente' });
      const b = await criarModelo({ nome: 'Lançamento Perpétuo', status: 'inativo' });

      const lista = esperar(await env.api.get('/modelos-lancamento', ctx.token.admin), 200);

      assert.ok(Array.isArray(lista));
      assert.deepEqual(ids(lista, 'id_modelo_lancamento'), [a.id_modelo_lancamento, b.id_modelo_lancamento]);

      const semente = lista.find((m) => m.id_modelo_lancamento === a.id_modelo_lancamento);
      assert.equal(semente.nome, 'Lançamento Semente');
      assert.equal(semente.status, 'ativo');
      assert.ok(semente.criado_em);
    });

    it('200 · lista vazia quando não há modelos', async () => {
      assert.deepEqual(esperar(await env.api.get('/modelos-lancamento', ctx.token.admin), 200), []);
    });

    it('401 · sem token', async () => {
      esperar(await env.api.get('/modelos-lancamento'), 401);
    });
  });

  /* ---------------------------------------------------------------- */
  describe('POST /modelos-lancamento (RF11)', () => {
    it('201 · administrador cadastra modelo ativo', async () => {
      const criado = esperar(
        await env.api.post('/modelos-lancamento', { nome: 'Lançamento Meteórico' }, ctx.token.admin),
        201
      );

      assert.ok(Number.isInteger(criado.id_modelo_lancamento));
      assert.equal(criado.nome, 'Lançamento Meteórico');
      assert.equal(criado.status, 'ativo');
    });

    it('400 · nome ausente', async () => {
      esperar(await env.api.post('/modelos-lancamento', {}, ctx.token.admin), 400);
    });

    it('403 · colaborador não pode cadastrar modelo', async () => {
      esperar(await env.api.post('/modelos-lancamento', { nome: 'X' }, ctx.token.colabA), 403);
    });

    it('401 · sem token', async () => {
      esperar(await env.api.post('/modelos-lancamento', { nome: 'X' }), 401);
    });
  });

  /* ---------------------------------------------------------------- */
  describe('GET /modelos-lancamento/{id} (RF12)', () => {
    it('200 · devolve o modelo com suas tarefas padrão', async () => {
      const modelo = await criarModelo({ nome: 'Completo', tarefas: TAREFAS_DO_MODELO_PADRAO });

      const body = esperar(await env.api.get(`/modelos-lancamento/${modelo.id_modelo_lancamento}`, ctx.token.admin), 200);

      assert.equal(body.id_modelo_lancamento, modelo.id_modelo_lancamento);
      assert.equal(body.nome, 'Completo');
      assert.equal(body.tarefas_padrao.length, TAREFAS_DO_MODELO_PADRAO.length);

      const divisoes = body.tarefas_padrao.map((t) => t.divisao).sort();
      assert.deepEqual(divisoes, ['conteudo', 'disparos', 'produto', 'trafego']);

      for (const t of body.tarefas_padrao) {
        assert.ok(Number.isInteger(t.id_tarefa_padrao));
        assert.equal(t.modelo_lancamento_id, modelo.id_modelo_lancamento);
        assert.ok(t.titulo);
      }
    });

    it('200 · modelo sem tarefas padrão devolve lista vazia', async () => {
      const modelo = await criarModelo();

      const body = esperar(await env.api.get(`/modelos-lancamento/${modelo.id_modelo_lancamento}`, ctx.token.admin), 200);

      assert.deepEqual(body.tarefas_padrao, []);
    });

    it('404 · modelo inexistente', async () => {
      esperar(await env.api.get('/modelos-lancamento/999999', ctx.token.admin), 404);
    });

    it('401 · sem token', async () => {
      esperar(await env.api.get('/modelos-lancamento/1'), 401);
    });
  });

  /* ---------------------------------------------------------------- */
  describe('PATCH /modelos-lancamento/{id} (RF13, RF14)', () => {
    it('200 · administrador renomeia o modelo', async () => {
      const modelo = await criarModelo({ nome: 'Antigo' });

      const editado = esperar(
        await env.api.patch(`/modelos-lancamento/${modelo.id_modelo_lancamento}`, { nome: 'Novo nome' }, ctx.token.admin),
        200
      );

      assert.equal(editado.nome, 'Novo nome');
    });

    it('RF14 · alterar o modelo não afeta projetos já criados a partir dele', async () => {
      const modelo = await criarModelo({ nome: 'Base', tarefas: TAREFAS_DO_MODELO_PADRAO });
      const projeto = await criarProjeto({ modeloId: modelo.id_modelo_lancamento });

      await env.api.patch(`/modelos-lancamento/${modelo.id_modelo_lancamento}`, { nome: 'Base v2' }, ctx.token.admin);
      esperar(
        await env.api.post(
          `/modelos-lancamento/${modelo.id_modelo_lancamento}/tarefas-padrao`,
          { titulo: 'Tarefa nova só no modelo', divisao: 'produto' },
          ctx.token.admin
        ),
        201
      );

      const [{ total }] = await consultar('SELECT COUNT(*) AS total FROM tarefa WHERE projeto_id = $1', [
        projeto.id_projeto,
      ]);
      assert.equal(total, TAREFAS_DO_MODELO_PADRAO.length);
    });

    it('400 · nome vazio', async () => {
      const modelo = await criarModelo();

      esperar(await env.api.patch(`/modelos-lancamento/${modelo.id_modelo_lancamento}`, { nome: '' }, ctx.token.admin), 400);
    });

    it('403 · colaborador não pode editar modelo', async () => {
      const modelo = await criarModelo();

      esperar(await env.api.patch(`/modelos-lancamento/${modelo.id_modelo_lancamento}`, { nome: 'X' }, ctx.token.colabA), 403);
    });

    it('401 · sem token', async () => {
      esperar(await env.api.patch('/modelos-lancamento/1', { nome: 'X' }), 401);
    });
  });

  /* ---------------------------------------------------------------- */
  describe('DELETE /modelos-lancamento/{id} (RF13, RF14)', () => {
    it('204 · exclui modelo sem uso (e as tarefas padrão dele somem junto)', async () => {
      const modelo = await criarModelo({ tarefas: TAREFAS_DO_MODELO_PADRAO });
      const id = modelo.id_modelo_lancamento;

      const res = await env.api.delete(`/modelos-lancamento/${id}`, ctx.token.admin);
      assert.equal(res.status, 204);

      esperar(await env.api.get(`/modelos-lancamento/${id}`, ctx.token.admin), 404);

      const orfas = await consultar('SELECT 1 FROM tarefa_padrao WHERE modelo_lancamento_id = $1', [id]);
      assert.equal(orfas.length, 0);
    });

    it('409 · modelo em uso por projeto existente não pode ser excluído', async () => {
      const modelo = await criarModelo({ tarefas: TAREFAS_DO_MODELO_PADRAO });
      await criarProjeto({ modeloId: modelo.id_modelo_lancamento });

      esperar(await env.api.delete(`/modelos-lancamento/${modelo.id_modelo_lancamento}`, ctx.token.admin), 409);

      esperar(await env.api.get(`/modelos-lancamento/${modelo.id_modelo_lancamento}`, ctx.token.admin), 200);
    });

    it('403 · colaborador não pode excluir modelo', async () => {
      const modelo = await criarModelo();

      esperar(await env.api.delete(`/modelos-lancamento/${modelo.id_modelo_lancamento}`, ctx.token.colabA), 403);
    });

    it('401 · sem token', async () => {
      esperar(await env.api.delete('/modelos-lancamento/1'), 401);
    });
  });

  /* ---------------------------------------------------------------- */
  describe('GET /modelos-lancamento/{id}/tarefas-padrao (RF12)', () => {
    it('200 · lista as tarefas padrão do modelo (e só as dele)', async () => {
      const modelo = await criarModelo({ tarefas: TAREFAS_DO_MODELO_PADRAO });
      await criarModelo({ tarefas: [{ titulo: 'De outro modelo', divisao: 'produto' }] });

      const lista = esperar(
        await env.api.get(`/modelos-lancamento/${modelo.id_modelo_lancamento}/tarefas-padrao`, ctx.token.admin),
        200
      );

      assert.equal(lista.length, 4);
      assert.ok(lista.every((t) => t.modelo_lancamento_id === modelo.id_modelo_lancamento));
      assert.ok(lista.every((t) => t.titulo !== 'De outro modelo'));
    });

    it('401 · sem token', async () => {
      esperar(await env.api.get('/modelos-lancamento/1/tarefas-padrao'), 401);
    });
  });

  /* ---------------------------------------------------------------- */
  describe('POST /modelos-lancamento/{id}/tarefas-padrao (RF12)', () => {
    it('201 · adiciona tarefa padrão ao modelo', async () => {
      const modelo = await criarModelo();
      const id = modelo.id_modelo_lancamento;

      const criada = esperar(
        await env.api.post(`/modelos-lancamento/${id}/tarefas-padrao`, { titulo: 'Gravar VSL', divisao: 'conteudo' }, ctx.token.admin),
        201
      );

      assert.ok(Number.isInteger(criada.id_tarefa_padrao));
      assert.equal(criada.modelo_lancamento_id, id);
      assert.equal(criada.titulo, 'Gravar VSL');
      assert.equal(criada.divisao, 'conteudo');

      const detalhe = esperar(await env.api.get(`/modelos-lancamento/${id}`, ctx.token.admin), 200);
      assert.equal(detalhe.tarefas_padrao.length, 1);
    });

    it('400 · divisão fora das quatro fixas, ou campos ausentes', async () => {
      const modelo = await criarModelo();
      const caminho = `/modelos-lancamento/${modelo.id_modelo_lancamento}/tarefas-padrao`;

      esperar(await env.api.post(caminho, { titulo: 'X', divisao: 'financeiro' }, ctx.token.admin), 400);
      esperar(await env.api.post(caminho, { titulo: 'Sem divisão' }, ctx.token.admin), 400);
      esperar(await env.api.post(caminho, { divisao: 'produto' }, ctx.token.admin), 400);
    });

    it('403 · colaborador não pode adicionar tarefa padrão', async () => {
      const modelo = await criarModelo();

      esperar(
        await env.api.post(
          `/modelos-lancamento/${modelo.id_modelo_lancamento}/tarefas-padrao`,
          { titulo: 'X', divisao: 'produto' },
          ctx.token.colabA
        ),
        403
      );
    });

    it('401 · sem token', async () => {
      esperar(await env.api.post('/modelos-lancamento/1/tarefas-padrao', { titulo: 'X', divisao: 'produto' }), 401);
    });
  });

  /* ---------------------------------------------------------------- */
  describe('PATCH /modelos-lancamento/{id}/tarefas-padrao/{tarefaId} (RF12)', () => {
    async function modeloComUmaTarefa() {
      const modelo = await criarModelo({ tarefas: [{ titulo: 'Original', divisao: 'produto' }] });
      const [tp] = await consultar('SELECT id_tarefa_padrao FROM tarefa_padrao WHERE modelo_lancamento_id = $1', [
        modelo.id_modelo_lancamento,
      ]);
      return { modeloId: modelo.id_modelo_lancamento, tarefaId: tp.id_tarefa_padrao };
    }

    it('200 · edita título e divisão', async () => {
      const { modeloId, tarefaId } = await modeloComUmaTarefa();

      const editada = esperar(
        await env.api.patch(
          `/modelos-lancamento/${modeloId}/tarefas-padrao/${tarefaId}`,
          { titulo: 'Reescrita', divisao: 'trafego' },
          ctx.token.admin
        ),
        200
      );

      assert.equal(editada.id_tarefa_padrao, tarefaId);
      assert.equal(editada.titulo, 'Reescrita');
      assert.equal(editada.divisao, 'trafego');
    });

    it('400 · divisão inválida', async () => {
      const { modeloId, tarefaId } = await modeloComUmaTarefa();

      esperar(
        await env.api.patch(
          `/modelos-lancamento/${modeloId}/tarefas-padrao/${tarefaId}`,
          { titulo: 'X', divisao: 'inexistente' },
          ctx.token.admin
        ),
        400
      );
    });

    it('403 · colaborador não pode editar tarefa padrão', async () => {
      const { modeloId, tarefaId } = await modeloComUmaTarefa();

      esperar(
        await env.api.patch(
          `/modelos-lancamento/${modeloId}/tarefas-padrao/${tarefaId}`,
          { titulo: 'X', divisao: 'produto' },
          ctx.token.colabA
        ),
        403
      );
    });

    it('401 · sem token', async () => {
      esperar(await env.api.patch('/modelos-lancamento/1/tarefas-padrao/1', { titulo: 'X', divisao: 'produto' }), 401);
    });
  });

  /* ---------------------------------------------------------------- */
  describe('DELETE /modelos-lancamento/{id}/tarefas-padrao/{tarefaId} (RF12)', () => {
    it('204 · remove a tarefa padrão do modelo', async () => {
      const modelo = await criarModelo({ tarefas: TAREFAS_DO_MODELO_PADRAO });
      const id = modelo.id_modelo_lancamento;
      const antes = esperar(await env.api.get(`/modelos-lancamento/${id}/tarefas-padrao`, ctx.token.admin), 200);

      const res = await env.api.delete(
        `/modelos-lancamento/${id}/tarefas-padrao/${antes[0].id_tarefa_padrao}`,
        ctx.token.admin
      );
      assert.equal(res.status, 204);

      const depois = esperar(await env.api.get(`/modelos-lancamento/${id}/tarefas-padrao`, ctx.token.admin), 200);
      assert.equal(depois.length, 3);
      assert.ok(!ids(depois, 'id_tarefa_padrao').includes(antes[0].id_tarefa_padrao));
    });

    it('403 · colaborador não pode remover tarefa padrão', async () => {
      const modelo = await criarModelo({ tarefas: [{ titulo: 'X', divisao: 'produto' }] });
      const [tp] = await consultar('SELECT id_tarefa_padrao FROM tarefa_padrao WHERE modelo_lancamento_id = $1', [
        modelo.id_modelo_lancamento,
      ]);

      esperar(
        await env.api.delete(
          `/modelos-lancamento/${modelo.id_modelo_lancamento}/tarefas-padrao/${tp.id_tarefa_padrao}`,
          ctx.token.colabA
        ),
        403
      );
    });

    it('401 · sem token', async () => {
      esperar(await env.api.delete('/modelos-lancamento/1/tarefas-padrao/1'), 401);
    });
  });
});

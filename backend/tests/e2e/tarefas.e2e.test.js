import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  iniciarAmbiente,
  esperar,
  ids,
  criarUsuario,
  criarProjeto,
  criarTarefa,
  tarefasPorDivisao,
  dataRelativa,
} from '../../helpers/e2e.js';

describe('E2E · Tarefas', () => {
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
  describe('GET /tarefas (RF20, RN01, RN02)', () => {
    it('200 · administrador enxerga todas as tarefas (de projeto e avulsas)', async () => {
      const projeto = await criarProjeto();
      const avulsa = await criarTarefa({ titulo: 'Avulsa' });
      const doColab = await criarTarefa({ criadorId: ctx.colabA.id_usuario });

      const body = esperar(await env.api.get('/tarefas', ctx.token.admin), 200);

      assert.equal(body.dados.length, 4 + 2);
      assert.ok(ids(body.dados).includes(avulsa.id_tarefa));
      assert.ok(ids(body.dados).includes(doColab.id_tarefa));
      assert.ok(body.dados.some((t) => t.projeto_id === projeto.id_projeto));
      assert.deepEqual(body.paginacao, { pagina: 1, tamanho_pagina: 20, total: 6 });
    });

    it('200 · cada tarefa traz todos os campos do contrato', async () => {
      const t = await criarTarefa({
        titulo: 'Completa',
        descricao: 'Com descrição',
        divisao: 'conteudo',
        responsavelId: ctx.colabA.id_usuario,
        vencimento: '2099-12-31',
      });

      const body = esperar(await env.api.get('/tarefas', ctx.token.admin), 200);
      const lida = body.dados.find((x) => x.id_tarefa === t.id_tarefa);

      assert.equal(lida.projeto_id, null);
      assert.equal(lida.responsavel_id, ctx.colabA.id_usuario);
      assert.equal(lida.criador_id, ctx.admin.id_usuario);
      assert.equal(lida.titulo, 'Completa');
      assert.equal(lida.descricao, 'Com descrição');
      assert.equal(lida.divisao, 'conteudo');
      assert.equal(lida.kanban_status, 'a_fazer');
      assert.equal(lida.vencimento, '2099-12-31');
      assert.equal(lida.atrasada, false);
      assert.ok(lida.criado_em);
      assert.ok(lida.atualizado_em);
    });

    it('RN01/RN02 · colaborador só vê tarefas atribuídas a ele ou criadas por ele', async () => {
      const atribuidaAA = await criarTarefa({ responsavelId: ctx.colabA.id_usuario });
      const criadaPorA = await criarTarefa({ criadorId: ctx.colabA.id_usuario });
      await criarTarefa({ responsavelId: ctx.colabB.id_usuario });
      await criarTarefa({ criadorId: ctx.colabB.id_usuario });
      await criarTarefa({ titulo: 'Sem dono' });

      const doA = esperar(await env.api.get('/tarefas', ctx.token.colabA), 200);

      assert.deepEqual(ids(doA.dados), [atribuidaAA.id_tarefa, criadaPorA.id_tarefa].sort((a, b) => a - b));
      assert.equal(doA.paginacao.total, 2);
    });

    it('RN02 · a tarefa criada por um colaborador só aparece para ele e para o administrador', async () => {
      const criadaPorB = await criarTarefa({ criadorId: ctx.colabB.id_usuario });

      const paraA = esperar(await env.api.get('/tarefas', ctx.token.colabA), 200);
      const paraB = esperar(await env.api.get('/tarefas', ctx.token.colabB), 200);
      const paraAdmin = esperar(await env.api.get('/tarefas', ctx.token.admin), 200);

      assert.ok(!ids(paraA.dados).includes(criadaPorB.id_tarefa));
      assert.ok(ids(paraB.dados).includes(criadaPorB.id_tarefa));
      assert.ok(ids(paraAdmin.dados).includes(criadaPorB.id_tarefa));
    });

    it('200 · filtros por projeto_id, divisao, responsavel_id e kanban_status', async () => {
      const projeto = await criarProjeto();
      const outro = await criarProjeto();
      const porDivisao = await tarefasPorDivisao(projeto.id_projeto);
      const comResp = await criarTarefa({ responsavelId: ctx.colabA.id_usuario, divisao: 'trafego', status: 'em_andamento' });

      const doProjeto = esperar(await env.api.get(`/tarefas?projeto_id=${projeto.id_projeto}`, ctx.token.admin), 200);
      assert.equal(doProjeto.dados.length, 4);
      assert.ok(doProjeto.dados.every((t) => t.projeto_id === projeto.id_projeto));
      assert.ok(!doProjeto.dados.some((t) => t.projeto_id === outro.id_projeto));

      const porDiv = esperar(
        await env.api.get(`/tarefas?projeto_id=${projeto.id_projeto}&divisao=conteudo`, ctx.token.admin),
        200
      );
      assert.deepEqual(ids(porDiv.dados), [porDivisao.conteudo.id_tarefa]);

      const porResp = esperar(await env.api.get(`/tarefas?responsavel_id=${ctx.colabA.id_usuario}`, ctx.token.admin), 200);
      assert.deepEqual(ids(porResp.dados), [comResp.id_tarefa]);

      const porStatus = esperar(await env.api.get('/tarefas?kanban_status=em_andamento', ctx.token.admin), 200);
      assert.deepEqual(ids(porStatus.dados), [comResp.id_tarefa]);
    });

    it('200 · pagina os resultados', async () => {
      for (let i = 0; i < 3; i++) await criarTarefa();

      const pagina2 = esperar(await env.api.get('/tarefas?pagina=2&tamanho_pagina=2', ctx.token.admin), 200);

      assert.equal(pagina2.dados.length, 1);
      assert.deepEqual(pagina2.paginacao, { pagina: 2, tamanho_pagina: 2, total: 3 });
    });

    it('401 · sem token', async () => {
      esperar(await env.api.get('/tarefas'), 401);
    });
  });

  /* ---------------------------------------------------------------- */
  describe('POST /tarefas (RF21, RF23, RN03)', () => {
    it('201 · administrador cria tarefa dentro de um projeto, já com responsável', async () => {
      const projeto = await criarProjeto();

      const criada = esperar(
        await env.api.post(
          '/tarefas',
          {
            projeto_id: projeto.id_projeto,
            responsavel_id: ctx.colabA.id_usuario,
            titulo: 'Revisar copy da página',
            descricao: 'Conferir CTA e garantia',
            divisao: 'conteudo',
            vencimento: '2099-06-30',
          },
          ctx.token.admin
        ),
        201
      );

      assert.ok(Number.isInteger(criada.id_tarefa));
      assert.equal(criada.projeto_id, projeto.id_projeto);
      assert.equal(criada.responsavel_id, ctx.colabA.id_usuario);
      assert.equal(criada.criador_id, ctx.admin.id_usuario);
      assert.equal(criada.titulo, 'Revisar copy da página');
      assert.equal(criada.descricao, 'Conferir CTA e garantia');
      assert.equal(criada.divisao, 'conteudo');
      assert.equal(criada.kanban_status, 'a_fazer');
      assert.equal(criada.vencimento, '2099-06-30');
      assert.equal(criada.atrasada, false);
    });

    it('201 · RF23 — tarefa avulsa (sem projeto_id)', async () => {
      const criada = esperar(
        await env.api.post('/tarefas', { titulo: 'Ligar para o fornecedor', divisao: 'produto' }, ctx.token.admin),
        201
      );

      assert.equal(criada.projeto_id, null);
      assert.equal(criada.responsavel_id, null);
      assert.equal(criada.vencimento, null);
      assert.equal(criada.kanban_status, 'a_fazer');
    });

    it('201 · colaborador cria a própria tarefa; ele e o admin enxergam, o outro colaborador não', async () => {
      const criada = esperar(
        await env.api.post('/tarefas', { titulo: 'Minha anotação', divisao: 'disparos' }, ctx.token.colabA),
        201
      );

      assert.equal(criada.criador_id, ctx.colabA.id_usuario);

      esperar(await env.api.get(`/tarefas/${criada.id_tarefa}`, ctx.token.colabA), 200);
      esperar(await env.api.get(`/tarefas/${criada.id_tarefa}`, ctx.token.admin), 200);
      esperar(await env.api.get(`/tarefas/${criada.id_tarefa}`, ctx.token.colabB), 403);
    });

    it('201 · tarefa criada com prazo vencido já nasce marcada como atrasada', async () => {
      const ontem = await dataRelativa(-1);

      const criada = esperar(
        await env.api.post('/tarefas', { titulo: 'Já nasceu atrasada', divisao: 'produto', vencimento: ontem }, ctx.token.admin),
        201
      );

      assert.equal(criada.atrasada, true);
    });

    it('403 · RN03 — responsável precisa ser colaborador (administrador é recusado)', async () => {
      const res = await env.api.post(
        '/tarefas',
        { titulo: 'X', divisao: 'produto', responsavel_id: ctx.admin.id_usuario },
        ctx.token.admin
      );

      esperar(res, 403);
    });

    it('400 · título ausente ou divisão inválida', async () => {
      esperar(await env.api.post('/tarefas', { divisao: 'produto' }, ctx.token.admin), 400);
      esperar(await env.api.post('/tarefas', { titulo: 'X' }, ctx.token.admin), 400);
      esperar(await env.api.post('/tarefas', { titulo: 'X', divisao: 'financeiro' }, ctx.token.admin), 400);
    });

    it('401 · sem token', async () => {
      esperar(await env.api.post('/tarefas', { titulo: 'X', divisao: 'produto' }), 401);
    });
  });

  /* ---------------------------------------------------------------- */
  describe('GET /tarefas/atrasadas (RF27)', () => {
    it('200 · devolve só tarefas com prazo vencido e ainda não concluídas', async () => {
      const ontem = await dataRelativa(-1);
      const amanha = await dataRelativa(1);

      const atrasada = await criarTarefa({ titulo: 'Atrasada', vencimento: ontem });
      const emAndamento = await criarTarefa({ titulo: 'Atrasada em andamento', vencimento: ontem, status: 'em_andamento' });
      await criarTarefa({ titulo: 'Atrasada mas concluída', vencimento: ontem, status: 'concluido' });
      await criarTarefa({ titulo: 'No prazo', vencimento: amanha });
      await criarTarefa({ titulo: 'Sem prazo' });

      const lista = esperar(await env.api.get('/tarefas/atrasadas', ctx.token.admin), 200);

      assert.deepEqual(ids(lista), [atrasada.id_tarefa, emAndamento.id_tarefa].sort((a, b) => a - b));
      assert.ok(lista.every((t) => t.atrasada === true));
    });

    it('200 · lista vazia quando não há atrasos', async () => {
      await criarTarefa({ vencimento: await dataRelativa(5) });

      assert.deepEqual(esperar(await env.api.get('/tarefas/atrasadas', ctx.token.admin), 200), []);
    });

    it('200 · RN01 — colaborador só enxerga as atrasadas que são dele', async () => {
      const ontem = await dataRelativa(-1);
      const minha = await criarTarefa({ vencimento: ontem, responsavelId: ctx.colabA.id_usuario });
      await criarTarefa({ vencimento: ontem, responsavelId: ctx.colabB.id_usuario });
      await criarTarefa({ vencimento: ontem });

      const lista = esperar(await env.api.get('/tarefas/atrasadas', ctx.token.colabA), 200);

      assert.deepEqual(ids(lista), [minha.id_tarefa]);
    });

    it('401 · sem token', async () => {
      esperar(await env.api.get('/tarefas/atrasadas'), 401);
    });
  });

  /* ---------------------------------------------------------------- */
  describe('GET /tarefas/{id} (RN01, RN02)', () => {
    it('200 · administrador vê qualquer tarefa', async () => {
      const t = await criarTarefa({ criadorId: ctx.colabB.id_usuario, titulo: 'Do B' });

      const body = esperar(await env.api.get(`/tarefas/${t.id_tarefa}`, ctx.token.admin), 200);

      assert.equal(body.id_tarefa, t.id_tarefa);
      assert.equal(body.titulo, 'Do B');
    });

    it('200 · o responsável vê a tarefa atribuída a ele', async () => {
      const t = await criarTarefa({ responsavelId: ctx.colabA.id_usuario });

      esperar(await env.api.get(`/tarefas/${t.id_tarefa}`, ctx.token.colabA), 200);
    });

    it('200 · o criador vê a tarefa que ele mesmo criou', async () => {
      const t = await criarTarefa({ criadorId: ctx.colabA.id_usuario });

      esperar(await env.api.get(`/tarefas/${t.id_tarefa}`, ctx.token.colabA), 200);
    });

    it('403 · colaborador sem relação com a tarefa não a enxerga', async () => {
      const t = await criarTarefa({ responsavelId: ctx.colabB.id_usuario });

      esperar(await env.api.get(`/tarefas/${t.id_tarefa}`, ctx.token.colabA), 403);
    });

    it('404 · tarefa inexistente', async () => {
      esperar(await env.api.get('/tarefas/999999', ctx.token.admin), 404);
    });

    it('401 · sem token', async () => {
      esperar(await env.api.get('/tarefas/1'), 401);
    });
  });

  /* ---------------------------------------------------------------- */
  describe('PATCH /tarefas/{id} (RF21)', () => {
    it('200 · edita título, descrição, divisão e prazo', async () => {
      const t = await criarTarefa({ titulo: 'Antes', divisao: 'produto' });

      const editada = esperar(
        await env.api.patch(
          `/tarefas/${t.id_tarefa}`,
          { titulo: 'Depois', descricao: 'Agora com detalhes', divisao: 'trafego', vencimento: '2099-01-15' },
          ctx.token.admin
        ),
        200
      );

      assert.equal(editada.titulo, 'Depois');
      assert.equal(editada.descricao, 'Agora com detalhes');
      assert.equal(editada.divisao, 'trafego');
      assert.equal(editada.vencimento, '2099-01-15');
    });

    it('200 · atualização parcial mantém o restante e atualiza atualizado_em', async () => {
      const t = await criarTarefa({ titulo: 'Original', divisao: 'conteudo' });

      const editada = esperar(await env.api.patch(`/tarefas/${t.id_tarefa}`, { titulo: 'Só o título' }, ctx.token.admin), 200);

      assert.equal(editada.titulo, 'Só o título');
      assert.equal(editada.divisao, 'conteudo');
      assert.ok(new Date(editada.atualizado_em) >= new Date(t.atualizado_em));
    });

    it('200 · permite limpar o prazo (vencimento: null)', async () => {
      const t = await criarTarefa({ vencimento: '2099-01-01' });

      const editada = esperar(await env.api.patch(`/tarefas/${t.id_tarefa}`, { vencimento: null }, ctx.token.admin), 200);

      assert.equal(editada.vencimento, null);
    });

    it('200 · o criador colaborador edita a própria tarefa', async () => {
      const t = await criarTarefa({ criadorId: ctx.colabA.id_usuario });

      esperar(await env.api.patch(`/tarefas/${t.id_tarefa}`, { titulo: 'Editada por mim' }, ctx.token.colabA), 200);
    });

    it('200 · não troca responsável nem coluna por esta rota (existem rotas próprias)', async () => {
      const t = await criarTarefa({ responsavelId: ctx.colabA.id_usuario });

      const editada = esperar(
        await env.api.patch(
          `/tarefas/${t.id_tarefa}`,
          { titulo: 'X', responsavel_id: ctx.colabB.id_usuario, kanban_status: 'concluido' },
          ctx.token.admin
        ),
        200
      );

      assert.equal(editada.responsavel_id, ctx.colabA.id_usuario);
      assert.equal(editada.kanban_status, 'a_fazer');
    });

    it('400 · divisão inválida', async () => {
      const t = await criarTarefa();

      esperar(await env.api.patch(`/tarefas/${t.id_tarefa}`, { divisao: 'inexistente' }, ctx.token.admin), 400);
    });

    it('403 · colaborador sem relação com a tarefa não pode editá-la', async () => {
      const t = await criarTarefa({ responsavelId: ctx.colabB.id_usuario });

      esperar(await env.api.patch(`/tarefas/${t.id_tarefa}`, { titulo: 'Invasão' }, ctx.token.colabA), 403);
    });

    it('404 · tarefa inexistente', async () => {
      esperar(await env.api.patch('/tarefas/999999', { titulo: 'X' }, ctx.token.admin), 404);
    });

    it('401 · sem token', async () => {
      esperar(await env.api.patch('/tarefas/1', { titulo: 'X' }), 401);
    });
  });

  /* ---------------------------------------------------------------- */
  describe('DELETE /tarefas/{id} (RF26)', () => {
    it('204 · administrador exclui a tarefa; ela some e o progresso do projeto se ajusta', async () => {
      const projeto = await criarProjeto();
      const porDivisao = await tarefasPorDivisao(projeto.id_projeto);

      const res = await env.api.delete(`/tarefas/${porDivisao.produto.id_tarefa}`, ctx.token.admin);
      assert.equal(res.status, 204);
      assert.equal(res.texto, '');

      esperar(await env.api.get(`/tarefas/${porDivisao.produto.id_tarefa}`, ctx.token.admin), 404);

      const progresso = esperar(await env.api.get(`/projetos/${projeto.id_projeto}/progresso`, ctx.token.admin), 200);
      assert.equal(progresso.total_tarefas, 3);
    });

    it('403 · colaborador não pode excluir, nem a que ele mesmo criou', async () => {
      const t = await criarTarefa({ criadorId: ctx.colabA.id_usuario, responsavelId: ctx.colabA.id_usuario });

      esperar(await env.api.delete(`/tarefas/${t.id_tarefa}`, ctx.token.colabA), 403);

      esperar(await env.api.get(`/tarefas/${t.id_tarefa}`, ctx.token.admin), 200);
    });

    it('401 · sem token', async () => {
      esperar(await env.api.delete('/tarefas/1'), 401);
    });
  });

  /* ---------------------------------------------------------------- */
  describe('PATCH /tarefas/{id}/responsavel (RF22, RN03)', () => {
    it('200 · administrador atribui a tarefa a um colaborador', async () => {
      const t = await criarTarefa();

      const body = esperar(
        await env.api.patch(`/tarefas/${t.id_tarefa}/responsavel`, { responsavel_id: ctx.colabA.id_usuario }, ctx.token.admin),
        200
      );

      assert.equal(body.id_tarefa, t.id_tarefa);
      assert.equal(body.responsavel_id, ctx.colabA.id_usuario);

      const doColab = esperar(await env.api.get('/tarefas', ctx.token.colabA), 200);
      assert.deepEqual(ids(doColab.dados), [t.id_tarefa]);
    });

    it('200 · reatribui: a tarefa sai da lista do antigo responsável e vai para a do novo', async () => {
      const t = await criarTarefa({ responsavelId: ctx.colabA.id_usuario });

      esperar(
        await env.api.patch(`/tarefas/${t.id_tarefa}/responsavel`, { responsavel_id: ctx.colabB.id_usuario }, ctx.token.admin),
        200
      );

      const paraA = esperar(await env.api.get('/tarefas', ctx.token.colabA), 200);
      const paraB = esperar(await env.api.get('/tarefas', ctx.token.colabB), 200);
      assert.equal(paraA.dados.length, 0);
      assert.deepEqual(ids(paraB.dados), [t.id_tarefa]);
    });

    it('403 · RN03 — não aceita administrador como responsável', async () => {
      const t = await criarTarefa();

      esperar(
        await env.api.patch(`/tarefas/${t.id_tarefa}/responsavel`, { responsavel_id: ctx.admin.id_usuario }, ctx.token.admin),
        403
      );
    });

    it('403 · colaborador não pode atribuir tarefas', async () => {
      const t = await criarTarefa({ criadorId: ctx.colabA.id_usuario });

      esperar(
        await env.api.patch(`/tarefas/${t.id_tarefa}/responsavel`, { responsavel_id: ctx.colabB.id_usuario }, ctx.token.colabA),
        403
      );
    });

    it('409 · usuário indicado está inativo', async () => {
      const inativo = await criarUsuario({ status: 'inativo' });
      const t = await criarTarefa();

      esperar(
        await env.api.patch(`/tarefas/${t.id_tarefa}/responsavel`, { responsavel_id: inativo.id_usuario }, ctx.token.admin),
        409
      );
    });

    it('400 · responsavel_id ausente ou que não é número', async () => {
      const t = await criarTarefa();

      esperar(await env.api.patch(`/tarefas/${t.id_tarefa}/responsavel`, {}, ctx.token.admin), 400);
      esperar(await env.api.patch(`/tarefas/${t.id_tarefa}/responsavel`, { responsavel_id: 'abc' }, ctx.token.admin), 400);
    });

    it('401 · sem token', async () => {
      esperar(await env.api.patch('/tarefas/1/responsavel', { responsavel_id: 2 }), 401);
    });
  });
});

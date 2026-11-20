import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  iniciarAmbiente,
  esperar,
  ids,
  ordenar,
  criarProjeto,
  criarTarefa,
  tarefasPorDivisao,
  atribuirTarefa,
  definirStatus,
  dataRelativa,
} from '../../helpers/e2e.js';

describe('E2E · Kanban', () => {
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

  /** Cenário com 1 projeto (4 tarefas) e tarefas distribuídas entre os dois colaboradores. */
  async function cenario() {
    const projeto = await criarProjeto();
    const t = await tarefasPorDivisao(projeto.id_projeto);

    await atribuirTarefa(t.produto.id_tarefa, ctx.colabA.id_usuario);
    await atribuirTarefa(t.conteudo.id_tarefa, ctx.colabA.id_usuario);
    await atribuirTarefa(t.trafego.id_tarefa, ctx.colabB.id_usuario);
    // t.disparos fica sem responsável

    const avulsaDeA = await criarTarefa({ criadorId: ctx.colabA.id_usuario, divisao: 'disparos', titulo: 'Avulsa de A' });
    const avulsaDeB = await criarTarefa({ criadorId: ctx.colabB.id_usuario, titulo: 'Avulsa de B' });

    return { projeto, t, avulsaDeA, avulsaDeB };
  }

  /* ---------------------------------------------------------------- */
  describe('GET /usuarios/me/kanban (RF30)', () => {
    it('200 · colaborador vê as tarefas atribuídas a ele e as criadas por ele', async () => {
      const { t, avulsaDeA } = await cenario();

      const lista = esperar(await env.api.get('/usuarios/me/kanban', ctx.token.colabA), 200);

      assert.ok(Array.isArray(lista));
      assert.deepEqual(ids(lista), ordenar(t.produto.id_tarefa, t.conteudo.id_tarefa, avulsaDeA.id_tarefa));
    });

    it('200 · não mostra tarefas de outros colaboradores', async () => {
      const { t, avulsaDeB } = await cenario();

      const lista = esperar(await env.api.get('/usuarios/me/kanban', ctx.token.colabA), 200);

      assert.ok(!ids(lista).includes(t.trafego.id_tarefa));
      assert.ok(!ids(lista).includes(avulsaDeB.id_tarefa));
    });

    it('200 · cada item traz os campos do contrato (incluindo "atrasada")', async () => {
      const ontem = await dataRelativa(-1);
      await criarTarefa({ responsavelId: ctx.colabA.id_usuario, vencimento: ontem, titulo: 'Em atraso' });

      const [item] = esperar(await env.api.get('/usuarios/me/kanban', ctx.token.colabA), 200);

      assert.ok(Number.isInteger(item.id_tarefa));
      assert.equal(item.titulo, 'Em atraso');
      assert.ok(['produto', 'conteudo', 'trafego', 'disparos'].includes(item.divisao));
      assert.equal(item.kanban_status, 'a_fazer');
      assert.equal(item.vencimento, ontem);
      assert.equal(item.atrasada, true);
    });

    it('200 · filtra por divisao e por kanban_status', async () => {
      const { t, avulsaDeA } = await cenario();
      await definirStatus(t.produto.id_tarefa, 'em_andamento');

      const porDivisao = esperar(await env.api.get('/usuarios/me/kanban?divisao=disparos', ctx.token.colabA), 200);
      assert.deepEqual(ids(porDivisao), [avulsaDeA.id_tarefa]);

      const porStatus = esperar(await env.api.get('/usuarios/me/kanban?kanban_status=em_andamento', ctx.token.colabA), 200);
      assert.deepEqual(ids(porStatus), [t.produto.id_tarefa]);
    });

    it('200 · lista vazia para quem não tem tarefas', async () => {
      assert.deepEqual(esperar(await env.api.get('/usuarios/me/kanban', ctx.token.colabB), 200), []);
    });

    it('401 · sem token', async () => {
      esperar(await env.api.get('/usuarios/me/kanban'), 401);
    });
  });

  /* ---------------------------------------------------------------- */
  describe('GET /usuarios/{id}/kanban (RF31)', () => {
    it('200 · administrador vê o kanban de qualquer colaborador', async () => {
      const { t, avulsaDeB } = await cenario();

      const doB = esperar(await env.api.get(`/usuarios/${ctx.colabB.id_usuario}/kanban`, ctx.token.admin), 200);

      assert.deepEqual(ids(doB), ordenar(t.trafego.id_tarefa, avulsaDeB.id_tarefa));
    });

    it('200 · aceita os mesmos filtros do kanban individual', async () => {
      const { t } = await cenario();
      await definirStatus(t.conteudo.id_tarefa, 'em_revisao');

      const porStatus = esperar(
        await env.api.get(`/usuarios/${ctx.colabA.id_usuario}/kanban?kanban_status=em_revisao`, ctx.token.admin),
        200
      );
      assert.deepEqual(ids(porStatus), [t.conteudo.id_tarefa]);

      const porDivisao = esperar(
        await env.api.get(`/usuarios/${ctx.colabA.id_usuario}/kanban?divisao=produto`, ctx.token.admin),
        200
      );
      assert.deepEqual(ids(porDivisao), [t.produto.id_tarefa]);
    });

    it('403 · colaborador não pode ver o kanban de outro colaborador', async () => {
      esperar(await env.api.get(`/usuarios/${ctx.colabB.id_usuario}/kanban`, ctx.token.colabA), 403);
    });

    it('403 · nem o próprio colaborador usa esta rota (ele tem /usuarios/me/kanban)', async () => {
      esperar(await env.api.get(`/usuarios/${ctx.colabA.id_usuario}/kanban`, ctx.token.colabA), 403);
    });

    it('401 · sem token', async () => {
      esperar(await env.api.get(`/usuarios/${ctx.colabA.id_usuario}/kanban`), 401);
    });
  });

  /* ---------------------------------------------------------------- */
  describe('GET /projetos/{id}/kanban (RF20)', () => {
    it('200 · administrador vê todas as tarefas do projeto, e só as dele', async () => {
      const { projeto, t } = await cenario();
      const outroProjeto = await criarProjeto();

      const lista = esperar(await env.api.get(`/projetos/${projeto.id_projeto}/kanban`, ctx.token.admin), 200);

      assert.deepEqual(
        ids(lista),
        ordenar(t.produto.id_tarefa, t.conteudo.id_tarefa, t.trafego.id_tarefa, t.disparos.id_tarefa)
      );
      assert.ok(lista.every((x) => x.projeto_id === projeto.id_projeto));
      assert.ok(!lista.some((x) => x.projeto_id === outroProjeto.id_projeto));
    });

    it('200 · filtra por divisao', async () => {
      const { projeto, t } = await cenario();

      const lista = esperar(await env.api.get(`/projetos/${projeto.id_projeto}/kanban?divisao=trafego`, ctx.token.admin), 200);

      assert.deepEqual(ids(lista), [t.trafego.id_tarefa]);
    });

    it('200 · filtra por responsavel_id', async () => {
      const { projeto, t } = await cenario();

      const lista = esperar(
        await env.api.get(`/projetos/${projeto.id_projeto}/kanban?responsavel_id=${ctx.colabA.id_usuario}`, ctx.token.admin),
        200
      );

      assert.deepEqual(ids(lista), ordenar(t.produto.id_tarefa, t.conteudo.id_tarefa));
    });

    it('200 · filtra por kanban_status', async () => {
      const { projeto, t } = await cenario();
      await definirStatus(t.disparos.id_tarefa, 'concluido');

      const lista = esperar(
        await env.api.get(`/projetos/${projeto.id_projeto}/kanban?kanban_status=concluido`, ctx.token.admin),
        200
      );

      assert.deepEqual(ids(lista), [t.disparos.id_tarefa]);
    });

    it('200 · combina filtros', async () => {
      const { projeto, t } = await cenario();

      const lista = esperar(
        await env.api.get(
          `/projetos/${projeto.id_projeto}/kanban?divisao=conteudo&responsavel_id=${ctx.colabA.id_usuario}`,
          ctx.token.admin
        ),
        200
      );

      assert.deepEqual(ids(lista), [t.conteudo.id_tarefa]);
    });

    it('403 · colaborador não acessa o kanban completo do projeto', async () => {
      const { projeto } = await cenario();

      esperar(await env.api.get(`/projetos/${projeto.id_projeto}/kanban`, ctx.token.colabA), 403);
    });

    it('401 · sem token', async () => {
      esperar(await env.api.get('/projetos/1/kanban'), 401);
    });
  });

  /* ---------------------------------------------------------------- */
  describe('PATCH /tarefas/{id}/status (RF24, RF29)', () => {
    it('200 · o responsável move a própria tarefa por todas as colunas', async () => {
      const tarefa = await criarTarefa({ responsavelId: ctx.colabA.id_usuario });

      for (const coluna of ['em_andamento', 'em_revisao', 'concluido', 'a_fazer']) {
        const body = esperar(
          await env.api.patch(`/tarefas/${tarefa.id_tarefa}/status`, { kanban_status: coluna }, ctx.token.colabA),
          200
        );

        assert.equal(body.id_tarefa, tarefa.id_tarefa);
        assert.equal(body.kanban_status, coluna);
      }
    });

    it('200 · a mudança persiste e aparece no Kanban', async () => {
      const tarefa = await criarTarefa({ responsavelId: ctx.colabA.id_usuario });

      await env.api.patch(`/tarefas/${tarefa.id_tarefa}/status`, { kanban_status: 'em_revisao' }, ctx.token.colabA);

      const filtrado = esperar(await env.api.get('/usuarios/me/kanban?kanban_status=em_revisao', ctx.token.colabA), 200);
      assert.deepEqual(ids(filtrado), [tarefa.id_tarefa]);

      const lida = esperar(await env.api.get(`/tarefas/${tarefa.id_tarefa}`, ctx.token.colabA), 200);
      assert.equal(lida.kanban_status, 'em_revisao');
    });

    it('200 · administrador move qualquer tarefa, inclusive a que não tem responsável', async () => {
      const tarefa = await criarTarefa();

      const body = esperar(
        await env.api.patch(`/tarefas/${tarefa.id_tarefa}/status`, { kanban_status: 'em_andamento' }, ctx.token.admin),
        200
      );

      assert.equal(body.kanban_status, 'em_andamento');
    });

    it('200 · tarefa atrasada deixa de ser "atrasada" ao ser concluída', async () => {
      const ontem = await dataRelativa(-1);
      const tarefa = await criarTarefa({ responsavelId: ctx.colabA.id_usuario, vencimento: ontem });

      const antes = esperar(await env.api.get(`/tarefas/${tarefa.id_tarefa}`, ctx.token.colabA), 200);
      assert.equal(antes.atrasada, true);

      const depois = esperar(
        await env.api.patch(`/tarefas/${tarefa.id_tarefa}/status`, { kanban_status: 'concluido' }, ctx.token.colabA),
        200
      );
      assert.equal(depois.atrasada, false);
    });

    it('200 · concluir as tarefas move o progresso do projeto', async () => {
      const projeto = await criarProjeto();
      const t = await tarefasPorDivisao(projeto.id_projeto);

      esperar(
        await env.api.patch(`/tarefas/${t.produto.id_tarefa}/status`, { kanban_status: 'concluido' }, ctx.token.admin),
        200
      );

      const progresso = esperar(await env.api.get(`/projetos/${projeto.id_projeto}/progresso`, ctx.token.admin), 200);
      assert.equal(progresso.tarefas_concluidas, 1);
      assert.equal(progresso.percentual_concluido, 25);
    });

    it('403 · colaborador que não é o responsável não pode mover (nem sendo o criador)', async () => {
      const tarefa = await criarTarefa({ criadorId: ctx.colabA.id_usuario, responsavelId: ctx.colabB.id_usuario });

      esperar(
        await env.api.patch(`/tarefas/${tarefa.id_tarefa}/status`, { kanban_status: 'concluido' }, ctx.token.colabA),
        403
      );

      const lida = esperar(await env.api.get(`/tarefas/${tarefa.id_tarefa}`, ctx.token.admin), 200);
      assert.equal(lida.kanban_status, 'a_fazer');
    });

    it('403 · colaborador não move tarefa que ainda não tem responsável', async () => {
      const tarefa = await criarTarefa();

      esperar(
        await env.api.patch(`/tarefas/${tarefa.id_tarefa}/status`, { kanban_status: 'em_andamento' }, ctx.token.colabA),
        403
      );
    });

    it('400 · coluna inexistente ou campo ausente', async () => {
      const tarefa = await criarTarefa({ responsavelId: ctx.colabA.id_usuario });

      esperar(await env.api.patch(`/tarefas/${tarefa.id_tarefa}/status`, { kanban_status: 'arquivado' }, ctx.token.colabA), 400);
      esperar(await env.api.patch(`/tarefas/${tarefa.id_tarefa}/status`, {}, ctx.token.colabA), 400);
    });

    it('401 · sem token', async () => {
      esperar(await env.api.patch('/tarefas/1/status', { kanban_status: 'concluido' }), 401);
    });
  });
});

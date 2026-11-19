import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  iniciarAmbiente, esperar, consultar, criarCliente, criarModelo, criarProjeto,
  criarTarefa, concluirTodasAsTarefas, tarefasPorDivisao, TAREFAS_DO_MODELO_PADRAO,
} from '../../helpers/e2e.js';

describe('Decisões do cliente', () => {
  let env;
  let ctx;
  before(async () => { env = await iniciarAmbiente(); });
  after(async () => { await env?.encerrar(); });
  beforeEach(async () => { ctx = await env.preparar(); });

  it('limita projetos e clientes ao vínculo do colaborador e omite contatos', async () => {
    const cliente = await criarCliente();
    const projeto = await criarProjeto({ clienteId: cliente.id_cliente });
    const outro = await criarProjeto();
    await criarTarefa({ projetoId: projeto.id_projeto, responsavelId: ctx.colabA.id_usuario });

    const projetos = esperar(await env.api.get('/projetos', ctx.token.colabA), 200);
    assert.deepEqual(projetos.dados.map((p) => p.id_projeto), [projeto.id_projeto]);
    assert.equal(projetos.paginacao.total, 1);
    esperar(await env.api.get(`/projetos/${outro.id_projeto}`, ctx.token.colabA), 403);
    esperar(await env.api.get(`/projetos/${outro.id_projeto}/progresso`, ctx.token.colabA), 403);

    const clientes = esperar(await env.api.get('/clientes?status=ativa', ctx.token.colabA), 200);
    assert.deepEqual(clientes.dados.map((c) => c.id_cliente), [cliente.id_cliente]);
    assert.equal(clientes.paginacao.total, 1);
    assert.equal('contato' in clientes.dados[0], false);
    const detalhe = esperar(await env.api.get(`/clientes/${cliente.id_cliente}`, ctx.token.colabA), 200);
    assert.equal('contato' in detalhe, false);
    esperar(await env.api.get(`/clientes/${outro.cliente_id}`, ctx.token.colabA), 403);
    const completo = esperar(await env.api.get(`/clientes/${cliente.id_cliente}`, ctx.token.admin), 200);
    assert.ok(completo.contato);
  });

  it('exige vínculo para criar tarefa dentro de projeto e mantém tarefa avulsa', async () => {
    const projeto = await criarProjeto();
    const entrada = { projeto_id: projeto.id_projeto, titulo: 'Ajustar página', divisao: 'produto' };
    esperar(await env.api.post('/tarefas', entrada, ctx.token.colabA), 403);
    await criarTarefa({ projetoId: projeto.id_projeto, responsavelId: ctx.colabA.id_usuario });
    esperar(await env.api.post('/tarefas', entrada, ctx.token.colabA), 201);
    esperar(await env.api.post('/tarefas', { titulo: 'Pessoal', divisao: 'conteudo' }, ctx.token.colabB), 201);
  });

  it('reserva todas as consultas de modelos ao administrador e bloqueia modelo retirado em novos projetos', async () => {
    const modelo = await criarModelo();
    const cliente = await criarCliente();
    for (const path of ['/modelos-lancamento', `/modelos-lancamento/${modelo.id_modelo_lancamento}`, `/modelos-lancamento/${modelo.id_modelo_lancamento}/tarefas-padrao`]) {
      esperar(await env.api.get(path, ctx.token.colabA), 403);
    }
    assert.equal((await env.api.delete(`/modelos-lancamento/${modelo.id_modelo_lancamento}`, ctx.token.admin)).status, 204);
    esperar(await env.api.post('/projetos', {
      cliente_id: cliente.id_cliente, modelo_lancamento_id: modelo.id_modelo_lancamento,
      nome: 'Novo projeto', data_comeco: '2026-11-01', data_final: '2026-12-01',
    }, ctx.token.admin), 409);
    assert.equal(esperar(await env.api.get('/modelos-lancamento?status=inativo', ctx.token.admin), 200).length, 1);
  });

  it('reabre projeto concluído ao adicionar tarefa e preserva projeto cancelado', async () => {
    const modelo = await criarModelo();
    const projeto = await criarProjeto({ modeloId: modelo.id_modelo_lancamento });
    esperar(await env.api.patch(`/projetos/${projeto.id_projeto}/status`, { status: 'concluido' }, ctx.token.admin), 200);
    const entrada = { projeto_id: projeto.id_projeto, titulo: 'Pós-lançamento', divisao: 'produto' };
    esperar(await env.api.post('/tarefas', entrada, ctx.token.admin), 201);
    assert.equal(esperar(await env.api.get(`/projetos/${projeto.id_projeto}`, ctx.token.admin), 200).status, 'andamento');
    esperar(await env.api.patch(`/projetos/${projeto.id_projeto}/status`, { status: 'cancelado' }, ctx.token.admin), 200);
    esperar(await env.api.post('/tarefas', entrada, ctx.token.admin), 201);
    assert.equal(esperar(await env.api.get(`/projetos/${projeto.id_projeto}`, ctx.token.admin), 200).status, 'cancelado');
  });

  it('reabre projeto concluído quando o responsável reabre uma tarefa', async () => {
    const modelo = await criarModelo({ tarefas: TAREFAS_DO_MODELO_PADRAO });
    const projeto = await criarProjeto({ modeloId: modelo.id_modelo_lancamento });
    const tarefas = await tarefasPorDivisao(projeto.id_projeto);
    const id = tarefas.produto.id_tarefa;
    esperar(await env.api.patch(`/tarefas/${id}/responsavel`, { responsavel_id: ctx.colabA.id_usuario }, ctx.token.admin), 200);
    await concluirTodasAsTarefas(projeto.id_projeto);
    esperar(await env.api.patch(`/projetos/${projeto.id_projeto}/status`, { status: 'concluido' }, ctx.token.admin), 200);
    esperar(await env.api.patch(`/tarefas/${id}/status`, { kanban_status: 'em_andamento' }, ctx.token.colabB), 403);
    assert.equal(esperar(await env.api.get(`/projetos/${projeto.id_projeto}`, ctx.token.admin), 200).status, 'concluido');
    esperar(await env.api.patch(`/tarefas/${id}/status`, { kanban_status: 'em_andamento' }, ctx.token.colabA), 200);
    assert.equal(esperar(await env.api.get(`/projetos/${projeto.id_projeto}`, ctx.token.admin), 200).status, 'andamento');
  });

  it('bloqueia a promoção de um colaborador até suas tarefas serem reatribuídas', async () => {
    const responsavelId = ctx.colabA.id_usuario;
    const tarefa = await criarTarefa({ responsavelId });
    const usuario = `/usuarios/${responsavelId}`;
    const promocao = { nivel_acesso: 'administrador' };

    esperar(await env.api.patch(usuario, promocao, ctx.token.admin), 409);
    await assert.rejects(
      consultar("UPDATE usuario SET nivel_acesso = 'administrador' WHERE id_usuario = $1", [responsavelId]),
      { code: '23514', constraint: 'chk_responsavel_colaborador' },
    );

    esperar(await env.api.patch(`/tarefas/${tarefa.id_tarefa}/responsavel`, {
      responsavel_id: ctx.colabB.id_usuario,
    }, ctx.token.admin), 200);
    assert.equal(esperar(await env.api.patch(usuario, promocao, ctx.token.admin), 200).nivel_acesso, 'administrador');
  });

  it('reabre projeto concluído ao inserir uma tarefa diretamente no banco', async () => {
    const modelo = await criarModelo();
    const { id_projeto: id } = await criarProjeto({ modeloId: modelo.id_modelo_lancamento });
    const projeto = `/projetos/${id}`;

    esperar(await env.api.patch(`${projeto}/status`, { status: 'concluido' }, ctx.token.admin), 200);
    await criarTarefa({ projetoId: id });
    assert.equal(esperar(await env.api.get(projeto, ctx.token.admin), 200).status, 'andamento');
  });
});

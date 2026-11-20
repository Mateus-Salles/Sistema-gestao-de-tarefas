import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  iniciarAmbiente,
  esperar,
  ids,
  criarUsuario,
  criarTarefa,
  consultar,
  SENHA_PADRAO,
} from '../../helpers/e2e.js';

describe('E2E · Usuários', () => {
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

  const novoUsuario = (extra = {}) => ({
    nome: 'Duda Designer',
    email: 'duda@forge.test',
    senha: 'SenhaForte#1',
    nivel_acesso: 'colaborador',
    ...extra,
  });

  /* ---------------------------------------------------------------- */
  describe('GET /usuarios (RF02)', () => {
    it('200 · administrador lista todos, com paginação padrão e sem expor hash', async () => {
      const body = esperar(await env.api.get('/usuarios', ctx.token.admin), 200);

      assert.deepEqual(ids(body.dados, 'id_usuario'), [
        ctx.admin.id_usuario,
        ctx.colabA.id_usuario,
        ctx.colabB.id_usuario,
      ]);
      assert.deepEqual(body.paginacao, { pagina: 1, tamanho_pagina: 20, total: 3 });

      for (const u of body.dados) {
        assert.equal('senha_hash' in u, false);
        assert.equal('senha' in u, false);
      }
    });

    it('200 · filtra por status', async () => {
      const inativo = await criarUsuario({ status: 'inativo' });

      const inativos = esperar(await env.api.get('/usuarios?status=inativo', ctx.token.admin), 200);
      assert.deepEqual(ids(inativos.dados, 'id_usuario'), [inativo.id_usuario]);

      const ativos = esperar(await env.api.get('/usuarios?status=ativo', ctx.token.admin), 200);
      assert.equal(ativos.dados.length, 3);
      assert.ok(ativos.dados.every((u) => u.status === 'ativo'));
    });

    it('200 · pagina os resultados', async () => {
      const pagina2 = esperar(await env.api.get('/usuarios?pagina=2&tamanho_pagina=2', ctx.token.admin), 200);

      assert.equal(pagina2.dados.length, 1);
      assert.deepEqual(pagina2.paginacao, { pagina: 2, tamanho_pagina: 2, total: 3 });
    });

    it('403 · colaborador não pode listar usuários', async () => {
      esperar(await env.api.get('/usuarios', ctx.token.colabA), 403);
    });

    it('401 · sem token', async () => {
      esperar(await env.api.get('/usuarios'), 401);
    });
  });

  /* ---------------------------------------------------------------- */
  describe('POST /usuarios (RF02)', () => {
    it('201 · administrador cadastra usuário e ele já consegue fazer login', async () => {
      const criado = esperar(await env.api.post('/usuarios', novoUsuario(), ctx.token.admin), 201);

      assert.ok(Number.isInteger(criado.id_usuario));
      assert.equal(criado.nome, 'Duda Designer');
      assert.equal(criado.email, 'duda@forge.test');
      assert.equal(criado.nivel_acesso, 'colaborador');
      assert.equal(criado.status, 'ativo');
      assert.ok(criado.criado_em);
      assert.equal('senha' in criado, false);
      assert.equal('senha_hash' in criado, false);

      esperar(await env.api.post('/auth/login', { email: 'duda@forge.test', senha: 'SenhaForte#1' }), 200);
    });

    it('201 · guarda apenas o hash da senha', async () => {
      const criado = esperar(await env.api.post('/usuarios', novoUsuario(), ctx.token.admin), 201);

      const [{ senha_hash }] = await consultar('SELECT senha_hash FROM usuario WHERE id_usuario = $1', [
        criado.id_usuario,
      ]);

      assert.notEqual(senha_hash, 'SenhaForte#1');
    });

    it('201 · permite criar outro administrador', async () => {
      const criado = esperar(
        await env.api.post('/usuarios', novoUsuario({ nivel_acesso: 'administrador' }), ctx.token.admin),
        201
      );

      assert.equal(criado.nivel_acesso, 'administrador');
    });

    it('409 · e-mail já cadastrado', async () => {
      esperar(await env.api.post('/usuarios', novoUsuario({ email: 'caio@forge.test' }), ctx.token.admin), 409);
    });

    it('400 · dados inválidos (e-mail, nível de acesso ou campos ausentes)', async () => {
      esperar(await env.api.post('/usuarios', novoUsuario({ email: 'sem-arroba' }), ctx.token.admin), 400);
      esperar(await env.api.post('/usuarios', novoUsuario({ nivel_acesso: 'dono' }), ctx.token.admin), 400);
      esperar(await env.api.post('/usuarios', { nome: 'Só o nome' }, ctx.token.admin), 400);
    });

    it('403 · colaborador não pode cadastrar usuários', async () => {
      esperar(await env.api.post('/usuarios', novoUsuario(), ctx.token.colabA), 403);
    });

    it('401 · sem token', async () => {
      esperar(await env.api.post('/usuarios', novoUsuario()), 401);
    });
  });

  /* ---------------------------------------------------------------- */
  describe('GET /usuarios/me (RF05)', () => {
    it('200 · colaborador recebe os próprios dados', async () => {
      const me = esperar(await env.api.get('/usuarios/me', ctx.token.colabA), 200);

      assert.equal(me.id_usuario, ctx.colabA.id_usuario);
      assert.equal(me.nivel_acesso, 'colaborador');
      assert.equal('senha_hash' in me, false);
    });

    it('200 · administrador recebe nível "administrador" (a UI usa isso para decidir o que exibir)', async () => {
      const me = esperar(await env.api.get('/usuarios/me', ctx.token.admin), 200);

      assert.equal(me.nivel_acesso, 'administrador');
    });

    it('401 · sem token', async () => {
      esperar(await env.api.get('/usuarios/me'), 401);
    });
  });

  /* ---------------------------------------------------------------- */
  describe('GET /usuarios/{id} (RF02)', () => {
    it('200 · administrador vê o detalhe de um usuário', async () => {
      const u = esperar(await env.api.get(`/usuarios/${ctx.colabA.id_usuario}`, ctx.token.admin), 200);

      assert.equal(u.id_usuario, ctx.colabA.id_usuario);
      assert.equal(u.email, 'caio@forge.test');
      assert.equal('senha_hash' in u, false);
    });

    it('404 · usuário inexistente', async () => {
      esperar(await env.api.get('/usuarios/999999', ctx.token.admin), 404);
    });

    it('401 · sem token', async () => {
      esperar(await env.api.get(`/usuarios/${ctx.colabA.id_usuario}`), 401);
    });
  });

  /* ---------------------------------------------------------------- */
  describe('PATCH /usuarios/{id} (RF02)', () => {
    it('200 · administrador edita nome, e-mail e nível; a mudança persiste', async () => {
      const id = ctx.colabA.id_usuario;

      const editado = esperar(
        await env.api.patch(
          `/usuarios/${id}`,
          { nome: 'Caio Renomeado', email: 'caio.novo@forge.test', nivel_acesso: 'administrador' },
          ctx.token.admin
        ),
        200
      );

      assert.equal(editado.nome, 'Caio Renomeado');
      assert.equal(editado.email, 'caio.novo@forge.test');
      assert.equal(editado.nivel_acesso, 'administrador');

      const lido = esperar(await env.api.get(`/usuarios/${id}`, ctx.token.admin), 200);
      assert.equal(lido.nome, 'Caio Renomeado');
    });

    it('200 · atualização parcial mantém os demais campos', async () => {
      const editado = esperar(
        await env.api.patch(`/usuarios/${ctx.colabA.id_usuario}`, { nome: 'Só o nome mudou' }, ctx.token.admin),
        200
      );

      assert.equal(editado.nome, 'Só o nome mudou');
      assert.equal(editado.email, 'caio@forge.test');
      assert.equal(editado.nivel_acesso, 'colaborador');
    });

    it('200 · não altera a senha nem o status por esta rota', async () => {
      const id = ctx.colabA.id_usuario;

      await env.api.patch(`/usuarios/${id}`, { senha: 'Hackeada#999', status: 'inativo' }, ctx.token.admin);

      esperar(await env.api.post('/auth/login', { email: 'caio@forge.test', senha: SENHA_PADRAO }), 200);
    });

    it('400 · e-mail inválido', async () => {
      esperar(
        await env.api.patch(`/usuarios/${ctx.colabA.id_usuario}`, { email: 'invalido' }, ctx.token.admin),
        400
      );
    });

    it('403 · colaborador não pode editar usuários', async () => {
      esperar(await env.api.patch(`/usuarios/${ctx.colabB.id_usuario}`, { nome: 'X' }, ctx.token.colabA), 403);
    });

    it('404 · usuário inexistente', async () => {
      esperar(await env.api.patch('/usuarios/999999', { nome: 'Fantasma' }, ctx.token.admin), 404);
    });

    it('401 · sem token', async () => {
      esperar(await env.api.patch(`/usuarios/${ctx.colabA.id_usuario}`, { nome: 'X' }), 401);
    });
  });

  /* ---------------------------------------------------------------- */
  describe('PATCH /usuarios/{id}/status (RF02, RN08)', () => {
    it('200 · inativa o usuário: login e token antigo deixam de funcionar', async () => {
      const id = ctx.colabA.id_usuario;

      const inativado = esperar(await env.api.patch(`/usuarios/${id}/status`, { status: 'inativo' }, ctx.token.admin), 200);
      assert.equal(inativado.status, 'inativo');

      esperar(await env.api.post('/auth/login', { email: 'caio@forge.test', senha: SENHA_PADRAO }), 401);
      esperar(await env.api.get('/usuarios/me', ctx.token.colabA), 401);
    });

    it('200 · reativar devolve o acesso', async () => {
      const id = ctx.colabA.id_usuario;

      await env.api.patch(`/usuarios/${id}/status`, { status: 'inativo' }, ctx.token.admin);
      const reativado = esperar(await env.api.patch(`/usuarios/${id}/status`, { status: 'ativo' }, ctx.token.admin), 200);

      assert.equal(reativado.status, 'ativo');
      esperar(await env.api.post('/auth/login', { email: 'caio@forge.test', senha: SENHA_PADRAO }), 200);
    });

    it('200 · RN08 — o histórico de tarefas do usuário inativado é preservado', async () => {
      const id = ctx.colabA.id_usuario;
      const tarefa = await criarTarefa({ titulo: 'Tarefa histórica', responsavelId: id });

      await env.api.patch(`/usuarios/${id}/status`, { status: 'inativo' }, ctx.token.admin);

      const lista = esperar(await env.api.get(`/tarefas?responsavel_id=${id}`, ctx.token.admin), 200);
      assert.deepEqual(ids(lista.dados), [tarefa.id_tarefa]);
    });

    it('400 · status inválido', async () => {
      esperar(
        await env.api.patch(`/usuarios/${ctx.colabA.id_usuario}/status`, { status: 'suspenso' }, ctx.token.admin),
        400
      );
    });

    it('403 · colaborador não pode alterar status de usuários', async () => {
      esperar(
        await env.api.patch(`/usuarios/${ctx.colabB.id_usuario}/status`, { status: 'inativo' }, ctx.token.colabA),
        403
      );
    });

    it('401 · sem token', async () => {
      esperar(await env.api.patch(`/usuarios/${ctx.colabA.id_usuario}/status`, { status: 'inativo' }), 401);
    });
  });
});

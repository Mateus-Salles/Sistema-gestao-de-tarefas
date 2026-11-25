import assert from 'node:assert/strict';
import { before, it } from 'node:test';
import jwt from 'jsonwebtoken';
import { passwordVersion } from '../../src/utils/session.js';
import { idParamSchema } from '../../src/schemas/common.schema.js';
import { validateParams } from '../../src/middlewares/validate.middleware.js';
import { AppError } from '../../src/utils/AppError.js';

let database;
let authModel;
let authService;
let clientModel;
let clientService;
let clientController;
let authenticate;
let projectModel;
let userModel;
let userService;
let taskModel;
let taskService;

before(async () => {
  const originalUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = 'postgres://unit:unit@localhost/unit_test';

  try {
    ({ default: database } = await import('../../src/database/index.js'));
    ({ default: authModel } = await import('../../src/models/auth.model.js'));
    ({ default: authService } = await import('../../src/services/auth.service.js'));
    ({ default: clientModel } = await import('../../src/models/client.model.js'));
    ({ default: clientService } = await import('../../src/services/client.service.js'));
    clientController = await import('../../src/controllers/client.controller.js');
    ({ authenticate } = await import('../../src/middlewares/auth.middleware.js'));
    ({ default: projectModel } = await import('../../src/models/project.model.js'));
    ({ default: userModel } = await import('../../src/models/user.model.js'));
    ({ default: userService } = await import('../../src/services/user.service.js'));
    ({ default: taskModel } = await import('../../src/models/task.model.js'));
    ({ default: taskService } = await import('../../src/services/task.service.js'));
  } finally {
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
  }
});

const admin = { id: 1, accessLevel: 'administrador' };
const collaborator = { id: 2, accessLevel: 'colaborador' };

it('usa o perfil atual do usuário mesmo que o token ainda declare administrador', async (t) => {
  t.mock.method(jwt, 'verify', () => ({
    sub: '2',
    jti: '00000000-0000-4000-8000-000000000000',
    exp: 2000000000,
    passwordVersion: passwordVersion('hash'),
    accessLevel: 'administrador',
  }));
  t.mock.method(authModel, 'isRevoked', async () => false);
  t.mock.method(userModel, 'findByIdWithPassword', async () => ({
    id_usuario: 2,
    nivel_acesso: 'colaborador',
    status: 'ativo',
    senha_hash: 'hash',
  }));
  const verify = jwt.verify;
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'segredo-unitario';
  t.after(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });
  const req = { headers: { authorization: 'Bearer token' } };
  const next = t.mock.fn();

  await authenticate(req, null, next);

  assert.deepEqual(
    next.mock.calls.map((call) => call.arguments),
    [[]],
  );
  assert.equal(req.user.accessLevel, 'colaborador');
  assert.deepEqual(verify.mock.calls[0].arguments[2].algorithms, ['HS256']);
});

it('rejeita ID acima do limite da coluna antes de chamar o controller de clientes', (t) => {
  const req = { params: { id: '2147483648' } };
  const next = t.mock.fn();

  validateParams(idParamSchema)(req, null, next);

  assert.equal(next.mock.callCount(), 1);
  assert.equal(next.mock.calls[0].arguments[0]?.statusCode, 400);
  assert.equal(req.validatedParams, undefined);
});

it('encaminha o erro da alteração de status do cliente ao middleware de erros', async (t) => {
  const failure = new AppError('Cliente não encontrado', 404);
  t.mock.method(clientService, 'updateStatus', async () => {
    throw failure;
  });
  const next = t.mock.fn();
  const res = { status: t.mock.fn() };

  await clientController.updateStatus(
    { validatedParams: { id: 10 }, body: { status: 'inativa' } },
    res,
    next,
  );

  assert.deepEqual(
    next.mock.calls.map((call) => call.arguments),
    [[failure]],
  );
  assert.equal(res.status.mock.callCount(), 0);
});

it('interrompe o logout se a revogação do token falhar', async (t) => {
  const failure = new Error('Falha ao gravar a revogação');
  t.mock.method(authModel, 'revokeToken', async () => {
    throw failure;
  });
  const cleanup = t.mock.method(authModel, 'clearExpiredTokens');

  await assert.rejects(authService.logout('token-id', 1_800_000_000), (error) => error === failure);
  assert.equal(cleanup.mock.callCount(), 0);
});

it('mantém o total filtrado ao devolver uma página de clientes além do último resultado', async (t) => {
  const findAll = t.mock.method(clientModel, 'findAll', async () => ({ rows: [], total: 21 }));

  const result = await clientService.list({ status: 'ativa', page: 3, pageSize: 20 });

  assert.deepEqual(findAll.mock.calls[0].arguments, [
    { status: 'ativa', limit: 20, offset: 40, viewerId: null },
  ]);
  assert.deepEqual(result, { dados: [], paginacao: { pagina: 3, tamanho_pagina: 20, total: 21 } });
});

it('preserva falhas inesperadas do banco ao concluir um projeto', async (t) => {
  const failure = Object.assign(new Error('Falha em outra função do banco'), {
    code: 'P0001',
    where: 'PL/pgSQL function outra_funcao() line 3 at RAISE',
  });
  t.mock.method(database, 'query', async () => {
    throw failure;
  });

  await assert.rejects(projectModel.updateStatus(7, 'concluido'), (error) => error === failure);
});

it('retorna 404 se o modelo vinculado ao novo projeto não existe', async (t) => {
  const failure = Object.assign(new Error('Modelo inexistente'), {
    code: '23503',
    constraint: 'fk_projeto_modelo',
  });
  t.mock.method(database, 'transactionAsUser', async () => {
    throw failure;
  });

  await assert.rejects(projectModel.createProject(admin.id, { cliente_id: 7, modelo_lancamento_id: 9 }), {
    statusCode: 404,
    message: 'Modelo de lançamento não encontrado',
  });
});

it('impede que o administrador altere o próprio nível de acesso antes de gravar', async (t) => {
  const update = t.mock.method(userModel, 'update');

  await assert.rejects(userService.update(admin, admin.id, { nivel_acesso: 'colaborador' }), {
    statusCode: 409,
  });
  assert.equal(update.mock.callCount(), 0);
});

it('impede que o administrador inative a própria conta antes de gravar', async (t) => {
  const updateStatus = t.mock.method(userModel, 'updateStatus');

  await assert.rejects(userService.updateStatus(admin, admin.id, 'inativo'), { statusCode: 409 });
  assert.equal(updateStatus.mock.callCount(), 0);
});

it('impede que um colaborador atribua uma tarefa a outra pessoa durante a criação', async (t) => {
  const create = t.mock.method(taskModel, 'create');

  await assert.rejects(
    taskService.create(collaborator, {
      titulo: 'Revisar página',
      divisao: 'produto',
      responsavel_id: 3,
    }),
    { statusCode: 403 },
  );
  assert.equal(create.mock.callCount(), 0);
});

it('permite que um colaborador defina a si próprio como responsável durante a criação', async (t) => {
  const input = { titulo: 'Revisar página', divisao: 'produto', responsavel_id: collaborator.id };
  const created = { id_tarefa: 10, ...input, criador_id: collaborator.id };
  const create = t.mock.method(taskModel, 'create', async () => created);

  assert.deepEqual(await taskService.create(collaborator, input), created);
  assert.deepEqual(create.mock.calls[0].arguments, [collaborator.id, input, true]);
});

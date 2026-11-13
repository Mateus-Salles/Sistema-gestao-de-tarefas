import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

import database from '../src/database/index.js';
import { hashPass } from '../src/utils/Password.js';

process.env.JWT_SECRET ||= 'segredo-e2e';
process.env.JWT_EXPIRES_IN ||= '8h';

export { database };

export const SENHA_PADRAO = 'Senha@123';

export const TAREFAS_DO_MODELO_PADRAO = [
  { titulo: 'Definir oferta e promessa', divisao: 'produto' },
  { titulo: 'Criar páginas e copy', divisao: 'conteudo' },
  { titulo: 'Subir campanhas de anúncios', divisao: 'trafego' },
  { titulo: 'Disparar e-mails de carrinho', divisao: 'disparos' },
];

/* ------------------------------------------------------------------ */
/* Segurança: os testes TRUNCAM tabelas, então só rodam em banco de teste */
/* ------------------------------------------------------------------ */

function nomeDoBanco() {
  const { connectionString, database: nome } = database.config;

  if (connectionString) {
    try {
      return new URL(connectionString).pathname.slice(1);
    } catch {
      return '';
    }
  }

  return nome ?? '';
}

function garantirBancoDeTeste() {
  if (!/test/i.test(nomeDoBanco())) {
    throw new Error(
      `[e2e] Recusando rodar no banco "${nomeDoBanco()}": os testes E2E apagam todos os dados. ` +
        'Use um banco cujo nome contenha "test" (ex.: forge_test).'
    );
  }
}

async function garantirSchema() {
  const { rows } = await database.query(`SELECT to_regclass('public.cliente') AS tabela`);
  if (rows[0].tabela) return;

  for (const arquivo of ['01_tabelas_indices.sql', '02_funcoes_triggers.sql', '03_views.sql']) {
    const sql = await readFile(new URL(`../src/database/${arquivo}`, import.meta.url), 'utf8');
    await database.query(sql);
  }
}

/* ------------------------------------------------------------------ */
/* Asserções e utilitários                                             */
/* ------------------------------------------------------------------ */

/** Confere o status HTTP (mostrando o corpo se falhar) e devolve o corpo. */
export function esperar(res, status) {
  assert.equal(
    res.status,
    status,
    `esperado HTTP ${status}, recebido ${res.status}: ${JSON.stringify(res.body)}`
  );
  return res.body;
}

/** Lista de ids ordenados, para comparar conjuntos sem depender da ordem. */
export function ids(lista, chave = 'id_tarefa') {
  return lista.map((item) => item[chave]).sort((a, b) => a - b);
}

export function ordenar(...valores) {
  return valores.flat().sort((a, b) => a - b);
}

export async function consultar(sql, params = []) {
  const { rows } = await database.query(sql, params);
  return rows;
}

/** Data (YYYY-MM-DD) relativa ao CURRENT_DATE do próprio banco. */
export async function dataRelativa(dias) {
  const [{ d }] = await consultar(`SELECT to_char(CURRENT_DATE + $1::int, 'YYYY-MM-DD') AS d`, [dias]);
  return d;
}

export function gerarToken(
  usuario,
  { expiresIn = '1h', secret = process.env.JWT_SECRET, jti = randomUUID() } = {}
) {
  return jwt.sign(
    { sub: String(usuario.id_usuario), accessLevel: usuario.nivel_acesso },
    secret,
    { algorithm: 'HS256', expiresIn, jwtid: jti }
  );
}

/* ------------------------------------------------------------------ */
/* Seeds (inserem direto no banco, sem passar pela API)                 */
/* ------------------------------------------------------------------ */

let sequencia = 0;
const unico = (prefixo) => `${prefixo}-${++sequencia}`;

let hashPadrao;
const hashDaSenhaPadrao = () => (hashPadrao ??= hashPass(SENHA_PADRAO));

async function idAdmin() {
  const [admin] = await consultar(
    `SELECT id_usuario FROM usuario WHERE nivel_acesso = 'administrador' AND status = 'ativo' ORDER BY id_usuario LIMIT 1`
  );
  assert.ok(admin, '[e2e] seed precisa de um administrador ativo — chame env.preparar() antes');
  return admin.id_usuario;
}

export async function criarUsuario({ nome, email, nivel = 'colaborador', status = 'ativo', senha } = {}) {
  const n = unico('usuario');
  const hash = senha ? await hashPass(senha) : await hashDaSenhaPadrao();

  const [usuario] = await consultar(
    `INSERT INTO usuario (nome, email, senha_hash, nivel_acesso, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id_usuario, nome, email, nivel_acesso, status`,
    [nome ?? `Usuário ${n}`, email ?? `${n}@forge.test`, hash, nivel, status]
  );

  return usuario;
}

export async function criarCliente({ nome, contato, status = 'ativa' } = {}) {
  const adminId = await idAdmin();
  const n = unico('cliente');

  return database.transactionAsUser(adminId, async (client) => {
    const { rows } = await client.query(
      `INSERT INTO cliente (nome, contato, status) VALUES ($1, $2, $3) RETURNING *`,
      [nome ?? `Cliente ${n}`, contato ?? `${n}@cliente.test`, status]
    );
    return rows[0];
  });
}

export async function criarModelo({ nome, status = 'ativo', tarefas = [] } = {}) {
  const [modelo] = await consultar(
    `INSERT INTO modelo_lancamento (nome, status) VALUES ($1, $2) RETURNING *`,
    [nome ?? `Modelo ${unico('modelo')}`, status]
  );

  for (const tarefa of tarefas) {
    await consultar(
      `INSERT INTO tarefa_padrao (modelo_lancamento_id, titulo, divisao) VALUES ($1, $2, $3)`,
      [modelo.id_modelo_lancamento, tarefa.titulo, tarefa.divisao]
    );
  }

  return modelo;
}

/** Cria o projeto como administrador — as triggers geram as tarefas padrão. */
export async function criarProjeto({
  clienteId,
  modeloId,
  nome,
  dataComeco = '2026-01-01',
  dataFinal = '2026-12-31',
  status = 'andamento',
} = {}) {
  const adminId = await idAdmin();
  const cliente = clienteId ?? (await criarCliente()).id_cliente;
  const modelo = modeloId ?? (await criarModelo({ tarefas: TAREFAS_DO_MODELO_PADRAO })).id_modelo_lancamento;

  return database.transactionAsUser(adminId, async (client) => {
    const { rows } = await client.query(
      `INSERT INTO projeto (cliente_id, modelo_lancamento_id, nome, data_comeco, data_final)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [cliente, modelo, nome ?? `Projeto ${unico('projeto')}`, dataComeco, dataFinal]
    );

    if (status !== 'andamento') {
      const { rows: atualizado } = await client.query(
        `UPDATE projeto SET status = $1 WHERE id_projeto = $2 RETURNING *`,
        [status, rows[0].id_projeto]
      );
      return atualizado[0];
    }

    return rows[0];
  });
}

export async function criarTarefa({
  projetoId = null,
  responsavelId = null,
  criadorId,
  titulo,
  descricao = null,
  divisao = 'produto',
  status = 'a_fazer',
  vencimento = null,
} = {}) {
  const criador = criadorId ?? (await idAdmin());

  const [tarefa] = await consultar(
    `INSERT INTO tarefa (projeto_id, responsavel_id, criador_id, titulo, descricao, divisao, kanban_status, vencimento)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [projetoId, responsavelId, criador, titulo ?? `Tarefa ${unico('tarefa')}`, descricao, divisao, status, vencimento]
  );

  return tarefa;
}

/** Tarefas geradas para o projeto, indexadas por divisão (produto, conteudo, trafego, disparos). */
export async function tarefasPorDivisao(projetoId) {
  const linhas = await consultar(`SELECT * FROM tarefa WHERE projeto_id = $1 ORDER BY id_tarefa`, [projetoId]);
  return Object.fromEntries(linhas.map((t) => [t.divisao, t]));
}

export async function atribuirTarefa(tarefaId, usuarioId) {
  await consultar(`UPDATE tarefa SET responsavel_id = $1 WHERE id_tarefa = $2`, [usuarioId, tarefaId]);
}

/** Muda o kanban_status direto no banco (como administrador, por causa da trigger de movimentação). */
export async function definirStatus(tarefaIds, status) {
  const lista = [tarefaIds].flat();
  const adminId = await idAdmin();

  await database.transactionAsUser(adminId, (client) =>
    client.query(`UPDATE tarefa SET kanban_status = $1 WHERE id_tarefa = ANY($2::int[])`, [status, lista])
  );
}

export async function concluirTodasAsTarefas(projetoId) {
  const linhas = await consultar(`SELECT id_tarefa FROM tarefa WHERE projeto_id = $1`, [projetoId]);
  if (linhas.length) await definirStatus(linhas.map((l) => l.id_tarefa), 'concluido');
}

/* ------------------------------------------------------------------ */
/* Ambiente: banco + servidor HTTP real em porta aleatória              */
/* ------------------------------------------------------------------ */

export async function iniciarAmbiente() {
  garantirBancoDeTeste();
  await database.connect();
  await garantirSchema();

  const { app } = await import('../src/app.js');

  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
    s.once('error', reject);
  });

  const raiz = `http://127.0.0.1:${server.address().port}`;

  async function request(metodo, caminho, { token, body, headers = {}, foraDoPrefixo = false } = {}) {
    const cabecalhos = { ...headers };
    if (token) cabecalhos.authorization = `Bearer ${token}`;

    let corpo;
    if (body !== undefined) {
      cabecalhos['content-type'] ??= 'application/json';
      corpo = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const res = await fetch(`${raiz}${foraDoPrefixo ? '' : '/v1'}${caminho}`, {
      method: metodo,
      headers: cabecalhos,
      body: corpo,
    });

    const texto = await res.text();
    let json = null;
    try {
      json = texto ? JSON.parse(texto) : null;
    } catch {
      json = null;
    }

    return { status: res.status, body: json, texto, headers: res.headers };
  }

  const api = {
    get: (caminho, token) => request('GET', caminho, { token }),
    post: (caminho, body, token) => request('POST', caminho, { token, body }),
    patch: (caminho, body, token) => request('PATCH', caminho, { token, body }),
    delete: (caminho, token) => request('DELETE', caminho, { token }),
  };

  /** Zera o banco e cria 1 administrador + 2 colaboradores (com tokens prontos). */
  async function preparar() {
    await consultar(
      `TRUNCATE token_revogado, tarefa, projeto, tarefa_padrao, modelo_lancamento, cliente, usuario RESTART IDENTITY CASCADE`
    );

    const admin = await criarUsuario({ nome: 'Ana Admin', email: 'admin@forge.test', nivel: 'administrador' });
    const colabA = await criarUsuario({ nome: 'Caio Colaborador', email: 'caio@forge.test' });
    const colabB = await criarUsuario({ nome: 'Bia Colaboradora', email: 'bia@forge.test' });

    return {
      admin,
      colabA,
      colabB,
      token: {
        admin: gerarToken(admin),
        colabA: gerarToken(colabA),
        colabB: gerarToken(colabB),
      },
    };
  }

  async function encerrar() {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
    await database.close();
  }

  return { api, request, preparar, encerrar };
}

// Simulador da API para desenvolver o front antes do back-end ficar pronto.
// Responde às mesmas rotas, formatos, permissões e regras do contrato
// (docs/openapi.json). Os dados ficam no localStorage do navegador.
// Liga/desliga com VITE_USAR_SIMULADOR no frontend/.env.
import { AxiosError } from "axios";
import { criarDadosIniciais } from "./dadosIniciais";

const CHAVE_BANCO = "simulador-banco-v1";
const DIVISOES = ["produto", "conteudo", "trafego", "disparos"];
const COLUNAS = ["a_fazer", "em_andamento", "em_revisao", "concluido"];

// ---------- "Banco de dados" ----------

function carregarBanco() {
  try {
    const salvo = localStorage.getItem(CHAVE_BANCO);
    if (salvo) return JSON.parse(salvo);
  } catch {
    // Dados corrompidos: começa de novo.
  }

  const banco = criarDadosIniciais();
  salvarBanco(banco);
  return banco;
}

function salvarBanco(banco) {
  localStorage.setItem(CHAVE_BANCO, JSON.stringify(banco));
}

// Volta os dados de teste ao estado inicial.
export function resetarSimulador() {
  localStorage.removeItem(CHAVE_BANCO);
}

function proximoId(lista, campo) {
  return lista.reduce((maior, item) => Math.max(maior, item[campo]), 0) + 1;
}

function agora() {
  return new Date().toISOString();
}

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

// ---------- Erros no formato da API (AppError) ----------

class ErroApi extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

const erro = (status, mensagem) => new ErroApi(status, mensagem);
const naoEncontrado = (o = "Recurso") => erro(404, `${o} não encontrado`);
const somenteAdmin = () => erro(403, "Ação permitida apenas para administradores");

function exigirAdmin(ctx) {
  if (ctx.usuario.nivel_acesso !== "administrador") throw somenteAdmin();
}

function exigirCampos(corpo, campos) {
  for (const campo of campos) {
    const valor = corpo?.[campo];
    if (valor === undefined || valor === null || String(valor).trim() === "") {
      throw erro(400, `O campo ${campo} é obrigatório`);
    }
  }
}

function validarValor(valor, permitidos, campo) {
  if (!permitidos.includes(valor)) {
    throw erro(400, `${campo} inválido. Use: ${permitidos.join(", ")}`);
  }
}

// ---------- Conversão para o formato de resposta ----------

function usuarioDTO(u) {
  const resto = { ...u };
  delete resto.senha;
  return resto;
}

function tarefaDTO(t) {
  const atrasada =
    Boolean(t.vencimento) && t.kanban_status !== "concluido" && t.vencimento < hoje();
  return { ...t, atrasada };
}

function modeloDetalhado(banco, modelo) {
  return {
    ...modelo,
    tarefas_padrao: banco.tarefasPadrao.filter(
      (p) => p.modelo_lancamento_id === modelo.id_modelo_lancamento
    )
  };
}

function paginar(lista, params) {
  const pagina = Math.max(1, Number(params.pagina) || 1);
  const tamanho = Math.max(1, Number(params.tamanho_pagina) || 20);
  const inicio = (pagina - 1) * tamanho;

  return {
    dados: lista.slice(inicio, inicio + tamanho),
    paginacao: { pagina, tamanho_pagina: tamanho, total: lista.length }
  };
}

// ---------- Regras de visibilidade das tarefas (RN01, RN02) ----------

function podeVerTarefa(usuario, tarefa) {
  return (
    usuario.nivel_acesso === "administrador" ||
    tarefa.responsavel_id === usuario.id_usuario ||
    tarefa.criador_id === usuario.id_usuario
  );
}

function filtrarTarefas(tarefas, params) {
  return tarefas.filter(
    (t) =>
      (!params.projeto_id || t.projeto_id === Number(params.projeto_id)) &&
      (!params.responsavel_id || t.responsavel_id === Number(params.responsavel_id)) &&
      (!params.divisao || t.divisao === params.divisao) &&
      (!params.kanban_status || t.kanban_status === params.kanban_status)
  );
}

function buscar(lista, campo, id, nome) {
  const item = lista.find((i) => i[campo] === Number(id));
  if (!item) throw naoEncontrado(nome);
  return item;
}

function buscarTarefaVisivel(ctx, id) {
  const tarefa = buscar(ctx.banco.tarefas, "id_tarefa", id, "Tarefa");
  if (!podeVerTarefa(ctx.usuario, tarefa)) {
    throw erro(403, "Você não tem acesso a esta tarefa");
  }
  return tarefa;
}

function validarResponsavel(banco, responsavelId) {
  if (responsavelId === null || responsavelId === undefined) return null;

  const responsavel = banco.usuarios.find((u) => u.id_usuario === Number(responsavelId));

  if (!responsavel || responsavel.status !== "ativo") {
    throw erro(409, "Responsável não encontrado ou inativo");
  }
  if (responsavel.nivel_acesso !== "colaborador") {
    throw erro(409, "O responsável precisa ser um colaborador");
  }
  return responsavel.id_usuario;
}

function validarDatas(inicio, fim) {
  if (inicio && fim && fim < inicio) {
    throw erro(400, "A data final não pode ser anterior à data de começo");
  }
}

function emailEmUso(banco, email, ignorarId) {
  return banco.usuarios.some(
    (u) =>
      u.email.toLowerCase() === String(email).trim().toLowerCase() &&
      u.id_usuario !== ignorarId
  );
}

function tokenDoUsuario(usuario) {
  return `simulador.${usuario.id_usuario}.${Date.now()}`;
}

// ---------- Rotas ----------
// Cada rota: [método, caminho, função(ctx)] — publica: sem token.

const rotas = [
  // Autenticação
  ["post", "/auth/login", ({ banco, corpo }) => {
    exigirCampos(corpo, ["email", "senha"]);
    const usuario = banco.usuarios.find(
      (u) => u.email.toLowerCase() === corpo.email.trim().toLowerCase()
    );

    if (!usuario || usuario.senha !== corpo.senha) {
      throw erro(401, "E-mail ou senha inválidos");
    }
    if (usuario.status !== "ativo") {
      throw erro(401, "Usuário inativo. Procure um administrador.");
    }

    return { token: tokenDoUsuario(usuario), usuario: usuarioDTO(usuario) };
  }, { publica: true }],

  ["post", "/auth/logout", () => null],

  ["patch", "/auth/senha", ({ banco, usuario, corpo }) => {
    exigirCampos(corpo, ["senha_atual", "senha_nova"]);
    const registro = buscar(banco.usuarios, "id_usuario", usuario.id_usuario, "Usuário");

    if (registro.senha !== corpo.senha_atual) throw erro(401, "Senha atual incorreta");
    if (corpo.senha_nova.length < 8) {
      throw erro(400, "A nova senha deve ter no mínimo 8 caracteres");
    }
    if (corpo.senha_nova === corpo.senha_atual) {
      throw erro(400, "A nova senha deve ser diferente da atual");
    }

    registro.senha = corpo.senha_nova;
    return null;
  }],

  // Usuários
  ["get", "/usuarios", (ctx) => {
    exigirAdmin(ctx);
    const lista = ctx.banco.usuarios.filter(
      (u) => !ctx.params.status || u.status === ctx.params.status
    );
    return paginar(lista.map(usuarioDTO), ctx.params);
  }],

  ["post", "/usuarios", (ctx) => {
    exigirAdmin(ctx);
    const { banco, corpo } = ctx;
    exigirCampos(corpo, ["nome", "email", "senha", "nivel_acesso"]);
    validarValor(corpo.nivel_acesso, ["administrador", "colaborador"], "nivel_acesso");

    if (emailEmUso(banco, corpo.email)) throw erro(409, "Este e-mail já está cadastrado");
    if (corpo.senha.length < 8) throw erro(400, "A senha deve ter no mínimo 8 caracteres");

    const novo = {
      id_usuario: proximoId(banco.usuarios, "id_usuario"),
      nome: corpo.nome.trim(),
      email: corpo.email.trim(),
      senha: corpo.senha,
      nivel_acesso: corpo.nivel_acesso,
      status: "ativo",
      criado_em: agora()
    };
    banco.usuarios.push(novo);
    return { status: 201, dados: usuarioDTO(novo) };
  }],

  ["get", "/usuarios/me", ({ usuario }) => usuarioDTO(usuario)],

  ["get", "/usuarios/me/kanban", ({ banco, usuario, params }) =>
    filtrarTarefas(
      banco.tarefas.filter((t) => t.responsavel_id === usuario.id_usuario),
      params
    ).map(tarefaDTO)],

  ["get", "/usuarios/:id", ({ banco, id }) =>
    usuarioDTO(buscar(banco.usuarios, "id_usuario", id, "Usuário"))],

  ["patch", "/usuarios/:id", (ctx) => {
    exigirAdmin(ctx);
    const { banco, corpo, id } = ctx;
    const registro = buscar(banco.usuarios, "id_usuario", id, "Usuário");

    if (corpo.nivel_acesso !== undefined) {
      validarValor(corpo.nivel_acesso, ["administrador", "colaborador"], "nivel_acesso");
    }
    if (corpo.email !== undefined && emailEmUso(banco, corpo.email, registro.id_usuario)) {
      throw erro(409, "Este e-mail já está cadastrado");
    }

    for (const campo of ["nome", "email", "nivel_acesso"]) {
      if (corpo[campo] !== undefined) registro[campo] = String(corpo[campo]).trim();
    }
    return usuarioDTO(registro);
  }],

  ["patch", "/usuarios/:id/status", (ctx) => {
    exigirAdmin(ctx);
    const { banco, corpo, id, usuario } = ctx;
    validarValor(corpo?.status, ["ativo", "inativo"], "status");
    const registro = buscar(banco.usuarios, "id_usuario", id, "Usuário");

    if (registro.id_usuario === usuario.id_usuario && corpo.status === "inativo") {
      throw erro(409, "Você não pode inativar o próprio usuário");
    }

    // RN08: as tarefas do usuário continuam guardadas.
    registro.status = corpo.status;
    return usuarioDTO(registro);
  }],

  ["get", "/usuarios/:id/kanban", (ctx) => {
    exigirAdmin(ctx);
    buscar(ctx.banco.usuarios, "id_usuario", ctx.id, "Usuário");
    return filtrarTarefas(
      ctx.banco.tarefas.filter((t) => t.responsavel_id === Number(ctx.id)),
      ctx.params
    ).map(tarefaDTO);
  }],

  // Clientes
  ["get", "/clientes", ({ banco, params }) =>
    paginar(
      banco.clientes.filter((c) => !params.status || c.status === params.status),
      params
    )],

  ["post", "/clientes", (ctx) => {
    exigirAdmin(ctx);
    exigirCampos(ctx.corpo, ["nome", "contato"]);
    const novo = {
      id_cliente: proximoId(ctx.banco.clientes, "id_cliente"),
      nome: ctx.corpo.nome.trim(),
      contato: ctx.corpo.contato.trim(),
      status: "ativa",
      criado_em: agora()
    };
    ctx.banco.clientes.push(novo);
    return { status: 201, dados: novo };
  }],

  ["get", "/clientes/:id", ({ banco, id }) =>
    buscar(banco.clientes, "id_cliente", id, "Cliente")],

  ["patch", "/clientes/:id", (ctx) => {
    exigirAdmin(ctx);
    const cliente = buscar(ctx.banco.clientes, "id_cliente", ctx.id, "Cliente");
    for (const campo of ["nome", "contato"]) {
      if (ctx.corpo[campo] !== undefined) cliente[campo] = String(ctx.corpo[campo]).trim();
    }
    return cliente;
  }],

  ["patch", "/clientes/:id/status", (ctx) => {
    exigirAdmin(ctx);
    validarValor(ctx.corpo?.status, ["ativa", "inativa"], "status");
    const cliente = buscar(ctx.banco.clientes, "id_cliente", ctx.id, "Cliente");
    cliente.status = ctx.corpo.status;
    return cliente;
  }],

  // Modelos de lançamento
  ["get", "/modelos-lancamento", ({ banco }) => banco.modelos],

  ["post", "/modelos-lancamento", (ctx) => {
    exigirAdmin(ctx);
    exigirCampos(ctx.corpo, ["nome"]);
    const novo = {
      id_modelo_lancamento: proximoId(ctx.banco.modelos, "id_modelo_lancamento"),
      nome: ctx.corpo.nome.trim(),
      status: "ativo",
      criado_em: agora()
    };
    ctx.banco.modelos.push(novo);
    return { status: 201, dados: novo };
  }],

  ["get", "/modelos-lancamento/:id", ({ banco, id }) =>
    modeloDetalhado(banco, buscar(banco.modelos, "id_modelo_lancamento", id, "Modelo"))],

  ["patch", "/modelos-lancamento/:id", (ctx) => {
    exigirAdmin(ctx);
    exigirCampos(ctx.corpo, ["nome"]);
    const modelo = buscar(ctx.banco.modelos, "id_modelo_lancamento", ctx.id, "Modelo");
    modelo.nome = ctx.corpo.nome.trim();
    return modelo;
  }],

  ["delete", "/modelos-lancamento/:id", (ctx) => {
    exigirAdmin(ctx);
    const { banco } = ctx;
    const id = Number(ctx.id);
    buscar(banco.modelos, "id_modelo_lancamento", id, "Modelo");

    // RF14: projetos já criados não são afetados (as tarefas deles já existem).
    banco.modelos = banco.modelos.filter((m) => m.id_modelo_lancamento !== id);
    banco.tarefasPadrao = banco.tarefasPadrao.filter((p) => p.modelo_lancamento_id !== id);
    return null;
  }],

  ["get", "/modelos-lancamento/:id/tarefas-padrao", ({ banco, id }) => {
    buscar(banco.modelos, "id_modelo_lancamento", id, "Modelo");
    return banco.tarefasPadrao.filter((p) => p.modelo_lancamento_id === Number(id));
  }],

  ["post", "/modelos-lancamento/:id/tarefas-padrao", (ctx) => {
    exigirAdmin(ctx);
    exigirCampos(ctx.corpo, ["titulo", "divisao"]);
    validarValor(ctx.corpo.divisao, DIVISOES, "divisao");
    buscar(ctx.banco.modelos, "id_modelo_lancamento", ctx.id, "Modelo");

    const nova = {
      id_tarefa_padrao: proximoId(ctx.banco.tarefasPadrao, "id_tarefa_padrao"),
      modelo_lancamento_id: Number(ctx.id),
      titulo: ctx.corpo.titulo.trim(),
      divisao: ctx.corpo.divisao
    };
    ctx.banco.tarefasPadrao.push(nova);
    return { status: 201, dados: nova };
  }],

  ["patch", "/modelos-lancamento/:id/tarefas-padrao/:tarefaId", (ctx) => {
    exigirAdmin(ctx);
    const padrao = ctx.banco.tarefasPadrao.find(
      (p) =>
        p.id_tarefa_padrao === Number(ctx.tarefaId) &&
        p.modelo_lancamento_id === Number(ctx.id)
    );
    if (!padrao) throw naoEncontrado("Tarefa padrão");

    if (ctx.corpo.divisao !== undefined) validarValor(ctx.corpo.divisao, DIVISOES, "divisao");
    if (ctx.corpo.titulo !== undefined) padrao.titulo = ctx.corpo.titulo.trim();
    if (ctx.corpo.divisao !== undefined) padrao.divisao = ctx.corpo.divisao;
    return padrao;
  }],

  ["delete", "/modelos-lancamento/:id/tarefas-padrao/:tarefaId", (ctx) => {
    exigirAdmin(ctx);
    const antes = ctx.banco.tarefasPadrao.length;
    ctx.banco.tarefasPadrao = ctx.banco.tarefasPadrao.filter(
      (p) =>
        !(p.id_tarefa_padrao === Number(ctx.tarefaId) &&
          p.modelo_lancamento_id === Number(ctx.id))
    );
    if (ctx.banco.tarefasPadrao.length === antes) throw naoEncontrado("Tarefa padrão");
    return null;
  }],

  // Projetos
  ["get", "/projetos", ({ banco, usuario, params }) => {
    let lista = banco.projetos.filter(
      (p) =>
        (!params.cliente_id || p.cliente_id === Number(params.cliente_id)) &&
        (!params.status || p.status === params.status)
    );

    // Colaborador vê os projetos em que tem alguma tarefa visível.
    if (usuario.nivel_acesso !== "administrador") {
      const meus = new Set(
        banco.tarefas.filter((t) => podeVerTarefa(usuario, t)).map((t) => t.projeto_id)
      );
      lista = lista.filter((p) => meus.has(p.id_projeto));
    }
    return paginar(lista, params);
  }],

  ["post", "/projetos", (ctx) => {
    exigirAdmin(ctx);
    const { banco, corpo, usuario } = ctx;
    exigirCampos(corpo, ["cliente_id", "modelo_lancamento_id", "nome", "data_comeco", "data_final"]);
    validarDatas(corpo.data_comeco, corpo.data_final);

    const cliente = banco.clientes.find((c) => c.id_cliente === Number(corpo.cliente_id));
    if (!cliente || cliente.status !== "ativa") {
      throw erro(409, "O projeto precisa de um cliente ativo"); // RN05
    }
    const modelo = banco.modelos.find(
      (m) => m.id_modelo_lancamento === Number(corpo.modelo_lancamento_id)
    );
    if (!modelo || modelo.status !== "ativo") {
      throw erro(409, "Modelo de lançamento não encontrado ou inativo");
    }

    const projeto = {
      id_projeto: proximoId(banco.projetos, "id_projeto"),
      cliente_id: cliente.id_cliente,
      modelo_lancamento_id: modelo.id_modelo_lancamento,
      nome: corpo.nome.trim(),
      data_comeco: corpo.data_comeco,
      data_final: corpo.data_final,
      status: "andamento",
      criado_em: agora()
    };
    banco.projetos.push(projeto);

    // RF16: gera as tarefas do modelo, já nas divisões.
    let idTarefa = proximoId(banco.tarefas, "id_tarefa");
    banco.tarefasPadrao
      .filter((p) => p.modelo_lancamento_id === modelo.id_modelo_lancamento)
      .forEach((padrao) => {
        banco.tarefas.push({
          id_tarefa: idTarefa++,
          projeto_id: projeto.id_projeto,
          responsavel_id: null,
          criador_id: usuario.id_usuario,
          titulo: padrao.titulo,
          descricao: null,
          divisao: padrao.divisao,
          kanban_status: "a_fazer",
          vencimento: null,
          criado_em: agora(),
          atualizado_em: agora()
        });
      });

    return { status: 201, dados: projeto };
  }],

  ["get", "/projetos/:id", ({ banco, id }) =>
    buscar(banco.projetos, "id_projeto", id, "Projeto")],

  ["patch", "/projetos/:id", (ctx) => {
    exigirAdmin(ctx);
    const projeto = buscar(ctx.banco.projetos, "id_projeto", ctx.id, "Projeto");
    const novo = { ...projeto, ...pegar(ctx.corpo, ["nome", "data_comeco", "data_final"]) };
    validarDatas(novo.data_comeco, novo.data_final);
    Object.assign(projeto, novo);
    return projeto;
  }],

  ["patch", "/projetos/:id/status", (ctx) => {
    exigirAdmin(ctx);
    validarValor(ctx.corpo?.status, ["andamento", "concluido", "cancelado"], "status");
    const projeto = buscar(ctx.banco.projetos, "id_projeto", ctx.id, "Projeto");

    if (ctx.corpo.status === "concluido") {
      const pendentes = ctx.banco.tarefas.filter(
        (t) => t.projeto_id === projeto.id_projeto && t.kanban_status !== "concluido"
      );
      if (pendentes.length > 0) {
        throw erro(409, `Ainda há ${pendentes.length} tarefa(s) fora da coluna Concluído`); // RN07
      }
    }

    projeto.status = ctx.corpo.status;
    return projeto;
  }],

  ["get", "/projetos/:id/kanban", (ctx) => {
    exigirAdmin(ctx);
    buscar(ctx.banco.projetos, "id_projeto", ctx.id, "Projeto");
    return filtrarTarefas(
      ctx.banco.tarefas.filter((t) => t.projeto_id === Number(ctx.id)),
      ctx.params
    ).map(tarefaDTO);
  }],

  ["get", "/projetos/:id/progresso", ({ banco, id }) => {
    buscar(banco.projetos, "id_projeto", id, "Projeto");
    const doProjeto = banco.tarefas.filter((t) => t.projeto_id === Number(id));
    const concluidas = doProjeto.filter((t) => t.kanban_status === "concluido").length;
    const total = doProjeto.length;

    return {
      id_projeto: Number(id),
      total_tarefas: total,
      tarefas_concluidas: concluidas,
      tarefas_pendentes: total - concluidas,
      percentual_concluido: total ? Math.round((concluidas / total) * 1000) / 10 : 0
    };
  }],

  // Tarefas
  ["get", "/tarefas", ({ banco, usuario, params }) =>
    paginar(
      filtrarTarefas(banco.tarefas.filter((t) => podeVerTarefa(usuario, t)), params)
        .map(tarefaDTO),
      params
    )],

  ["post", "/tarefas", ({ banco, usuario, corpo }) => {
    exigirCampos(corpo, ["titulo", "divisao"]);
    validarValor(corpo.divisao, DIVISOES, "divisao");

    const admin = usuario.nivel_acesso === "administrador";
    let responsavelId = corpo.responsavel_id ?? null;

    // Colaborador só cria tarefa para ele mesmo.
    if (!admin) {
      if (responsavelId !== null && Number(responsavelId) !== usuario.id_usuario) {
        throw erro(403, "Colaborador só pode criar tarefas para si mesmo");
      }
      responsavelId = usuario.id_usuario;
    } else {
      responsavelId = validarResponsavel(banco, responsavelId);
    }

    if (corpo.projeto_id) buscar(banco.projetos, "id_projeto", corpo.projeto_id, "Projeto");

    const nova = {
      id_tarefa: proximoId(banco.tarefas, "id_tarefa"),
      projeto_id: corpo.projeto_id ? Number(corpo.projeto_id) : null,
      responsavel_id: responsavelId,
      criador_id: usuario.id_usuario,
      titulo: corpo.titulo.trim(),
      descricao: corpo.descricao?.trim() || null,
      divisao: corpo.divisao,
      kanban_status: "a_fazer",
      vencimento: corpo.vencimento || null,
      criado_em: agora(),
      atualizado_em: agora()
    };
    banco.tarefas.push(nova);
    return { status: 201, dados: tarefaDTO(nova) };
  }],

  ["get", "/tarefas/atrasadas", ({ banco, usuario }) =>
    banco.tarefas
      .filter((t) => podeVerTarefa(usuario, t))
      .map(tarefaDTO)
      .filter((t) => t.atrasada)],

  ["get", "/tarefas/:id", (ctx) => tarefaDTO(buscarTarefaVisivel(ctx, ctx.id))],

  ["patch", "/tarefas/:id", (ctx) => {
    const tarefa = buscarTarefaVisivel(ctx, ctx.id);
    if (ctx.corpo.divisao !== undefined) validarValor(ctx.corpo.divisao, DIVISOES, "divisao");
    if (ctx.corpo.titulo !== undefined && !String(ctx.corpo.titulo).trim()) {
      throw erro(400, "O campo titulo é obrigatório");
    }

    Object.assign(tarefa, pegar(ctx.corpo, ["titulo", "descricao", "divisao", "vencimento"]));
    tarefa.atualizado_em = agora();
    return tarefaDTO(tarefa);
  }],

  ["delete", "/tarefas/:id", (ctx) => {
    exigirAdmin(ctx);
    buscar(ctx.banco.tarefas, "id_tarefa", ctx.id, "Tarefa");
    ctx.banco.tarefas = ctx.banco.tarefas.filter((t) => t.id_tarefa !== Number(ctx.id));
    return null;
  }],

  ["patch", "/tarefas/:id/responsavel", (ctx) => {
    exigirAdmin(ctx);
    if (!ctx.corpo || !("responsavel_id" in ctx.corpo)) {
      throw erro(400, "O campo responsavel_id é obrigatório");
    }
    const tarefa = buscar(ctx.banco.tarefas, "id_tarefa", ctx.id, "Tarefa");
    tarefa.responsavel_id = validarResponsavel(ctx.banco, ctx.corpo.responsavel_id); // RN03
    tarefa.atualizado_em = agora();
    return tarefaDTO(tarefa);
  }],

  ["patch", "/tarefas/:id/status", (ctx) => {
    validarValor(ctx.corpo?.kanban_status, COLUNAS, "kanban_status");
    const tarefa = buscarTarefaVisivel(ctx, ctx.id);

    const admin = ctx.usuario.nivel_acesso === "administrador";
    if (!admin && tarefa.responsavel_id !== ctx.usuario.id_usuario) {
      throw erro(403, "Só o responsável pela tarefa ou um administrador pode movê-la");
    }

    tarefa.kanban_status = ctx.corpo.kanban_status;
    tarefa.atualizado_em = agora();
    return tarefaDTO(tarefa);
  }]
];

function pegar(origem, campos) {
  const resultado = {};
  for (const campo of campos) {
    if (origem?.[campo] !== undefined) resultado[campo] = origem[campo];
  }
  return resultado;
}

// ---------- Roteamento ----------

const rotasCompiladas = rotas.map(([metodo, caminho, funcao, opcoes = {}]) => {
  const nomes = [];
  const padrao = caminho.replace(/:(\w+)/g, (_, nome) => {
    nomes.push(nome);
    return "([^/]+)";
  });
  return { metodo, regex: new RegExp(`^${padrao}$`), nomes, funcao, ...opcoes };
});

function encontrarRota(metodo, caminho) {
  for (const rota of rotasCompiladas) {
    if (rota.metodo !== metodo) continue;
    const achou = caminho.match(rota.regex);
    if (achou) {
      const valores = {};
      rota.nomes.forEach((nome, i) => {
        valores[nome] = decodeURIComponent(achou[i + 1]);
      });
      return { rota, valores };
    }
  }
  return null;
}

function usuarioDoToken(banco, cabecalho) {
  const [tipo, token] = String(cabecalho || "").split(" ");
  if (tipo !== "Bearer" || !token?.startsWith("simulador.")) return null;

  const id = Number(token.split(".")[1]);
  const usuario = banco.usuarios.find((u) => u.id_usuario === id);
  return usuario && usuario.status === "ativo" ? usuario : null;
}

function lerCorpo(data) {
  if (!data) return {};
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  return data;
}

function separarUrl(url) {
  const [caminho, busca = ""] = String(url || "").split("?");
  const params = Object.fromEntries(new URLSearchParams(busca));
  return { caminho: caminho.replace(/\/+$/, "") || "/", params };
}

function resposta(config, status, data) {
  return { data, status, statusText: String(status), headers: {}, config, request: {} };
}

// Adaptador do Axios: em vez de ir para a rede, responde aqui mesmo.
export async function simuladorAdapter(config) {
  await new Promise((r) => setTimeout(r, 150)); // imita a demora da rede

  const metodo = (config.method || "get").toLowerCase();
  const { caminho, params: daUrl } = separarUrl(config.url);
  const params = { ...daUrl, ...(config.params || {}) };

  const banco = carregarBanco();
  const achado = encontrarRota(metodo, caminho);

  try {
    if (!achado) throw erro(404, `Rota ${metodo.toUpperCase()} ${caminho} não existe no contrato`);

    const { rota, valores } = achado;
    const cabecalho = config.headers?.Authorization || config.headers?.authorization;
    const usuario = rota.publica ? null : usuarioDoToken(banco, cabecalho);

    if (!rota.publica && !usuario) throw erro(401, "Token inválido ou expirado");

    const retorno = rota.funcao({
      banco,
      usuario,
      params,
      corpo: lerCorpo(config.data),
      ...valores
    });

    salvarBanco(banco);

    if (retorno === null) return resposta(config, 204, "");
    if (retorno?.status === 201) return resposta(config, 201, retorno.dados);
    return resposta(config, 200, retorno);
  } catch (e) {
    const status = e instanceof ErroApi ? e.status : 500;
    const mensagem = e instanceof ErroApi ? e.message : "Erro interno do simulador";
    if (!(e instanceof ErroApi)) console.error("[simulador]", e);

    const res = resposta(config, status, { message: mensagem });
    throw new AxiosError(
      mensagem,
      status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
      config,
      res.request,
      res
    );
  }
}

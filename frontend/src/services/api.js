// Chamadas à API do sistema, seguindo o contrato em docs/openapi.json.
import axios from "axios";
import { getToken, limparSessao } from "./sessao";
import { simuladorAdapter } from "./simulador";

// Endereço da API, já com o prefixo /v1. Configure em frontend/.env.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/v1";

// Enquanto o back-end não tem todas as rotas, o simulador responde no lugar.
// Para usar o back-end real: VITE_USAR_SIMULADOR=false no frontend/.env.
export const USANDO_SIMULADOR = import.meta.env.VITE_USAR_SIMULADOR !== "false";

export const api = axios.create({
  baseURL: API_URL,
  ...(USANDO_SIMULADOR ? { adapter: simuladorAdapter } : {})
});

// Envia o token JWT em todas as requisições, quando houver.
api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Token ausente, expirado ou revogado: encerra a sessão e volta para o login.
// Login (senha errada) e troca de senha (senha atual errada) também respondem
// 401, mas nesses casos o usuário deve ver a mensagem, não ser deslogado.
const ROTAS_401_ESPERADO = ["/auth/login", "/auth/senha"];

api.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    const url = erro.config?.url || "";
    const esperado = ROTAS_401_ESPERADO.some((rota) => url.includes(rota));

    if (erro.response?.status === 401 && !esperado) {
      limparSessao();
      window.location.assign("/");
    }

    return Promise.reject(erro);
  }
);

// Mensagem amigável a partir de um erro da API (AppError/Zod) ou da rede.
export function mensagemDeErro(erro, padrao = "Algo deu errado. Tente novamente.") {
  return (
    erro?.response?.data?.message ||
    erro?.response?.data?.error ||
    (erro?.request && !erro?.response ? "Não foi possível conectar ao servidor." : null) ||
    erro?.message ||
    padrao
  );
}

// Listas paginadas vêm como { dados, paginacao }. Pedimos uma página grande
// para as telas receberem tudo de uma vez.
const TODOS = { tamanho_pagina: 1000 };

async function listar(caminho, filtros = {}) {
  const { data } = await api.get(caminho, { params: { ...TODOS, ...filtros } });
  return data.dados;
}

const pegarDados = (resposta) => resposta.data;

// ---------- Autenticação ----------

// Retorna { token, usuario }.
export function login(email, senha) {
  return api.post("/auth/login", { email: email.trim(), senha }).then(pegarDados);
}

// Avisa a API para revogar o token. Mesmo se falhar, a sessão local é encerrada.
export async function logout() {
  try {
    if (getToken()) {
      await api.post("/auth/logout");
    }
  } catch {
    // Ignora: o usuário sai de qualquer forma.
  } finally {
    limparSessao();
  }
}

export function alterarSenha(senha_atual, senha_nova) {
  return api.patch("/auth/senha", { senha_atual, senha_nova });
}

// ---------- Usuários ----------

export const listarUsuarios = (filtros) => listar("/usuarios", filtros);
export const buscarMeuUsuario = () => api.get("/usuarios/me").then(pegarDados);
export const buscarUsuario = (id) => api.get(`/usuarios/${id}`).then(pegarDados);
export const criarUsuario = (dados) => api.post("/usuarios", dados).then(pegarDados);
export const editarUsuario = (id, dados) => api.patch(`/usuarios/${id}`, dados).then(pegarDados);
export const alterarStatusUsuario = (id, status) =>
  api.patch(`/usuarios/${id}/status`, { status }).then(pegarDados);

// ---------- Clientes ----------

export const listarClientes = (filtros) => listar("/clientes", filtros);
export const buscarCliente = (id) => api.get(`/clientes/${id}`).then(pegarDados);
export const criarCliente = (dados) => api.post("/clientes", dados).then(pegarDados);
export const editarCliente = (id, dados) => api.patch(`/clientes/${id}`, dados).then(pegarDados);
export const alterarStatusCliente = (id, status) =>
  api.patch(`/clientes/${id}/status`, { status }).then(pegarDados);

// ---------- Modelos de lançamento ----------

export const listarModelos = () => api.get("/modelos-lancamento").then(pegarDados);
// Inclui tarefas_padrao.
export const buscarModelo = (id) => api.get(`/modelos-lancamento/${id}`).then(pegarDados);
export const criarModelo = (nome) => api.post("/modelos-lancamento", { nome }).then(pegarDados);
export const editarModelo = (id, nome) =>
  api.patch(`/modelos-lancamento/${id}`, { nome }).then(pegarDados);
export const excluirModelo = (id) => api.delete(`/modelos-lancamento/${id}`);

export const criarTarefaPadrao = (modeloId, dados) =>
  api.post(`/modelos-lancamento/${modeloId}/tarefas-padrao`, dados).then(pegarDados);
export const editarTarefaPadrao = (modeloId, tarefaId, dados) =>
  api.patch(`/modelos-lancamento/${modeloId}/tarefas-padrao/${tarefaId}`, dados).then(pegarDados);
export const excluirTarefaPadrao = (modeloId, tarefaId) =>
  api.delete(`/modelos-lancamento/${modeloId}/tarefas-padrao/${tarefaId}`);

// ---------- Projetos ----------

export const listarProjetos = (filtros) => listar("/projetos", filtros);
export const buscarProjeto = (id) => api.get(`/projetos/${id}`).then(pegarDados);
// Ao criar, a API gera as tarefas do modelo escolhido.
export const criarProjeto = (dados) => api.post("/projetos", dados).then(pegarDados);
export const editarProjeto = (id, dados) => api.patch(`/projetos/${id}`, dados).then(pegarDados);
export const alterarStatusProjeto = (id, status) =>
  api.patch(`/projetos/${id}/status`, { status }).then(pegarDados);
export const buscarProgressoProjeto = (id) =>
  api.get(`/projetos/${id}/progresso`).then(pegarDados);

// ---------- Tarefas ----------

// O próprio back-end aplica a visibilidade: colaborador recebe só as tarefas
// atribuídas a ele ou criadas por ele (RN01, RN02).
export const listarTarefas = (filtros) => listar("/tarefas", filtros);
export const listarTarefasAtrasadas = () => api.get("/tarefas/atrasadas").then(pegarDados);
export const buscarTarefa = (id) => api.get(`/tarefas/${id}`).then(pegarDados);
export const criarTarefa = (dados) => api.post("/tarefas", dados).then(pegarDados);
export const editarTarefa = (id, dados) => api.patch(`/tarefas/${id}`, dados).then(pegarDados);
export const excluirTarefa = (id) => api.delete(`/tarefas/${id}`);
export const atribuirResponsavel = (id, responsavel_id) =>
  api.patch(`/tarefas/${id}/responsavel`, { responsavel_id }).then(pegarDados);
export const moverTarefa = (id, kanban_status) =>
  api.patch(`/tarefas/${id}/status`, { kanban_status }).then(pegarDados);

// ---------- Kanban ----------

export const buscarKanbanProjeto = (id, filtros) =>
  api.get(`/projetos/${id}/kanban`, { params: filtros }).then(pegarDados);
export const buscarMeuKanban = (filtros) =>
  api.get("/usuarios/me/kanban", { params: filtros }).then(pegarDados);
export const buscarKanbanUsuario = (id, filtros) =>
  api.get(`/usuarios/${id}/kanban`, { params: filtros }).then(pegarDados);

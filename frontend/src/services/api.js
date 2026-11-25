import axios from "axios";
import { getToken, limparSessao } from "./sessao";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/v1"
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    if (erro.response?.status === 401 && !erro.config.url.includes("/auth/")) {
      limparSessao();
      window.location.href = "/";
    }
    return Promise.reject(erro);
  }
);

export function mensagemDeErro(erro) {
  if (!erro.response) {
    return "Não foi possível conectar ao servidor.";
  }
  return erro.response.data?.erro || "Ocorreu um erro. Tente novamente.";
}

async function listar(caminho, filtros) {
  const resposta = await api.get(caminho, {
    params: { ...filtros, tamanho_pagina: 100 }
  });
  return resposta.data.dados;
}

export async function login(email, senha) {
  const resposta = await api.post("/auth/login", { email, senha });
  return resposta.data;
}

export function concluirPerfilInicial(dados) {
  return api.post("/auth/perfil-inicial", dados);
}

export async function logout() {
  try {
    await api.post("/auth/logout");
  } catch {
    return;
  } finally {
    limparSessao();
  }
}

export function alterarSenha(senha_atual, senha_nova) {
  return api.patch("/auth/senha", { senha_atual, senha_nova });
}

export function listarUsuarios() {
  return listar("/usuarios");
}

export function criarUsuario(dados) {
  return api.post("/usuarios", dados);
}

export function editarUsuario(id, dados) {
  return api.patch(`/usuarios/${id}`, dados);
}

export function alterarStatusUsuario(id, status) {
  return api.patch(`/usuarios/${id}/status`, { status });
}

export function listarClientes() {
  return listar("/clientes");
}

export function criarCliente(dados) {
  return api.post("/clientes", dados);
}

export function editarCliente(id, dados) {
  return api.patch(`/clientes/${id}`, dados);
}

export function alterarStatusCliente(id, status) {
  return api.patch(`/clientes/${id}/status`, { status });
}

export async function listarModelos() {
  const resposta = await api.get("/modelos-lancamento");
  return resposta.data;
}

export async function buscarModelo(id) {
  const resposta = await api.get(`/modelos-lancamento/${id}`);
  return resposta.data;
}

export async function criarModelo(nome) {
  const resposta = await api.post("/modelos-lancamento", { nome });
  return resposta.data;
}

export function editarModelo(id, nome) {
  return api.patch(`/modelos-lancamento/${id}`, { nome });
}

export function excluirModelo(id) {
  return api.delete(`/modelos-lancamento/${id}`);
}

export function criarTarefaPadrao(modeloId, dados) {
  return api.post(`/modelos-lancamento/${modeloId}/tarefas-padrao`, dados);
}

export function editarTarefaPadrao(modeloId, tarefaId, dados) {
  return api.patch(`/modelos-lancamento/${modeloId}/tarefas-padrao/${tarefaId}`, dados);
}

export function excluirTarefaPadrao(modeloId, tarefaId) {
  return api.delete(`/modelos-lancamento/${modeloId}/tarefas-padrao/${tarefaId}`);
}

export function listarProjetos(filtros) {
  return listar("/projetos", filtros);
}

export function criarProjeto(dados) {
  return api.post("/projetos", dados);
}

export function editarProjeto(id, dados) {
  return api.patch(`/projetos/${id}`, dados);
}

export function alterarStatusProjeto(id, status) {
  return api.patch(`/projetos/${id}/status`, { status });
}

export async function buscarProgressoProjeto(id) {
  const resposta = await api.get(`/projetos/${id}/progresso`);
  return resposta.data;
}

export function listarTarefas() {
  return listar("/tarefas");
}

export async function listarTarefasAtrasadas() {
  const resposta = await api.get("/tarefas/atrasadas");
  return resposta.data;
}

export function criarTarefa(dados) {
  return api.post("/tarefas", dados);
}

export function editarTarefa(id, dados) {
  return api.patch(`/tarefas/${id}`, dados);
}

export function excluirTarefa(id) {
  return api.delete(`/tarefas/${id}`);
}

export function moverTarefa(id, kanban_status) {
  return api.patch(`/tarefas/${id}/status`, { kanban_status });
}

export async function buscarKanbanProjeto(id) {
  const resposta = await api.get(`/projetos/${id}/kanban`);
  return resposta.data;
}

export async function buscarKanbanUsuario(id) {
  const resposta = await api.get(`/usuarios/${id}/kanban`);
  return resposta.data;
}

export async function buscarMeuKanban() {
  const resposta = await api.get("/usuarios/me/kanban");
  return resposta.data;
}

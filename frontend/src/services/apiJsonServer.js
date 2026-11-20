// TEMPORÁRIO: chamadas antigas ao JSON Server (frontend/server.json).
// Cada tela vai sendo migrada para services/api.js (contrato da API);
// quando nenhuma tela usar mais este arquivo, ele será apagado.
import axios from "axios";
import { ehAdministrador, NIVEL_COLABORADOR } from "../utils/perfil";

const jsonServer = axios.create({ baseURL: "http://localhost:3001" });

// CADASTRO DE USUÁRIO
export async function cadastrarUsuario(nome, email, senha) {
  const resposta = await jsonServer.get("/usuarios");

  const emailExiste = resposta.data.some(
    (usuario) =>
      usuario.email?.trim().toLowerCase() === email.trim().toLowerCase()
  );

  if (emailExiste) {
    throw new Error("Este e-mail já está cadastrado.");
  }

  const cadastro = await jsonServer.post("/usuarios", {
    nome: nome.trim(),
    email: email.trim(),
    senha,
    nivel_acesso: NIVEL_COLABORADOR,
  });

  return cadastro.data;
}

// TAREFAS
export async function getTarefas(usuario) {
  const resposta = await jsonServer.get("/tarefas");
  const tarefas = resposta.data;

  if (!usuario || ehAdministrador(usuario)) {
    return tarefas;
  }

  return tarefas.filter(
    (tarefa) =>
      tarefa.responsavel?.trim().toLowerCase() ===
      usuario.nome?.trim().toLowerCase()
  );
}

export async function criarTarefa(tarefa) {
  const resposta = await jsonServer.post("/tarefas", tarefa);
  return resposta.data;
}

export async function atualizarTarefa(id, tarefa) {
  const resposta = await jsonServer.put(`/tarefas/${id}`, tarefa);
  return resposta.data;
}

// PROJETOS
export async function getProjetos(usuario) {
  const resposta = await jsonServer.get("/projetos");
  const projetos = resposta.data;

  if (!usuario || ehAdministrador(usuario)) {
    return projetos;
  }

  return projetos.filter((projeto) =>
    projeto.responsaveis?.some(
      (nome) =>
        nome.trim().toLowerCase() ===
        usuario.nome?.trim().toLowerCase()
    )
  );
}

export async function criarProjeto(projeto) {
  const resposta = await jsonServer.post("/projetos", projeto);
  return resposta.data;
}

export async function atualizarProjeto(id, projeto) {
  const resposta = await jsonServer.put(`/projetos/${id}`, projeto);
  return resposta.data;
}

// CLIENTES
export async function getClientes() {
  const resposta = await jsonServer.get("/clientes");
  return resposta.data;
}

export async function criarCliente(cliente) {
  const resposta = await jsonServer.post("/clientes", cliente);
  return resposta.data;
}

export async function atualizarCliente(id, cliente) {
  const resposta = await jsonServer.put(`/clientes/${id}`, cliente);
  return resposta.data;
}


import axios from "axios";

// Endereço da API de teste
const API_URL = "http://localhost:3000";

// Instância do Axios usada nas requisições
export const api = axios.create({
  baseURL: API_URL,
});

// LOGIN
export async function login(email, senha) {
  const resposta = await api.get("/usuarios");

  const usuario = resposta.data.find(
    (usuario) =>
      usuario.email.toLowerCase() === email.trim().toLowerCase() &&
      usuario.senha === senha
  );

  if (!usuario) {
    throw new Error("E-mail ou senha inválidos.");
  }

  return usuario;
}

// CADASTRO DE USUÁRIO
export async function cadastrarUsuario(email, senha, tipo_usuario) {
  const resposta = await api.get("/usuarios");

  // Verifica se o e-mail já está cadastrado
  const emailExiste = resposta.data.some(
    (usuario) =>
      usuario.email.toLowerCase() === email.trim().toLowerCase()
  );

  if (emailExiste) {
    throw new Error("Este e-mail já está cadastrado.");
  }

  // Cria o novo usuário
  const novoUsuario = {
    email: email.trim(),
    senha,
    tipo_usuario,
  };

  const cadastro = await api.post("/usuarios", novoUsuario);

  return cadastro.data;
}

// TAREFAS
export async function getTarefas() {
  const resposta = await api.get("/tarefas");
  return resposta.data;
}

export async function criarTarefa(tarefa) {
  const resposta = await api.post("/tarefas", tarefa);
  return resposta.data;
}

export async function atualizarTarefa(id, tarefa) {
  const resposta = await api.put(`/tarefas/${id}`, tarefa);
  return resposta.data;
}

// PROJETOS
export async function getProjetos() {
  const resposta = await api.get("/projetos");
  return resposta.data;
}

export async function criarProjeto(projeto) {
  const resposta = await api.post("/projetos", projeto);
  return resposta.data;
}

export async function atualizarProjeto(id, projeto) {
  const resposta = await api.put(`/projetos/${id}`, projeto);
  return resposta.data;
}

// CLIENTES
export async function getClientes() {
  const resposta = await api.get("/clientes");
  return resposta.data;
}

export async function criarCliente(cliente) {
  const resposta = await api.post("/clientes", cliente);
  return resposta.data;
}

export async function atualizarCliente(id, cliente) {
  const resposta = await api.put(`/clientes/${id}`, cliente);
  return resposta.data;
}
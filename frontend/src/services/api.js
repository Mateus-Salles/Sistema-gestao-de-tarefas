import axios from "axios";

const API_URL = "http://localhost:3000";

export const api = axios.create({
  baseURL: API_URL,
});

// Verifica se o usuário é administrador
function ehAdministrador(usuario) {
  const tipo = usuario?.tipo_usuario?.trim().toLowerCase();

  return ["administrador", "admin", "dono"].includes(tipo);
}

// LOGIN
export async function login(email, senha) {
  const resposta = await api.get("/usuarios");

  const usuario = resposta.data.find(
    (usuario) =>
      usuario.email?.trim().toLowerCase() === email.trim().toLowerCase() &&
      usuario.senha === senha
  );

  if (!usuario) {
    throw new Error("E-mail ou senha inválidos.");
  }

  return usuario;
}

// CADASTRO DE USUÁRIO
export async function cadastrarUsuario(nome, email, senha, tipo_usuario) {
  const resposta = await api.get("/usuarios");

  const emailExiste = resposta.data.some(
    (usuario) =>
      usuario.email?.trim().toLowerCase() === email.trim().toLowerCase()
  );

  if (emailExiste) {
    throw new Error("Este e-mail já está cadastrado.");
  }

  const novoUsuario = {
    nome: nome.trim(),
    email: email.trim(),
    senha,
    tipo_usuario,
  };

  const cadastro = await api.post("/usuarios", novoUsuario);

  return cadastro.data;
}

// TAREFAS
export async function getTarefas(usuario) {
  const resposta = await api.get("/tarefas");
  const tarefas = resposta.data;

  // Sem usuário informado, retorna todas para não deixar a tela vazia.
  // Depois conectaremos o usuário logado ao filtro.
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
  const resposta = await api.post("/tarefas", tarefa);
  return resposta.data;
}

export async function atualizarTarefa(id, tarefa) {
  const resposta = await api.put(`/tarefas/${id}`, tarefa);
  return resposta.data;
}

// PROJETOS
export async function getProjetos(usuario) {
  const resposta = await api.get("/projetos");
  const projetos = resposta.data;

  // Sem usuário informado, retorna todos para não deixar a tela vazia.
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
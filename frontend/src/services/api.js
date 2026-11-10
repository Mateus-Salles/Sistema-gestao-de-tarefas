import axios from "axios";
import { ehAdministrador, NIVEL_COLABORADOR } from "../utils/perfil";
import { getToken, limparSessao } from "./sessao";

// Endereço da API. Configure em frontend/.env (veja .env.example).
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const api = axios.create({
  baseURL: API_URL,
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
// O login em si também responde 401 (senha errada), então ele fica de fora.
api.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    const ehLogin = erro.config?.url?.includes("/auth/login");

    if (erro.response?.status === 401 && !ehLogin) {
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

// LOGIN
// Retorna { usuario, token } no mesmo formato da rota POST /v1/auth/login.
// Enquanto o front usa o JSON Server, o usuário é conferido aqui e não há token.
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

  return { usuario, token: null };
}

// LOGOUT
// Com token, avisa a API para revogá-lo (POST /v1/auth/logout).
// Mesmo se a API falhar, a sessão local é encerrada.
export async function logout() {
  try {
    if (getToken()) {
      await api.post("/v1/auth/logout");
    }
  } catch {
    // Ignora: o usuário sai de qualquer forma.
  } finally {
    limparSessao();
  }
}

// CADASTRO DE USUÁRIO
// Todo cadastro público entra como colaborador.
// Só um administrador pode promover alguém (tela de gestão de usuários).
export async function cadastrarUsuario(nome, email, senha) {
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
    nivel_acesso: NIVEL_COLABORADOR,
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
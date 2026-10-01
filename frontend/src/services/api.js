const API_URL = "http://localhost:3000";

export async function login(email, senha) {
  const resposta = await fetch(`${API_URL}/usuarios`);

  const usuarios = await resposta.json();

  const usuario = usuarios.find(
    (usuario) => usuario.email === email && usuario.senha === senha,
  );

  if (!usuario) {
    return null;
  }

  return usuario;
}

export async function getTarefas() {
  const resposta = await fetch(`${API_URL}/tarefas`);
  const dados = await resposta.json();

  return dados;
}

export async function getProjetos() {
  const resposta = await fetch(`${API_URL}/projetos`);

  const dados = await resposta.json();

  return dados;
}

export async function criarTarefa(tarefa) {
  const resposta = await fetch(`${API_URL}/tarefas`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(tarefa),
  });

  return await resposta.json();
}

export async function atualizarTarefa(id, tarefa) {
  const resposta = await fetch(`${API_URL}/tarefas/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(tarefa),
  });

  return await resposta.json();
}

export async function getClientes() {
  const resposta = await fetch(`${API_URL}/clientes`);

  const dados = await resposta.json();

  return dados;
}

export async function criarProjeto(projeto) {
  const resposta = await fetch(`${API_URL}/projetos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(projeto),
  });

  return await resposta.json();
}

export async function atualizarProjeto(id, projeto) {
  const resposta = await fetch(`${API_URL}/projetos/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(projeto),
  });

  return await resposta.json();
}

export async function criarCliente(cliente) {
  const resposta = await fetch(`${API_URL}/clientes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cliente),
  });

  return await resposta.json();
}

export async function atualizarCliente(id, cliente) {
  const resposta = await fetch(`${API_URL}/clientes/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cliente),
  });

  return await resposta.json();
}

const API_URL = "http://localhost:3000"

export async function login(email, senha) {
  const resposta = await fetch(`${API_URL}/usuarios`)

  const usuarios = await resposta.json()

  const usuario = usuarios.find(
    usuario =>
      usuario.email === email &&
      usuario.senha === senha
  )

  if (!usuario) {
    return null
  }

  return usuario
}

export async function getTarefas() {
  const resposta = await fetch(`${API_URL}/tarefas`)
  const dados = await resposta.json()

  return dados
}

export async function criarTarefa(tarefa) {
  const resposta = await fetch(`${API_URL}/tarefas`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(tarefa)
  })

  return await resposta.json()
}
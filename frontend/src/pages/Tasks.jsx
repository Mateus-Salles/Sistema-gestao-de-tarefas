import { useEffect, useState } from "react"
import "./Tasks.css"
import { getTarefas, criarTarefa } from "../services/api"

function Tasks() {
  const [tarefas, setTarefas] = useState([])
  const [mostrarFormulario, setMostrarFormulario] = useState(false)

  const [titulo, setTitulo] = useState("")
  const [descricao, setDescricao] = useState("")
  const [responsavel, setResponsavel] = useState("")
  const [status, setStatus] = useState("A FAZER")

  useEffect(() => {
    async function carregarTarefas() {
      const dados = await getTarefas()
      setTarefas(dados)
    }

    carregarTarefas()
  }, [])

  async function adicionarTarefa() {
    if (!titulo || !responsavel) {
      alert("Preencha o título e o responsável.")
      return
    }

    const novaTarefa = {
      titulo,
      descricao,
      responsavel,
      status
    }

    const tarefaCriada = await criarTarefa(novaTarefa)

    setTarefas([...tarefas, tarefaCriada])

    setTitulo("")
    setDescricao("")
    setResponsavel("")
    setStatus("A FAZER")

    setMostrarFormulario(false)
  }

  const aFazer = tarefas.filter(
    tarefa => tarefa.status === "A FAZER"
  )

  const andamento = tarefas.filter(
    tarefa => tarefa.status === "EM ANDAMENTO"
  )

  const revisao = tarefas.filter(
    tarefa => tarefa.status === "EM REVISÃO"
  )

  const concluidas = tarefas.filter(
    tarefa => tarefa.status === "CONCLUÍDO"
  )

  return (
    <div className="tasks-page">

      <header className="tasks-header">
        <div>
          <h1>Tarefas</h1>
          <p>Gerencie as atividades da equipe.</p>
        </div>

        <button
          className="new-task-button"
          onClick={() => setMostrarFormulario(true)}
        >
          + Nova tarefa
        </button>
      </header>

      {mostrarFormulario && (
        <div className="task-form">

          <h2>Nova tarefa</h2>

          <input
            type="text"
            placeholder="Título da tarefa"
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
          />

          <textarea
            placeholder="Descrição da tarefa"
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
          />

          <input
            type="text"
            placeholder="Responsável"
            value={responsavel}
            onChange={e => setResponsavel(e.target.value)}
          />

          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="A FAZER">A FAZER</option>
            <option value="EM ANDAMENTO">EM ANDAMENTO</option>
            <option value="EM REVISÃO">EM REVISÃO</option>
            <option value="CONCLUÍDO">CONCLUÍDO</option>
          </select>

          <div>
            <button onClick={adicionarTarefa}>
              Salvar tarefa
            </button>

            <button
              onClick={() => setMostrarFormulario(false)}
            >
              Cancelar
            </button>
          </div>

        </div>
      )}

      <section className="kanban">

        <div className="kanban-column">

          <div className="column-header">
            <h2>A FAZER</h2>
            <span>{aFazer.length}</span>
          </div>

          <div className="task-cards">
            {aFazer.map(tarefa => (
              <div className="task-card" key={tarefa.id}>
                <h3>{tarefa.titulo}</h3>
                <p>{tarefa.descricao}</p>

                <div className="task-card-footer">
                  <span>{tarefa.responsavel}</span>
                </div>
              </div>
            ))}
          </div>

        </div>

        <div className="kanban-column">

          <div className="column-header">
            <h2>EM ANDAMENTO</h2>
            <span>{andamento.length}</span>
          </div>

          <div className="task-cards">
            {andamento.map(tarefa => (
              <div className="task-card" key={tarefa.id}>
                <h3>{tarefa.titulo}</h3>
                <p>{tarefa.descricao}</p>

                <div className="task-card-footer">
                  <span>{tarefa.responsavel}</span>
                </div>
              </div>
            ))}
          </div>

        </div>

        <div className="kanban-column">

          <div className="column-header">
            <h2>EM REVISÃO</h2>
            <span>{revisao.length}</span>
          </div>

          <div className="task-cards">
            {revisao.map(tarefa => (
              <div className="task-card" key={tarefa.id}>
                <h3>{tarefa.titulo}</h3>
                <p>{tarefa.descricao}</p>

                <div className="task-card-footer">
                  <span>{tarefa.responsavel}</span>
                </div>
              </div>
            ))}
          </div>

        </div>

        <div className="kanban-column">

          <div className="column-header">
            <h2>CONCLUÍDO</h2>
            <span>{concluidas.length}</span>
          </div>

          <div className="task-cards">
            {concluidas.map(tarefa => (
              <div className="task-card" key={tarefa.id}>
                <h3>{tarefa.titulo}</h3>
                <p>{tarefa.descricao}</p>

                <div className="task-card-footer">
                  <span>{tarefa.responsavel}</span>
                </div>
              </div>
            ))}
          </div>

        </div>

      </section>

    </div>
  )
}

export default Tasks
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
    getTarefas,
    criarTarefa,
    atualizarTarefa
} from "../services/api"
import "./Tasks.css"

function Tasks() {
    const navigate = useNavigate()

    const [tarefas, setTarefas] = useState([])
    const [mostrarFormulario, setMostrarFormulario] = useState(false)

    const [titulo, setTitulo] = useState("")
    const [descricao, setDescricao] = useState("")
    const [responsavel, setResponsavel] = useState("")
    const [divisao, setDivisao] = useState("Produto")
    const [prazo, setPrazo] = useState("")
    const [status, setStatus] = useState("A FAZER")

    const [filtroResponsavel, setFiltroResponsavel] = useState("Todos")
    const [somenteAtrasadas, setSomenteAtrasadas] = useState(false)

    const [tarefaArrastada, setTarefaArrastada] = useState(null)

    useEffect(() => {
        carregarTarefas()
    }, [])

    async function carregarTarefas() {
        const dados = await getTarefas()
        setTarefas(dados)
    }

    async function adicionarTarefa() {
        if (!titulo || !responsavel) {
            alert("Preencha o título e o responsável.")
            return
        }

        const novaTarefa = {
            titulo,
            descricao,
            responsavel,
            divisao,
            prazo,
            status
        }

        const tarefaCriada = await criarTarefa(novaTarefa)

        setTarefas(prev => [...prev, tarefaCriada])

        setTitulo("")
        setDescricao("")
        setResponsavel("")
        setDivisao("Produto")
        setPrazo("")
        setStatus("A FAZER")

        setMostrarFormulario(false)
    }

    function iniciarArraste(event, tarefa) {
        setTarefaArrastada(tarefa)

        event.dataTransfer.effectAllowed = "move"
        event.dataTransfer.setData(
            "text/plain",
            String(tarefa.id)
        )
    }

    function permitirSoltar(event) {
        event.preventDefault()
        event.dataTransfer.dropEffect = "move"
    }

    async function soltarTarefa(event, novoStatus) {
        event.preventDefault()

        let id = event.dataTransfer.getData("text/plain")

        if (!id && tarefaArrastada) {
            id = String(tarefaArrastada.id)
        }

        const tarefa = tarefas.find(
            item => String(item.id) === String(id)
        )

        if (!tarefa) {
            return
        }

        if (tarefa.status === novoStatus) {
            setTarefaArrastada(null)
            return
        }

        const tarefasAnteriores = [...tarefas]

        const tarefasAtualizadas = tarefas.map(item =>
            String(item.id) === String(tarefa.id)
                ? {
                    ...item,
                    status: novoStatus
                }
                : item
        )

        setTarefas(tarefasAtualizadas)
        setTarefaArrastada(null)

        try {
            await atualizarTarefa(
                tarefa.id,
                {
                    ...tarefa,
                    status: novoStatus
                }
            )
        } catch (erro) {
            console.error(erro)

            setTarefas(tarefasAnteriores)

            alert("Não foi possível atualizar a tarefa.")
        }
    }

    function finalizarArraste() {
        setTarefaArrastada(null)
    }

    function tarefaAtrasada(tarefa) {
        if (!tarefa.prazo) {
            return false
        }

        if (tarefa.status === "CONCLUÍDO") {
            return false
        }

        const hoje = new Date()
        hoje.setHours(0, 0, 0, 0)

        const prazo = new Date(tarefa.prazo)
        prazo.setHours(0, 0, 0, 0)

        return prazo < hoje
    }

    const responsaveis = [
        ...new Set(
            tarefas
                .map(tarefa => tarefa.responsavel)
                .filter(Boolean)
        )
    ]

    const tarefasFiltradas = tarefas.filter(tarefa => {
        const correspondeResponsavel =
            filtroResponsavel === "Todos" ||
            tarefa.responsavel === filtroResponsavel

        const correspondeAtrasada =
            !somenteAtrasadas ||
            tarefaAtrasada(tarefa)

        return (
            correspondeResponsavel &&
            correspondeAtrasada
        )
    })

    const aFazer = tarefasFiltradas.filter(
        tarefa => tarefa.status === "A FAZER"
    )

    const andamento = tarefasFiltradas.filter(
        tarefa => tarefa.status === "EM ANDAMENTO"
    )

    const revisao = tarefasFiltradas.filter(
        tarefa => tarefa.status === "EM REVISÃO"
    )

    const concluidas = tarefasFiltradas.filter(
        tarefa => tarefa.status === "CONCLUÍDO"
    )

    function renderizarTarefa(tarefa) {
        return (
            <div
                key={tarefa.id}
                className={
                    tarefaArrastada &&
                    String(tarefaArrastada.id) === String(tarefa.id)
                        ? "kanban-card dragging"
                        : "kanban-card"
                }
                draggable="true"
                onDragStart={event =>
                    iniciarArraste(event, tarefa)
                }
                onDragEnd={finalizarArraste}
            >
                <span
                    className={`tag ${tarefa.divisao
                        ?.toLowerCase()
                        .replace("ã", "a")
                        .replace("á", "a")
                        .replace(" ", "-")}`}
                >
                    {tarefa.divisao || "Produto"}
                </span>

                <h3>{tarefa.titulo}</h3>

                <p>{tarefa.responsavel}</p>

                {tarefa.prazo && (
                    <span
                        className={
                            tarefaAtrasada(tarefa)
                                ? "prazo atrasado"
                                : "prazo"
                        }
                    >
                        {tarefa.prazo}
                    </span>
                )}
            </div>
        )
    }

    return (
        <div className="kanban-page">

            <aside className="sidebar">

                <h2>GESTOR</h2>

                <nav className="sidebar-menu">

                    <button
                        className="menu-item"
                        onClick={() =>
                            navigate("/dashboard")
                        }
                    >
                        Dashboard
                    </button>

                    <button
                        className="menu-item"
                        onClick={() =>
                            navigate("/clientes")
                        }
                    >
                        Clientes
                    </button>

                    <button
                        className="menu-item"
                        onClick={() =>
                            navigate("/projetos")
                        }
                    >
                        Projetos
                    </button>

                    <button className="menu-item active">
                        Kanban
                    </button>

                    <button className="menu-item">
                        Usuários
                    </button>

                </nav>

            </aside>

            <main className="kanban-content">

                <header className="kanban-header">

                    <h1>
                        Kanban · Lançamento Verão — Nutri Maternal
                    </h1>

                    <div className="kanban-user">
                        Henrique · Administrador
                    </div>

                </header>

                <section className="kanban-body">

                    <div className="kanban-top">

                        <div className="kanban-tabs">

                            <button className="tab active">
                                Kanban do projeto
                            </button>

                            <button className="tab">
                                Kanban por colaborador
                            </button>

                        </div>

                        <button
                            className="new-task-button"
                            onClick={() =>
                                setMostrarFormulario(true)
                            }
                        >
                            + Nova tarefa
                        </button>

                    </div>

                    <div className="kanban-filters">

                        <select
                            value={filtroResponsavel}
                            onChange={event =>
                                setFiltroResponsavel(
                                    event.target.value
                                )
                            }
                        >
                            <option value="Todos">
                                Responsável: Todos
                            </option>

                            {responsaveis.map(responsavel => (
                                <option
                                    key={responsavel}
                                    value={responsavel}
                                >
                                    {responsavel}
                                </option>
                            ))}
                        </select>

                        <button
                            className={
                                somenteAtrasadas
                                    ? "filter-button selected"
                                    : "filter-button"
                            }
                            onClick={() =>
                                setSomenteAtrasadas(
                                    !somenteAtrasadas
                                )
                            }
                        >
                            Somente atrasadas
                        </button>

                    </div>

                    {mostrarFormulario && (

                        <div className="task-form">

                            <h2>Nova tarefa</h2>

                            <input
                                type="text"
                                placeholder="Título da tarefa"
                                value={titulo}
                                onChange={event =>
                                    setTitulo(event.target.value)
                                }
                            />

                            <textarea
                                placeholder="Descrição"
                                value={descricao}
                                onChange={event =>
                                    setDescricao(event.target.value)
                                }
                            />

                            <input
                                type="text"
                                placeholder="Responsável"
                                value={responsavel}
                                onChange={event =>
                                    setResponsavel(event.target.value)
                                }
                            />

                            <select
                                value={divisao}
                                onChange={event =>
                                    setDivisao(event.target.value)
                                }
                            >
                                <option value="Produto">
                                    Produto
                                </option>

                                <option value="Conteúdo">
                                    Conteúdo
                                </option>

                                <option value="Tráfego">
                                    Tráfego
                                </option>

                                <option value="Disparos">
                                    Disparos
                                </option>
                            </select>

                            <input
                                type="date"
                                value={prazo}
                                onChange={event =>
                                    setPrazo(event.target.value)
                                }
                            />

                            <select
                                value={status}
                                onChange={event =>
                                    setStatus(event.target.value)
                                }
                            >
                                <option value="A FAZER">
                                    A fazer
                                </option>

                                <option value="EM ANDAMENTO">
                                    Em andamento
                                </option>

                                <option value="EM REVISÃO">
                                    Em revisão
                                </option>

                                <option value="CONCLUÍDO">
                                    Concluído
                                </option>
                            </select>

                            <div className="form-buttons">

                                <button
                                    onClick={adicionarTarefa}
                                >
                                    Salvar
                                </button>

                                <button
                                    onClick={() =>
                                        setMostrarFormulario(false)
                                    }
                                >
                                    Cancelar
                                </button>

                            </div>

                        </div>
                    )}

                    <div className="kanban-board">

                        <div
                            className="kanban-column"
                            onDragOver={permitirSoltar}
                            onDrop={event =>
                                soltarTarefa(
                                    event,
                                    "A FAZER"
                                )
                            }
                        >
                            <div className="column-header">
                                <h2>A fazer</h2>
                                <span>{aFazer.length}</span>
                            </div>

                            <div className="kanban-cards">
                                {aFazer.map(renderizarTarefa)}
                            </div>

                            <div className="add-task">
                                + Adicionar tarefa
                            </div>
                        </div>

                        <div
                            className="kanban-column"
                            onDragOver={permitirSoltar}
                            onDrop={event =>
                                soltarTarefa(
                                    event,
                                    "EM ANDAMENTO"
                                )
                            }
                        >
                            <div className="column-header">
                                <h2>Em andamento</h2>
                                <span>{andamento.length}</span>
                            </div>

                            <div className="kanban-cards">
                                {andamento.map(renderizarTarefa)}
                            </div>

                            <div className="add-task">
                                + Adicionar tarefa
                            </div>
                        </div>

                        <div
                            className="kanban-column"
                            onDragOver={permitirSoltar}
                            onDrop={event =>
                                soltarTarefa(
                                    event,
                                    "EM REVISÃO"
                                )
                            }
                        >
                            <div className="column-header">
                                <h2>Em revisão</h2>
                                <span>{revisao.length}</span>
                            </div>

                            <div className="kanban-cards">
                                {revisao.map(renderizarTarefa)}
                            </div>

                            <div className="add-task">
                                + Adicionar tarefa
                            </div>
                        </div>

                        <div
                            className="kanban-column"
                            onDragOver={permitirSoltar}
                            onDrop={event =>
                                soltarTarefa(
                                    event,
                                    "CONCLUÍDO"
                                )
                            }
                        >
                            <div className="column-header">
                                <h2>Concluído</h2>
                                <span>{concluidas.length}</span>
                            </div>

                            <div className="kanban-cards">
                                {concluidas.map(renderizarTarefa)}
                            </div>

                            <div className="add-task">
                                + Adicionar tarefa
                            </div>
                        </div>

                    </div>

                </section>

            </main>

        </div>
    )
}

export default Tasks
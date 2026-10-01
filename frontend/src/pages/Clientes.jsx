import { useEffect, useState } from "react"
import { getClientes, criarCliente, atualizarCliente } from "../services/api"
import "./Clientes.css"

function Clientes() {
    const [clientes, setClientes] = useState([])
    const [busca, setBusca] = useState("")
    const [statusFiltro, setStatusFiltro] = useState("Todos")
    const [mostrarFormulario, setMostrarFormulario] = useState(false)

    const [nome, setNome] = useState("")
    const [email, setEmail] = useState("")
    const [telefone, setTelefone] = useState("")
    const [projetos, setProjetos] = useState(0)

    useEffect(() => {
        carregarClientes()
    }, [])

    async function carregarClientes() {
        const dados = await getClientes()
        setClientes(dados)
    }

    async function adicionarCliente() {
        if (!nome || !email) {
            alert("Preencha o nome e o e-mail.")
            return
        }

        const novoCliente = {
            nome,
            email,
            telefone,
            projetos: Number(projetos),
            status: "Ativo"
        }

        const clienteCriado = await criarCliente(novoCliente)

        setClientes([...clientes, clienteCriado])

        setNome("")
        setEmail("")
        setTelefone("")
        setProjetos(0)

        setMostrarFormulario(false)
    }

    async function alterarStatus(cliente) {
        const novoStatus =
            cliente.status === "Ativo"
                ? "Inativo"
                : "Ativo"

        const clienteAtualizado = await atualizarCliente(
            cliente.id,
            {
                ...cliente,
                status: novoStatus
            }
        )

        setClientes(
            clientes.map(item =>
                item.id === cliente.id
                    ? clienteAtualizado
                    : item
            )
        )
    }

    function editarCliente(cliente) {
        const novoNome = prompt(
            "Nome do cliente:",
            cliente.nome
        )

        if (!novoNome) {
            return
        }

        atualizarCliente(cliente.id, {
            ...cliente,
            nome: novoNome
        }).then(clienteAtualizado => {
            setClientes(
                clientes.map(item =>
                    item.id === cliente.id
                        ? clienteAtualizado
                        : item
                )
            )
        })
    }

    const clientesFiltrados = clientes.filter(cliente => {

        const correspondeBusca =
            cliente.nome
                .toLowerCase()
                .includes(busca.toLowerCase()) ||
            cliente.email
                .toLowerCase()
                .includes(busca.toLowerCase())

        const correspondeStatus =
            statusFiltro === "Todos" ||
            cliente.status === statusFiltro

        return correspondeBusca && correspondeStatus
    })

    return (
        <div className="clientes-page">

            <div className="clientes-content">

                <div className="clientes-filtros">

                    <input
                        type="text"
                        placeholder="Buscar cliente..."
                        value={busca}
                        onChange={e => setBusca(e.target.value)}
                    />

                    <select
                        value={statusFiltro}
                        onChange={e => setStatusFiltro(e.target.value)}
                    >
                        <option value="Todos">
                            Status: Todos
                        </option>

                        <option value="Ativo">
                            Ativo
                        </option>

                        <option value="Inativo">
                            Inativo
                        </option>
                    </select>

                    <button
                        className="novo-cliente-button"
                        onClick={() => setMostrarFormulario(true)}
                    >
                        + Novo cliente
                    </button>

                </div>

                {mostrarFormulario && (

                    <div className="cliente-form">

                        <h2>Novo cliente</h2>

                        <input
                            type="text"
                            placeholder="Nome do cliente"
                            value={nome}
                            onChange={e => setNome(e.target.value)}
                        />

                        <input
                            type="email"
                            placeholder="E-mail"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />

                        <input
                            type="text"
                            placeholder="Telefone"
                            value={telefone}
                            onChange={e => setTelefone(e.target.value)}
                        />

                        <input
                            type="number"
                            placeholder="Quantidade de projetos"
                            value={projetos}
                            onChange={e => setProjetos(e.target.value)}
                        />

                        <div className="cliente-form-buttons">

                            <button
                                onClick={adicionarCliente}
                            >
                                Salvar
                            </button>

                            <button
                                onClick={() => setMostrarFormulario(false)}
                            >
                                Cancelar
                            </button>

                        </div>

                    </div>

                )}

                <div className="clientes-table">

                    <div className="clientes-table-header">

                        <span>Cliente</span>

                        <span>Contato</span>

                        <span>Projetos</span>

                        <span>Status</span>

                        <span>Ações</span>

                    </div>

                    {clientesFiltrados.map(cliente => (

                        <div
                            className="clientes-table-row"
                            key={cliente.id}
                        >

                            <span>
                                {cliente.nome}
                            </span>

                            <span>
                                {cliente.email}
                            </span>

                            <span>
                                {cliente.projetos}
                            </span>

                            <span>
                                {cliente.status}
                            </span>

                            <span className="acoes">

                                <button
                                    onClick={() =>
                                        editarCliente(cliente)
                                    }
                                >
                                    Editar
                                </button>

                                <span>·</span>

                                <button
                                    onClick={() =>
                                        alterarStatus(cliente)
                                    }
                                >
                                    {cliente.status === "Ativo"
                                        ? "Inativar"
                                        : "Ativar"}
                                </button>

                            </span>

                        </div>

                    ))}

                </div>

            </div>

        </div>
    )
}

export default Clientes
import { useEffect, useState } from "react";
import {
  getProjetos,
  criarProjeto,
  atualizarProjeto
} from "../services/api";
import "./Projetos.css";

function Projetos() {
  const [projetos, setProjetos] = useState([]);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("Todos");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [nome, setNome] = useState("");
  const [cliente, setCliente] = useState("");
  const [tipo, setTipo] = useState("");
  const [prazo, setPrazo] = useState("");
  const [progresso, setProgresso] = useState("0/0");

  const usuario = JSON.parse(localStorage.getItem("usuario") || "null");

  const tipoUsuario = usuario?.tipo_usuario?.trim().toLowerCase();
  const ehAdministrador = [
    "administrador",
    "admin",
    "dono"
  ].includes(tipoUsuario);

  async function carregarProjetos() {
    try {
      const dados = await getProjetos(usuario);
      setProjetos(dados);
    } catch (error) {
      console.error("Erro ao carregar projetos:", error);
    }
  }

  useEffect(() => {
    carregarProjetos();
  }, []);

  async function adicionarProjeto() {
    if (!nome.trim() || !cliente.trim() || !tipo.trim() || !prazo.trim()) {
      alert("Preencha os campos obrigatórios.");
      return;
    }

    const novoProjeto = {
      nome: nome.trim(),
      cliente: cliente.trim(),
      tipo: tipo.trim(),
      prazo: prazo.trim(),
      progresso,
      status: "Ativo",
      responsaveis: []
    };

    try {
      await criarProjeto(novoProjeto);
      await carregarProjetos();

      setNome("");
      setCliente("");
      setTipo("");
      setPrazo("");
      setProgresso("0/0");
      setMostrarFormulario(false);
    } catch (error) {
      console.error("Erro ao criar projeto:", error);
      alert("Não foi possível criar o projeto.");
    }
  }

  async function alterarStatus(projeto) {
    const novoStatus = projeto.status === "Ativo" ? "Inativo" : "Ativo";

    try {
      await atualizarProjeto(projeto.id, {
        ...projeto,
        status: novoStatus
      });

      await carregarProjetos();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Não foi possível atualizar o status.");
    }
  }

  async function editarProjeto(projeto) {
    const novoNome = prompt("Nome do projeto:", projeto.nome);

    if (!novoNome?.trim()) return;

    try {
      await atualizarProjeto(projeto.id, {
        ...projeto,
        nome: novoNome.trim()
      });

      await carregarProjetos();
    } catch (error) {
      console.error("Erro ao editar projeto:", error);
      alert("Não foi possível editar o projeto.");
    }
  }

  const projetosFiltrados = projetos.filter((projeto) => {
    const correspondeBusca =
      (projeto.nome || "").toLowerCase().includes(busca.toLowerCase()) ||
      (projeto.cliente || "").toLowerCase().includes(busca.toLowerCase());

    const correspondeStatus =
      statusFiltro === "Todos" || projeto.status === statusFiltro;

    return correspondeBusca && correspondeStatus;
  });

  return (
    <div className="projetos-page">
      <div className="projetos-content">
        <div className="projetos-filtros">
          <input
            type="text"
            placeholder="Buscar projeto..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
          >
            <option value="Todos">Status: Todos</option>
            <option value="Ativo">Ativo</option>
            <option value="Inativo">Inativo</option>
          </select>

          {ehAdministrador && (
            <button
              className="novo-projeto-button"
              onClick={() => setMostrarFormulario(true)}
            >
              + Novo projeto
            </button>
          )}
        </div>

        {ehAdministrador && mostrarFormulario && (
          <div className="projeto-form">
            <h2>Novo projeto</h2>

            <input
              type="text"
              placeholder="Nome do projeto"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />

            <input
              type="text"
              placeholder="Cliente"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
            />

            <input
              type="text"
              placeholder="Tipo de lançamento"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            />

            <input
              type="text"
              placeholder="Prazo"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
            />

            <input
              type="text"
              placeholder="Progresso. Ex: 5/20"
              value={progresso}
              onChange={(e) => setProgresso(e.target.value)}
            />

            <div className="projeto-form-buttons">
              <button onClick={adicionarProjeto}>Salvar</button>
              <button onClick={() => setMostrarFormulario(false)}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="projetos-table">
          <div className="projetos-table-header">
            <span>Projeto</span>
            <span>Cliente</span>
            <span>Tipo de lançamento</span>
            <span>Prazo</span>
            <span>Progresso</span>
            <span>Status</span>
            <span>Ações</span>
          </div>

          {projetosFiltrados.map((projeto) => (
            <div className="projetos-table-row" key={projeto.id}>
              <span>{projeto.nome}</span>
              <span>{projeto.cliente}</span>
              <span>{projeto.tipo}</span>
              <span>{projeto.prazo}</span>
              <span>{projeto.progresso}</span>
              <span>{projeto.status}</span>

              <span className="acoes">
                {ehAdministrador ? (
                  <>
                    <button onClick={() => editarProjeto(projeto)}>
                      Editar
                    </button>

                    <span>·</span>

                    <button onClick={() => alterarStatus(projeto)}>
                      {projeto.status === "Ativo" ? "Inativar" : "Ativar"}
                    </button>
                  </>
                ) : (
                  <span>Sem ações</span>
                )}
              </span>
            </div>
          ))}

          {projetosFiltrados.length === 0 && (
            <p>Nenhum projeto encontrado.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Projetos;
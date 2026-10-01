import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTarefas, getProjetos } from "../services/api";
import "./Dashboard.css";

function Dashboard() {
  const usuario = JSON.parse(localStorage.getItem("usuario"));
  const navigate = useNavigate();

  const [tarefas, setTarefas] = useState([]);
  const [projetos, setProjetos] = useState([]);

  useEffect(() => {
    async function carregarDados() {
      const tarefas = await getTarefas();
      const projetos = await getProjetos();

      setTarefas(tarefas);
      setProjetos(projetos);
    }

    carregarDados();
  }, []);

  function sair() {
    localStorage.removeItem("usuario");
    navigate("/");
  }

  const totalTarefas = tarefas.length;

  const pendentes = tarefas.filter(
    (tarefa) => tarefa.status === "A FAZER",
  ).length;

  const emAndamento = tarefas.filter(
    (tarefa) => tarefa.status === "EM ANDAMENTO",
  ).length;

  const concluidas = tarefas.filter(
    (tarefa) => tarefa.status === "CONCLUÍDO",
  ).length;

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <h2>GESTOR</h2>

        <nav className="sidebar-menu">
          <button
            className="menu-item active"
            onClick={() => navigate("/dashboard")}
          >
            Dashboard
          </button>

          <button className="menu-item" onClick={() => navigate("/clientes")}>
            Clientes
          </button>

          <button className="menu-item" onClick={() => navigate("/projetos")}>
            Projetos
          </button>

          <button className="menu-item" onClick={() => navigate("/tarefas")}>
            Kanban
          </button>
          
          <button className="menu-item">Usuários</button>
        </nav>

        <button className="logout-button" onClick={sair}>
          Sair
        </button>
      </aside>

      <main className="dashboard-content">
        <header className="dashboard-header">
          <h1>Dashboard</h1>

          <div className="user-info">
            <span>{usuario?.nome || "Usuário"}</span>
            <span>·</span>
            <span>{usuario?.id === 1 ? "Administrador" : "Funcionário"}</span>
          </div>
        </header>

        <section className="dashboard-body">
          <div className="stats">
            <div className="stat-card">
              <span>Total de tarefas</span>
              <strong>{totalTarefas}</strong>
            </div>

            <div className="stat-card">
              <span>Tarefas em andamento</span>
              <strong>{emAndamento}</strong>
            </div>

            <div className="stat-card">
              <span>Tarefas pendentes</span>
              <strong>{pendentes}</strong>
            </div>

            <div className="stat-card">
              <span>Tarefas concluídas</span>
              <strong>{concluidas}</strong>
            </div>
          </div>

          <section className="dashboard-section">
            <h2>Projetos em andamento</h2>

            <div className="project-table">
              <div className="project-table-header">
                <span>Projeto</span>

                <span>Cliente</span>

                <span>Tipo de lançamento</span>

                <span>Prazo</span>

                <span>Progresso</span>
              </div>

              {projetos.map((projeto) => (
                <div className="project-table-row" key={projeto.id}>
                  <span>{projeto.nome}</span>

                  <span>{projeto.cliente}</span>

                  <span>{projeto.tipo}</span>

                  <span>{projeto.prazo}</span>

                  <span>{projeto.progresso}</span>
                </div>
              ))}
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;

import "./Dashboard.css"

function Dashboard() {
    return (
        <div className="dashboard">

            <aside className="sidebar">
                <h2>Gestão de Tarefas</h2>

                <nav>
                    <a href="/dashboard">Dashboard</a>
                    <a href="#">Tarefas</a>
                    <a href="#">Funcionários</a>
                </nav>
            </aside>

            <main className="main-content">

                <header className="dashboard-header">
                    <div>
                        <h1>Dashboard</h1>
                        <p>Visão geral das tarefas da equipe.</p>
                    </div>

                    <div className="user-info">
                        <span>Olá, Usuário</span>
                    </div>
                </header>

                <section className="dashboard-cards">

                    <div className="dashboard-card">
                        <h3>Total de tarefas</h3>
                        <strong>24</strong>
                    </div>

                    <div className="dashboard-card">
                        <h3>Pendentes</h3>
                        <strong>8</strong>
                    </div>

                    <div className="dashboard-card">
                        <h3>Em andamento</h3>
                        <strong>10</strong>
                    </div>

                    <div className="dashboard-card">
                        <h3>Concluídas</h3>
                        <strong>6</strong>
                    </div>

                </section>

                <section className="tasks-section">

                    <div className="section-header">
                        <h2>Tarefas recentes</h2>
                        <button>Ver todas</button>
                    </div>

                    <div className="tasks-list">

                        <div className="task">
                            <div>
                                <h3>Atualizar campanha</h3>
                                <p>Responsável: João</p>
                            </div>

                            <span className="status pending">
                                Pendente
                            </span>
                        </div>

                        <div className="task">
                            <div>
                                <h3>Revisar material</h3>
                                <p>Responsável: Maria</p>
                            </div>

                            <span className="status progress">
                                Em andamento
                            </span>
                        </div>

                        <div className="task">
                            <div>
                                <h3>Publicar conteúdo</h3>
                                <p>Responsável: Carlos</p>
                            </div>

                            <span className="status completed">
                                Concluída
                            </span>
                        </div>

                    </div>

                </section>

            </main>

        </div>
    )
}

export default Dashboard
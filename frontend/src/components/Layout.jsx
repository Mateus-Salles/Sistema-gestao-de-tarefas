import { NavLink, useNavigate } from "react-router-dom";
import {
  getUsuarioLogado,
  ehAdministrador,
  nomeDoNivel
} from "../utils/perfil";
import "./Layout.css";

const ITENS_MENU = [
  { caminho: "/dashboard", rotulo: "Dashboard" },
  { caminho: "/clientes", rotulo: "Clientes", somenteAdmin: true },
  { caminho: "/projetos", rotulo: "Projetos" },
  { caminho: "/tarefas", rotulo: "Kanban" }
];

// Estrutura comum das telas internas: menu lateral, cabeçalho e conteúdo.
function Layout({ titulo, subtitulo, children }) {
  const navigate = useNavigate();
  const usuario = getUsuarioLogado();
  const admin = ehAdministrador(usuario);

  const itensVisiveis = ITENS_MENU.filter(
    (item) => !item.somenteAdmin || admin
  );

  function sair() {
    localStorage.removeItem("usuario");
    navigate("/", { replace: true });
  }

  return (
    <div className="layout">
      <aside className="layout-sidebar">
        <h2 className="layout-marca">GESTOR</h2>

        <nav className="layout-menu">
          {itensVisiveis.map((item) => (
            <NavLink
              key={item.caminho}
              to={item.caminho}
              className={({ isActive }) =>
                isActive ? "layout-menu-item ativo" : "layout-menu-item"
              }
            >
              {item.rotulo}
            </NavLink>
          ))}
        </nav>

        <button className="layout-sair" onClick={sair}>
          Sair
        </button>
      </aside>

      <div className="layout-principal">
        <header className="layout-cabecalho">
          <div>
            <h1>{titulo}</h1>
            {subtitulo && <p>{subtitulo}</p>}
          </div>

          <div className="layout-usuario">
            <strong>{usuario?.nome || "Usuário"}</strong>
            <span>{nomeDoNivel(usuario)}</span>
          </div>
        </header>

        <main className="layout-conteudo">{children}</main>
      </div>
    </div>
  );
}

export default Layout;

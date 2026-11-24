import { NavLink, useNavigate } from "react-router-dom";
import { Container, Nav, Navbar, Button } from "react-bootstrap";
import { getUsuarioLogado, ehAdministrador } from "../services/sessao";
import { logout } from "../services/api";

function Layout({ titulo, children }) {
  const navigate = useNavigate();
  const usuario = getUsuarioLogado();
  const admin = ehAdministrador(usuario);

  async function sair() {
    await logout();
    navigate("/");
  }

  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
        <Container>
          <Navbar.Brand>Gestão de Tarefas</Navbar.Brand>
          <Navbar.Toggle />
          <Navbar.Collapse>
            <Nav className="me-auto">
              <Nav.Link as={NavLink} to="/dashboard">Dashboard</Nav.Link>
              <Nav.Link as={NavLink} to="/tarefas">Kanban</Nav.Link>
              <Nav.Link as={NavLink} to="/projetos">Projetos</Nav.Link>
              {admin && (
                <>
                  <Nav.Link as={NavLink} to="/clientes">Clientes</Nav.Link>
                  <Nav.Link as={NavLink} to="/modelos">Modelos</Nav.Link>
                  <Nav.Link as={NavLink} to="/usuarios">Usuários</Nav.Link>
                </>
              )}
              <Nav.Link as={NavLink} to="/senha">Alterar senha</Nav.Link>
            </Nav>
            <Navbar.Text className="me-3">
              {usuario?.nome} ({admin ? "Administrador" : "Colaborador"})
            </Navbar.Text>
            <Button variant="outline-light" size="sm" onClick={sair}>
              Sair
            </Button>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container className="pb-5">
        <h2 className="mb-4">{titulo}</h2>
        {children}
      </Container>
    </>
  );
}

export default Layout;

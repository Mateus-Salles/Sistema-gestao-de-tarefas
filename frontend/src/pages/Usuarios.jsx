import { useEffect, useState } from "react";
import { Table, Button, Modal, Form, Badge, Alert, Row, Col } from "react-bootstrap";
import {
  listarUsuarios,
  criarUsuario,
  editarUsuario,
  alterarStatusUsuario,
  mensagemDeErro
} from "../services/api";
import { getUsuarioLogado } from "../services/sessao";
import { formatarData } from "../utils/rotulos";
import Layout from "../components/Layout";

function Usuarios() {
  const meuId = getUsuarioLogado().id_usuario;

  const [usuarios, setUsuarios] = useState([]);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [atualizar, setAtualizar] = useState(0);

  const [busca, setBusca] = useState("");
  const [filtroNivel, setFiltroNivel] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");

  const [mostrarModal, setMostrarModal] = useState(false);
  const [idEditando, setIdEditando] = useState(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nivel, setNivel] = useState("colaborador");

  useEffect(() => {
    async function carregar() {
      try {
        setUsuarios(await listarUsuarios());
      } catch (error) {
        setErro(mensagemDeErro(error));
      }
    }
    carregar();
  }, [atualizar]);

  function novoUsuario() {
    setIdEditando(null);
    setNome("");
    setEmail("");
    setSenha("");
    setNivel("colaborador");
    setMostrarModal(true);
  }

  function abrirEdicao(usuario) {
    setIdEditando(usuario.id_usuario);
    setNome(usuario.nome);
    setEmail(usuario.email);
    setNivel(usuario.nivel_acesso);
    setMostrarModal(true);
  }

  async function salvar(e) {
    e.preventDefault();
    setErro("");
    setSucesso("");

    try {
      if (idEditando) {
        const dados = { nome, email };
        if (idEditando !== meuId) {
          dados.nivel_acesso = nivel;
        }
        await editarUsuario(idEditando, dados);
        setSucesso("Usuário atualizado.");
      } else {
        await criarUsuario({ nome, email, senha, nivel_acesso: nivel });
        setSucesso("Usuário criado. Passe a senha inicial para ele.");
      }
      setMostrarModal(false);
      setAtualizar(atualizar + 1);
    } catch (error) {
      setErro(mensagemDeErro(error));
    }
  }

  async function mudarStatus(usuario) {
    setErro("");
    setSucesso("");
    const novoStatus = usuario.status === "ativo" ? "inativo" : "ativo";

    try {
      await alterarStatusUsuario(usuario.id_usuario, novoStatus);
      setAtualizar(atualizar + 1);
    } catch (error) {
      setErro(mensagemDeErro(error));
    }
  }

  const usuariosFiltrados = usuarios.filter((usuario) => {
    const texto = busca.toLowerCase();
    const achouNome =
      usuario.nome.toLowerCase().includes(texto) ||
      usuario.email.toLowerCase().includes(texto);
    const achouNivel = filtroNivel === "" || usuario.nivel_acesso === filtroNivel;
    const achouStatus = filtroStatus === "" || usuario.status === filtroStatus;
    return achouNome && achouNivel && achouStatus;
  });

  return (
    <Layout titulo="Usuários">
      {erro && <Alert variant="danger">{erro}</Alert>}
      {sucesso && <Alert variant="success">{sucesso}</Alert>}

      <Row className="mb-3 g-2">
        <Col md={4}>
          <Form.Control
            placeholder="Buscar por nome ou e-mail"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </Col>
        <Col md={3}>
          <Form.Select value={filtroNivel} onChange={(e) => setFiltroNivel(e.target.value)}>
            <option value="">Todos os níveis</option>
            <option value="administrador">Administrador</option>
            <option value="colaborador">Colaborador</option>
          </Form.Select>
        </Col>
        <Col md={2}>
          <Form.Select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </Form.Select>
        </Col>
        <Col className="text-end">
          <Button onClick={novoUsuario}>Novo usuário</Button>
        </Col>
      </Row>

      <Table bordered hover className="bg-white">
        <thead>
          <tr>
            <th>Nome</th>
            <th>E-mail</th>
            <th>Nível</th>
            <th>Status</th>
            <th>Cadastrado em</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {usuariosFiltrados.map((usuario) => (
            <tr key={usuario.id_usuario}>
              <td>
                {usuario.nome} {usuario.id_usuario === meuId && "(você)"}
              </td>
              <td>{usuario.email}</td>
              <td>{usuario.nivel_acesso === "administrador" ? "Administrador" : "Colaborador"}</td>
              <td>
                {usuario.status === "ativo" ? (
                  <Badge bg="success">Ativo</Badge>
                ) : (
                  <Badge bg="secondary">Inativo</Badge>
                )}
              </td>
              <td>{formatarData(usuario.criado_em)}</td>
              <td>
                <Button size="sm" variant="outline-primary" className="me-2" onClick={() => abrirEdicao(usuario)}>
                  Editar
                </Button>
                {usuario.id_usuario !== meuId && (
                  <Button size="sm" variant="outline-secondary" onClick={() => mudarStatus(usuario)}>
                    {usuario.status === "ativo" ? "Inativar" : "Ativar"}
                  </Button>
                )}
              </td>
            </tr>
          ))}
          {usuariosFiltrados.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center text-muted">
                Nenhum usuário encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </Table>

      <Modal show={mostrarModal} onHide={() => setMostrarModal(false)}>
        <Form onSubmit={salvar}>
          <Modal.Header closeButton>
            <Modal.Title>{idEditando ? "Editar usuário" : "Novo usuário"}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nome</Form.Label>
              <Form.Control
                maxLength={150}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>E-mail</Form.Label>
              <Form.Control
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Form.Group>
            {!idEditando && (
              <Form.Group className="mb-3">
                <Form.Label>Senha inicial</Form.Label>
                <Form.Control
                  type="password"
                  minLength={8}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                />
                <Form.Text>Mínimo de 8 caracteres.</Form.Text>
              </Form.Group>
            )}
            <Form.Group>
              <Form.Label>Nível de acesso</Form.Label>
              <Form.Select
                value={nivel}
                onChange={(e) => setNivel(e.target.value)}
                disabled={idEditando === meuId}
              >
                <option value="colaborador">Colaborador</option>
                <option value="administrador">Administrador</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setMostrarModal(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Layout>
  );
}

export default Usuarios;

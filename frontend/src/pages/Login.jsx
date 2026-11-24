import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Container, Card, Form, Button, Alert } from "react-bootstrap";
import { login, mensagemDeErro } from "../services/api";
import { salvarSessao } from "../services/sessao";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  async function entrar(e) {
    e.preventDefault();
    setErro("");

    try {
      const resposta = await login(email, senha);
      salvarSessao(resposta.usuario, resposta.token);
      navigate("/dashboard");
    } catch (error) {
      setErro(mensagemDeErro(error));
    }
  }

  return (
    <Container className="d-flex justify-content-center align-items-center vh-100">
      <Card style={{ width: "380px" }}>
        <Card.Body className="p-4">
          <h3 className="text-center mb-1">Gestão de Tarefas</h3>
          <p className="text-center text-muted mb-4">Entre com seu e-mail e senha</p>

          {location.state?.aviso && <Alert variant="success">{location.state.aviso}</Alert>}
          {erro && <Alert variant="danger">{erro}</Alert>}

          <Form onSubmit={entrar}>
            <Form.Group className="mb-3">
              <Form.Label>E-mail</Form.Label>
              <Form.Control
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Senha</Form.Label>
              <Form.Control
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </Form.Group>

            <Button type="submit" className="w-100">
              Entrar
            </Button>
          </Form>

          <p className="text-center text-muted small mt-3 mb-0">
            Esqueceu a senha? Fale com um administrador.
          </p>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default Login;

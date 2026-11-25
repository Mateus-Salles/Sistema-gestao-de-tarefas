import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Container, Card, Form, Button, Alert } from "react-bootstrap";
import { concluirPerfilInicial, login, mensagemDeErro } from "../services/api";
import { salvarSessao } from "../services/sessao";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [perfilPendente, setPerfilPendente] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setErro("");
    setAviso("");
    setEnviando(true);

    try {
      if (perfilPendente) {
        const { nome, novo_email, nova_senha } = Object.fromEntries(new FormData(e.currentTarget));
        await concluirPerfilInicial({ email, senha, nome, novo_email, nova_senha });
        setEmail(novo_email.trim().toLowerCase());
        setSenha("");
        setPerfilPendente(false);
        setAviso("Perfil atualizado. Entre com a sua nova senha.");
        return;
      }

      const resposta = await login(email, senha);
      salvarSessao(resposta.usuario, resposta.token);
      navigate("/dashboard");
    } catch (error) {
      if (!perfilPendente && error.response?.data?.codigo === "PERFIL_PENDENTE") {
        setPerfilPendente(true);
      } else {
        setErro(mensagemDeErro(error));
      }
    } finally {
      setEnviando(false);
    }
  }

  function voltarAoLogin() {
    setPerfilPendente(false);
    setSenha("");
    setErro("");
  }

  return (
    <Container className="d-flex justify-content-center align-items-center min-vh-100 py-4">
      <Card style={{ width: "380px" }}>
        <Card.Body className="p-4">
          <h3 className="text-center mb-1">Gestão de Tarefas</h3>
          <p className="text-center text-muted mb-4">
            {perfilPendente ? "Altere seu nome, e-mail e senha para continuar." : "Entre com seu e-mail e senha"}
          </p>

          {(aviso || location.state?.aviso) && !perfilPendente && (
            <Alert variant="success">{aviso || location.state.aviso}</Alert>
          )}
          {erro && <Alert variant="danger">{erro}</Alert>}

          <Form key={perfilPendente ? "perfil-inicial" : "login"} onSubmit={entrar}>
            <fieldset disabled={enviando}>
              {perfilPendente ? (
                <>
                  <Form.Group className="mb-3" controlId="perfil-nome">
                    <Form.Label>Novo nome</Form.Label>
                    <Form.Control name="nome" autoComplete="name" maxLength={150} required />
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="perfil-email">
                    <Form.Label>Novo e-mail</Form.Label>
                    <Form.Control name="novo_email" type="email" autoComplete="email" maxLength={150} required />
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="perfil-senha">
                    <Form.Label>Nova senha</Form.Label>
                    <Form.Control
                      name="nova_senha"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={128}
                      required
                    />
                  </Form.Group>
                </>
              ) : (
                <>
                  <Form.Group className="mb-3" controlId="login-email">
                    <Form.Label>E-mail</Form.Label>
                    <Form.Control
                      type="email"
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="login-senha">
                    <Form.Label>Senha</Form.Label>
                    <Form.Control
                      type="password"
                      autoComplete="current-password"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      required
                    />
                  </Form.Group>
                </>
              )}

              <Button type="submit" className="w-100">
                {perfilPendente ? "Salvar perfil" : "Entrar"}
              </Button>
              {perfilPendente && (
                <Button type="button" variant="link" className="w-100 mt-2" onClick={voltarAoLogin}>
                  Voltar ao login
                </Button>
              )}
            </fieldset>
          </Form>

          {!perfilPendente && (
            <p className="text-center text-muted small mt-3 mb-0">
              Esqueceu a senha? Fale com um administrador.
            </p>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}

export default Login;

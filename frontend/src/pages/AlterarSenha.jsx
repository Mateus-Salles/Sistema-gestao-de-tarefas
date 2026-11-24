import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Form, Button, Alert } from "react-bootstrap";
import { alterarSenha, mensagemDeErro } from "../services/api";
import { limparSessao } from "../services/sessao";
import Layout from "../components/Layout";

function AlterarSenha() {
  const navigate = useNavigate();

  const [senhaAtual, setSenhaAtual] = useState("");
  const [senhaNova, setSenhaNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");

  async function salvar(e) {
    e.preventDefault();
    setErro("");

    if (senhaNova !== confirmacao) {
      setErro("A confirmação não é igual à nova senha.");
      return;
    }

    try {
      await alterarSenha(senhaAtual, senhaNova);
      limparSessao();
      navigate("/", { state: { aviso: "Senha alterada. Entre novamente." } });
    } catch (error) {
      setErro(mensagemDeErro(error));
    }
  }

  return (
    <Layout titulo="Alterar senha">
      <Card style={{ maxWidth: "500px" }}>
        <Card.Body>
          {erro && <Alert variant="danger">{erro}</Alert>}

          <Form onSubmit={salvar}>
            <Form.Group className="mb-3">
              <Form.Label>Senha atual</Form.Label>
              <Form.Control
                type="password"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Nova senha</Form.Label>
              <Form.Control
                type="password"
                minLength={8}
                value={senhaNova}
                onChange={(e) => setSenhaNova(e.target.value)}
                required
              />
              <Form.Text>Mínimo de 8 caracteres.</Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Confirmar nova senha</Form.Label>
              <Form.Control
                type="password"
                minLength={8}
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                required
              />
            </Form.Group>

            <Button type="submit">Alterar senha</Button>
          </Form>
        </Card.Body>
      </Card>
    </Layout>
  );
}

export default AlterarSenha;

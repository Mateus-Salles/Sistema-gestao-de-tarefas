import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login, mensagemDeErro } from "../services/api";
import { salvarSessao } from "../services/sessao";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  async function entrar(e) {
    e.preventDefault();
    setErro("");

    try {
      const sessao = await login(email, senha);

      salvarSessao(sessao);
      navigate("/dashboard", { replace: true });
    } catch (erro) {
      setErro(mensagemDeErro(erro, "Não foi possível entrar."));
    }
  }

  return (
    <div className="login-page">
      <section className="login-info">
        <div className="login-brand">
          <div className="brand-icon">✓</div>
          <span>Gestão de Tarefas</span>
        </div>

        <div className="login-info-content">
          <h1>
            Organize sua equipe.
            <br />
            Gerencie suas tarefas.
          </h1>

          <p>
            Centralize as atividades da equipe e acompanhe o andamento dos
            projetos em um só lugar.
          </p>
        </div>

        <div className="login-footer">
          <span>© 2026 Gestão de Tarefas</span>
        </div>
      </section>

      <section className="login-form-area">
        <div className="login-container">
          <div className="login-header">
            <h2>Bem-vindo</h2>
            <p>Entre com suas credenciais para acessar o sistema.</p>
          </div>

          <form className="login-form" onSubmit={entrar}>
            <div className="form-group">
              <label htmlFor="email">E-mail</label>
              <input
                type="email"
                id="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <div className="password-label">
                <label htmlFor="senha">Senha</label>
                <a href="#">Esqueceu a senha?</a>
              </div>

              <input
                type="password"
                id="senha"
                placeholder="Digite sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>

            {erro && <p className="login-error">{erro}</p>}

            <button type="submit">Entrar</button>

            <p className="cadastro-link">
              Não tem uma conta? <Link to="/cadastro">Cadastre-se</Link>
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}

export default Login;
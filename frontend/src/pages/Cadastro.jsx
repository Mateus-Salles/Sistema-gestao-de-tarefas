import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cadastrarUsuario } from "../services/api";
import "./Cadastro.css";

function Cadastro() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [tipoUsuario, setTipoUsuario] = useState("funcionario");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  async function cadastrar(e) {
    e.preventDefault();
    setErro("");
    setSucesso("");

    try {
      await cadastrarUsuario(email, senha, tipoUsuario);
      setSucesso("Cadastro realizado! Redirecionando para o login...");
      setTimeout(() => navigate("/"), 1200);
    } catch (error) {
      setErro(error.message || "Não foi possível realizar o cadastro.");
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
            Faça parte da equipe.
            <br />
            Organize suas tarefas.
          </h1>
          <p>
            Crie sua conta para acessar o sistema e acompanhar as atividades
            e os projetos.
          </p>
        </div>

        <div className="login-footer">
          <span>© 2026 Gestão de Tarefas</span>
        </div>
      </section>

      <section className="login-form-area">
        <div className="login-container">
          <div className="login-header">
            <h2>Criar conta</h2>
            <p>Preencha os dados para se cadastrar.</p>
          </div>

          <form className="login-form" onSubmit={cadastrar}>
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
              <label htmlFor="senha">Senha</label>
              <input
                type="password"
                id="senha"
                placeholder="Crie uma senha (mínimo 6 caracteres)"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                minLength={6}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="tipoUsuario">Tipo de usuário</label>
              <select
                id="tipoUsuario"
                value={tipoUsuario}
                onChange={(e) => setTipoUsuario(e.target.value)}
              >
                <option value="funcionario">Funcionário</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            {erro && <p className="login-error">{erro}</p>}
            {sucesso && <p className="cadastro-sucesso">{sucesso}</p>}

            <button type="submit">Cadastrar</button>

            <p className="cadastro-link">
              Já tem uma conta? <Link to="/">Entrar</Link>
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}

export default Cadastro;
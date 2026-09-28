import { useState } from "react";
import { login } from "../services/api"
import { useNavigate } from "react-router-dom";

function Login() {
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const navigate = useNavigate();

async function entrar(){
        navigate("/dashboard");
    }

    return (
        <div>
            <h1>Login</h1>
            <input type="email"
            placeholder="E-mail"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}/>

            <input type="password"
            placeholder="Senha"
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)} />

            <button onClick={entrar}>
                Entrar
            </button>
        </div>
    );
}
export default Login;
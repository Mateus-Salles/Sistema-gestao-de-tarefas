const API_URL = "http://127.0.0.1:3000";

// função login 
export async function login(email, senha) {
    const resposta = await fetch(`${API_URL}/auth/login`, {
        method: "POST", 
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: email,
            senha: senha
        })
    });

    const dados = await resposta.json();
    return dados;
}
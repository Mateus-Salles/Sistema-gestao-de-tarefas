const API_URL = "https://api.forcegrowth.com/v1";

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
# Front-end

Front-end do sistema de gestão de tarefas, feito com React, Vite e React-Bootstrap.

## Como rodar

Antes, deixe a API do diretório `backend` rodando.

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

O sistema abre em http://localhost:5173.

No arquivo `.env`, a variável `VITE_API_URL` guarda o endereço da API (padrão: `http://localhost:3000/v1`).

## Telas

- Login
- Dashboard
- Kanban (por projeto, por colaborador e minhas tarefas)
- Projetos
- Clientes (administrador)
- Modelos de lançamento (administrador)
- Usuários (administrador)
- Alterar senha

Não tem cadastro público. Os usuários são criados pelo administrador na tela de Usuários.

## Publicação no Cloudflare Pages

- Diretório raiz: `frontend`
- Comando de build: `npm run build`
- Diretório de saída: `dist`
- Variável de ambiente: `VITE_API_URL` com o endereço da API publicada

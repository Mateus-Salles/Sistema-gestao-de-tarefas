# Front-end — Gestor de Tarefas Forge Growth

Aplicação React (Vite) que consome a API REST do diretório `/backend`,
seguindo o contrato em `docs/openapi.json`.

## Requisitos

- Node.js 22 ou superior
- A API rodando (veja o README do back-end), ou o simulador ligado

## Como rodar

```bash
cd frontend
npm install
cp .env.example .env   # ajuste se precisar
npm run dev
```

A aplicação abre em `http://localhost:5173`.

## Variáveis de ambiente (`frontend/.env`)

| Variável | Para que serve |
|---|---|
| `VITE_API_URL` | Endereço da API, já com o prefixo `/v1`. Padrão: `http://localhost:3000/v1` |
| `VITE_USAR_SIMULADOR` | `true` liga o simulador da API dentro do front, para desenvolver sem o back-end. Qualquer outro valor (ou não definir) usa a API real |

Usuários do simulador: `admin@email.com`, `joao@email.com`, `maria@email.com`
e `pedro@email.com`, todos com a senha `123456`.

> O Vite embute as variáveis no momento do build. Ao mudar o `.env`, reinicie o
> `npm run dev`.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Gera a versão de produção em `dist/` |
| `npm run preview` | Serve o `dist/` localmente |
| `npm run lint` | Verifica o código com o ESLint |

## Telas

| Tela | Rota | Quem acessa |
|---|---|---|
| Login | `/` | Todos |
| Dashboard | `/dashboard` | Todos (o colaborador vê só as próprias tarefas) |
| Kanban | `/tarefas` | Todos. Administrador: Kanban do projeto, por colaborador e as tarefas criadas por ele. Colaborador: as tarefas atribuídas a ele ou criadas por ele |
| Projetos | `/projetos` | Todos. Só o administrador cria, edita e muda o status |
| Clientes | `/clientes` | Administrador |
| Modelos de lançamento | `/modelos` | Administrador |
| Usuários | `/usuarios` | Administrador |
| Alterar senha | `/senha` | Todos |

Não existe cadastro público: as contas são criadas por um administrador na tela
de Usuários.

## Estrutura

```
src/
  components/   Layout (menu lateral), rotas protegidas e estilos comuns (Tela.css)
  pages/        Uma tela por arquivo
  services/     api.js (chamadas à API), sessao.js (token e usuário logado), simulador/
  utils/        Rótulos de status e divisões, verificação de perfil
```

## Publicação (Cloudflare Pages)

- Comando de build: `npm run build`
- Diretório de saída: `dist`
- Diretório raiz: `frontend`
- Variável de ambiente: `VITE_API_URL` com o endereço público da API (ex.:
  `https://sua-api.onrender.com/v1`). **Não** defina `VITE_USAR_SIMULADOR`.

O arquivo `public/_redirects` faz o Pages devolver o `index.html` em qualquer
rota, para que recarregar a página em `/tarefas`, por exemplo, não dê 404.

A API precisa liberar o domínio do Pages no CORS.

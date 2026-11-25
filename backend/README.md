# Backend — Forge Growth

API REST em Node.js e Express, com PostgreSQL e autenticação por JWT. As rotas da API ficam sob `/v1`. O endpoint `GET /health` fica fora desse prefixo e retorna `{"status":"ok"}`. Consulte o [contrato OpenAPI](../docs/openapi.json) para as rotas do sistema.

## Executar com Docker Compose

Na raiz do repositório, crie o arquivo `.env` a partir do [exemplo](../.env.example), caso ainda não tenha um.

```bash
cp .env.example .env
```

Preencha `DB_NAME`, `DB_USER`, `DB_PASS` e `JWT_SECRET`. Deixe `DATABASE_URL` vazio para usar o PostgreSQL do Compose. Em um banco novo, preencha também `ADMIN_INICIAL_SENHA` para criar o [primeiro administrador](#primeiro-administrador).

```bash
docker compose up --build --wait
curl -f http://localhost:3000/health
```

Se você definir outra porta em `APP_PORT`, use esse valor na URL da verificação.

Em um volume novo, o PostgreSQL aplica os scripts `01` a `04` automaticamente. Se o volume já existir, siga as [instruções de atualização](#atualizar-um-banco-existente).

## Executar sem Docker

Use Node.js 22.13 ou superior na série 22, ou Node.js 24. Configure o `.env` na raiz com `DATABASE_URL` ou com `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS` e `DB_NAME`. Defina também `JWT_SECRET`.

Em um banco vazio, aplique o esquema antes de iniciar a API. Execute o comando abaixo na raiz com `DATABASE_URL` definida no terminal. Para configurar a conexão por campos, substitua `"$DATABASE_URL"` por `-h HOST -p PORTA -U USUARIO -d BANCO` usando os mesmos dados da API.

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction \
  -f backend/src/database/01_tabelas_indices.sql \
  -f backend/src/database/02_funcoes_triggers.sql \
  -f backend/src/database/03_views.sql \
  -f backend/src/database/04_modelos_padrao.sql
```

```bash
npm --prefix backend ci
npm --prefix backend run dev
```

Use `npm --prefix backend start` para iniciar sem recarregar a API quando os arquivos mudarem.

### Variáveis da API

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | URL de conexão PostgreSQL. Também é possível configurar a conexão pelas variáveis `DB_*` do exemplo. |
| `DB_SSL` | Use `true` para habilitar TLS com validação do certificado do PostgreSQL. |
| `DB_SSL_CA` | Certificado PEM da autoridade certificadora, opcional com `DB_SSL=true`. |
| `JWT_SECRET` | Segredo obrigatório para assinatura dos tokens. Em produção, use pelo menos 32 bytes. |
| `JWT_EXPIRES_IN` | Validade do token. O padrão é `8h`. |
| `APP_PORT` | Porta HTTP. O padrão é `3000`. |
| `CORS_ORIGINS` | Origens do frontend separadas por vírgula. O padrão permite `localhost:5173` e `127.0.0.1:5173` via HTTP. |
| `ADMIN_INICIAL_SENHA` | Senha provisória de 8 a 128 caracteres usada para cadastrar o primeiro administrador. |

## Atualizar um banco existente

Execute este SQL antes de atualizar a API. A autenticação consulta `usuario_perfil_inicial` no login.

```sql
CREATE TABLE IF NOT EXISTS usuario_perfil_inicial (
    usuario_id INT PRIMARY KEY REFERENCES usuario(id_usuario) ON DELETE CASCADE
);
```

Para atualizar funções, triggers e views, reaplique os scripts `02` e `03`. Inclua o `04` para inserir os modelos e as tarefas padrão que faltarem. Execute a partir da raiz.

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction \
  -f backend/src/database/02_funcoes_triggers.sql \
  -f backend/src/database/03_views.sql \
  -f backend/src/database/04_modelos_padrao.sql
```

## Primeiro administrador

Defina `ADMIN_INICIAL_SENHA` com uma senha provisória no `.env` da raiz. Ao iniciar, a API gera o hash scrypt. Em um banco sem administrador, cria a conta `admin@email.com` com o nome `admin` e registra a pendência de primeiro acesso na mesma transação.

1. Envie `POST /v1/auth/login` com `email` igual a `admin@email.com` e `senha` igual à senha provisória. Enquanto o perfil estiver pendente, a API responde `403` com o código `PERFIL_PENDENTE`.
2. Envie `POST /v1/auth/perfil-inicial` com `email` e `senha` provisórios, além de `nome`, `novo_email` e `nova_senha`. Os três novos valores devem ser diferentes dos provisórios. A API responde `204` quando conclui a configuração.
3. Entre novamente por `POST /v1/auth/login` com as novas credenciais para receber o JWT.

Exemplo de corpo JSON para `POST /v1/auth/perfil-inicial`. Substitua os valores de exemplo pelos dados da conta.

```json
{
  "email": "admin@email.com",
  "senha": "<senha provisória>",
  "nome": "Nome do administrador",
  "novo_email": "administrador@exemplo.com",
  "nova_senha": "<nova senha>"
}
```

Depois de confirmar a criação da conta, você pode remover `ADMIN_INICIAL_SENHA` da configuração. Reiniciar com a variável preenchida preserva o administrador existente.

## Verificações locais

Na raiz do repositório:

```bash
npm --prefix backend run lint
npm --prefix backend test
npm --prefix backend run test:coverage
```

Para os testes de integração, crie um banco PostgreSQL exclusivo com `test` no nome. Os testes limpam os dados desse banco. Copie [`.env.test.example`](.env.test.example) para `backend/.env.test` e ajuste a conexão antes de rodar:

```bash
npm --prefix backend run test:e2e
```

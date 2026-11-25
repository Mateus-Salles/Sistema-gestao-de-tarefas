# Backend — Forge Growth

## Execução da API

Execute `npm start` no diretório `backend` com as variáveis de ambiente do banco e do JWT configuradas. O CORS permite por padrão o frontend local na porta `5173`. Configure `CORS_ORIGINS` com as origens do frontend separadas por vírgula para outros ambientes.

## Atualização do banco de dados

Em bancos já inicializados, reaplique os scripts de funções, triggers e views antes de iniciar a versão atual da API. No diretório `backend`, substitua `seu_usuario` e `seu_banco` pelos dados da conexão.

```bash
psql -v ON_ERROR_STOP=1 -h localhost -U seu_usuario -d seu_banco -1 -f src/database/02_funcoes_triggers.sql -f src/database/03_views.sql
```

Um volume novo do Docker Compose aplica os scripts automaticamente.

## Modelos padrão de lançamento

Em um banco já inicializado, execute o script abaixo no diretório `backend` para cadastrar os quatro modelos e suas tarefas. O script pode ser reaplicado sem duplicar o cadastro.

```bash
psql -v ON_ERROR_STOP=1 -h localhost -U seu_usuario -d seu_banco -f src/database/04_modelos_padrao.sql
```

## Primeiro administrador

Aplique o esquema do banco antes de iniciar a API. Em um banco já instalado, confira se a tabela `usuario_perfil_inicial` existe e, se faltar, execute o `CREATE TABLE usuario_perfil_inicial` de `src/database/01_tabelas_indices.sql`.

Defina `ADMIN_INICIAL_SENHA` com uma senha provisória de 8 a 128 caracteres no `.env` da raiz do repositório ou, no Render, em **Environment**. Inicie a API normalmente com `npm start` no diretório `backend` ou com Docker Compose. A API gera o hash scrypt ao iniciar e envia apenas o hash ao banco.

Se ainda não houver um administrador, a API cria a conta `admin@email.com` com o nome `admin` e registra a pendência de primeiro acesso na mesma transação. Entre com a senha provisória original. O primeiro acesso exige a troca de nome, e-mail e senha.

Depois de confirmar a criação da conta, você pode remover `ADMIN_INICIAL_SENHA` da configuração. Reiniciar com a variável preenchida preserva o administrador existente.

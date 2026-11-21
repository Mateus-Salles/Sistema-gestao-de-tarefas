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

Depois de criar as tabelas, gere o hash da senha no diretório `backend` usando Bash. Informe uma senha nova de 8 a 128 caracteres.

```bash
read -rs -p 'Senha do administrador: ' senha_admin
printf '\n'
printf '%s' "$senha_admin" | node --input-type=module -e '
import { hashPass } from "./src/utils/Password.js";
process.stdin.setEncoding("utf8");
let senha = "";
for await (const trecho of process.stdin) senha += trecho;
console.log(await hashPass(senha));'
unset senha_admin
```

Ainda em `backend`, substitua `seu_usuario` e `seu_banco` pelos dados da conexão. Execute o seed com o `psql` e informe o nome, o e-mail e o hash gerado. O script insere a conta ativa somente se ainda não houver um administrador.

```bash
psql -h localhost -U seu_usuario -d seu_banco -f src/database/seeds/primeiro_administrador.sql
```

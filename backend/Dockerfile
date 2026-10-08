# ── Stage 1: instalar dependências ──────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── Stage 2: imagem final ──────────────────────────────────
FROM node:22-alpine

WORKDIR /app

# Copiar dependências já instaladas
COPY --from=deps /app/node_modules ./node_modules

# Copiar código fonte
COPY package.json ./
COPY src ./src

# Usuário sem privilégios
USER node

EXPOSE 3000

CMD ["node", "src/server.js"]

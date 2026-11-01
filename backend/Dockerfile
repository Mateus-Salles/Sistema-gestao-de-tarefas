# ── Base: manifestos de dependências (camada compartilhada) ──
FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./

# ── Dev: todas as dependências (inclui devDependencies) ─────
FROM base AS dev
RUN npm ci
USER node
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ── Deps de produção: só o necessário para rodar ────────────
FROM base AS deps
RUN npm ci --omit=dev

# ── Produção (último stage = alvo padrão do docker build) ───
FROM node:22-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

# Usuário sem privilégios
USER node

EXPOSE 3000
CMD ["node", "src/server.js"]

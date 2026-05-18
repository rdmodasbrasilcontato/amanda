# ════════════════════════════════════════════════════════
# Amanda AI — Dockerfile
# Node.js 20 Alpine (mínimo, seguro, rápido)
# ════════════════════════════════════════════════════════

FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependências de build
RUN apk add --no-cache python3 make g++

# Copiar apenas manifests primeiro (cache de layers)
COPY package*.json ./
RUN npm ci --only=production=false

# Copiar código e compilar
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ── Imagem final (sem devDependencies) ──────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Metadados
LABEL maintainer="RD Modas Brasil"
LABEL description="Amanda AI — Assistente Virtual WhatsApp"
LABEL version="1.0.0"

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && adduser -S amanda -u 1001

# Instalar apenas dependências de produção
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copiar artefatos compilados
COPY --from=builder /app/dist ./dist
COPY src/database/migrations ./src/database/migrations

# Permissões
RUN chown -R amanda:nodejs /app
USER amanda

# Porta exposta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Iniciar
CMD ["node", "dist/server.js"]

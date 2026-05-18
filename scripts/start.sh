#!/bin/bash
# ════════════════════════════════════════════════════════
# Amanda AI — Iniciar sistema
# Detecta Docker ou PM2 e sobe o ambiente correto
# ════════════════════════════════════════════════════════

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
info() { echo -e "${BLUE}[→]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

cd "$(dirname "$0")/.."

# ── Verificar .env ───────────────────────────────────────
[ ! -f .env ] && err ".env não encontrado. Copie .env.example para .env e preencha."

# Verificar variáveis obrigatórias
for var in OPENAI_API_KEY SUPABASE_URL DATABASE_URL ZAPI_INSTANCE_ID ZAPI_TOKEN; do
  if ! grep -q "^${var}=.\+" .env; then
    err "Variável obrigatória ausente no .env: $var"
  fi
done

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║       Amanda AI — Iniciando Sistema        ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# ── Escolher modo ────────────────────────────────────────
USE_DOCKER=false
if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
  USE_DOCKER=true
fi

if [ "$USE_DOCKER" = true ]; then
  info "Modo: Docker Compose"

  # Build e subir
  docker compose pull redis 2>/dev/null || true
  docker compose up -d --build

  log "Sistema iniciado com Docker!"
  echo ""
  echo "  Status:  docker compose ps"
  echo "  Logs:    docker compose logs -f amanda"
  echo "  Parar:   docker compose down"

else
  info "Modo: PM2 (Node.js direto)"

  # Compilar
  info "Compilando TypeScript..."
  npm run build
  log "Build concluído"

  # PM2
  if command -v pm2 &>/dev/null; then
    pm2 delete amanda-ai 2>/dev/null || true
    pm2 start dist/server.js \
      --name amanda-ai \
      --max-memory-restart 512M \
      --restart-delay 5000 \
      --exp-backoff-restart-delay=100
    pm2 save
    log "Sistema iniciado com PM2!"
    echo ""
    echo "  Status:  pm2 status"
    echo "  Logs:    pm2 logs amanda-ai"
    echo "  Parar:   pm2 stop amanda-ai"
  else
    err "Docker e PM2 não encontrados. Instale um deles primeiro."
  fi
fi

echo ""
info "Health check em 10 segundos..."
sleep 10

PORT=$(grep '^PORT=' .env | cut -d'=' -f2 || echo "3000")
if curl -sf "http://localhost:${PORT}/health" > /dev/null 2>&1; then
  log "Amanda AI respondendo em http://localhost:${PORT}"
else
  warn "Health check falhou — verifique os logs"
fi

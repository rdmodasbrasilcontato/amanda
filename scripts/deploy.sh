#!/bin/bash
# ════════════════════════════════════════════════════════
# Amanda AI — Deploy em Uma Linha
# Uso: bash deploy.sh
# ════════════════════════════════════════════════════════

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
info() { echo -e "${BLUE}[→]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   Amanda AI — Deploy Completo em Nova VPS        ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── Verificar root ───────────────────────────────────────
[[ $EUID -ne 0 ]] && err "Execute como root: sudo bash deploy.sh"

# ── Instalar dependências de sistema ────────────────────
info "Passo 1/6: Instalando dependências do sistema..."
apt-get update -qq
apt-get install -y -qq curl wget git build-essential ca-certificates

# ── Node.js 20 ───────────────────────────────────────────
info "Passo 2/6: Instalando Node.js 20..."
if ! command -v node &>/dev/null || [[ $(node -v | cut -dv -f2 | cut -d. -f1) -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
  apt-get install -y nodejs > /dev/null 2>&1
fi
log "Node.js $(node -v)"
npm install -g pm2 --silent

# ── Docker (opcional) ────────────────────────────────────
if ! command -v docker &>/dev/null; then
  info "Passo 3/6: Instalando Docker..."
  curl -fsSL https://get.docker.com | bash > /dev/null 2>&1
  systemctl enable docker && systemctl start docker
else
  info "Passo 3/6: Docker já instalado"
fi
log "Docker OK"

# ── Clonar/atualizar repositório ─────────────────────────
info "Passo 4/6: Clonando repositório..."
INSTALL_DIR="/opt/amanda"
if [ -d "$INSTALL_DIR/.git" ]; then
  cd "$INSTALL_DIR" && git pull origin main
  log "Repositório atualizado"
else
  git clone https://github.com/rdmodasbrasilcontato/amanda.git "$INSTALL_DIR"
  log "Repositório clonado em $INSTALL_DIR"
fi
cd "$INSTALL_DIR"

# ── Configurar .env ──────────────────────────────────────
info "Passo 5/6: Configurando ambiente..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  warn "════════════════════════════════════════════"
  warn "  CONFIGURE O .env ANTES DE CONTINUAR!"
  warn ""
  warn "  nano $INSTALL_DIR/.env"
  warn ""
  warn "  Variáveis obrigatórias:"
  warn "  - OPENAI_API_KEY"
  warn "  - SUPABASE_URL + SUPABASE_ANON_KEY + SUPABASE_SERVICE_ROLE_KEY"
  warn "  - DATABASE_URL"
  warn "  - ZAPI_INSTANCE_ID + ZAPI_TOKEN + ZAPI_CLIENT_TOKEN"
  warn "  - WEBHOOK_BASE_URL (IP público da VPS)"
  warn "════════════════════════════════════════════"
  echo ""
  read -p "Pressione ENTER após configurar o .env..."
fi

# ── Build e iniciar ──────────────────────────────────────
info "Passo 6/6: Build e iniciando sistema..."
npm ci --only=production=false --silent
npm run build

pm2 delete amanda-ai 2>/dev/null || true
pm2 start dist/server.js \
  --name amanda-ai \
  --max-memory-restart 512M \
  --restart-delay 5000
pm2 save
pm2 startup | tail -1 | bash 2>/dev/null || true

# ── Health check ─────────────────────────────────────────
sleep 8
PORT=$(grep '^PORT=' .env | cut -d'=' -f2 || echo "3000")
if curl -sf "http://localhost:${PORT}/health" > /dev/null 2>&1; then
  log "Amanda AI respondendo na porta $PORT"
else
  warn "Health check falhou — verifique: pm2 logs amanda-ai"
fi

# ── Configurar webhook no Z-API ──────────────────────────
WEBHOOK_URL=$(grep '^WEBHOOK_BASE_URL=' .env | cut -d'=' -f2 || echo "")
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║              Deploy Concluído!                   ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  Status:    pm2 status"
echo "  Logs:      pm2 logs amanda-ai"
echo "  Health:    curl http://localhost:${PORT}/health"
echo ""
if [ -n "$WEBHOOK_URL" ]; then
  echo "  ⚠️  Configure o webhook no Z-API:"
  echo "     URL: ${WEBHOOK_URL}/webhook/zapi"
  echo ""
fi

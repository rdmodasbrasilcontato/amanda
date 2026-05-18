#!/bin/bash
# ════════════════════════════════════════════════════════
# Amanda AI — Instalação automática em VPS Linux
# Testado: Ubuntu 20.04/22.04, Debian 11/12
# Uso: curl -sSL https://raw.githubusercontent.com/rdmodasbrasilcontato/amanda/main/scripts/install.sh | bash
# ════════════════════════════════════════════════════════

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }
info() { echo -e "${BLUE}[→]${NC} $1"; }

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║       Amanda AI — Instalação Automática    ║"
echo "║       RD Modas Brasil                      ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# ── Verificar root ───────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  err "Execute como root: sudo bash install.sh"
fi

# ── Detectar OS ──────────────────────────────────────────
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS=$ID
  VER=$VERSION_ID
  info "Sistema detectado: $PRETTY_NAME"
else
  err "Sistema operacional não suportado"
fi

# ── Atualizar sistema ────────────────────────────────────
info "Atualizando sistema..."
apt-get update -qq
apt-get upgrade -y -qq

# ── Instalar dependências base ───────────────────────────
info "Instalando dependências base..."
apt-get install -y -qq \
  curl wget git unzip build-essential \
  ca-certificates gnupg lsb-release \
  ufw fail2ban htop

# ── Instalar Node.js 20 ──────────────────────────────────
if ! command -v node &>/dev/null || [[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 20 ]]; then
  info "Instalando Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
  log "Node.js $(node -v) instalado"
else
  log "Node.js $(node -v) já instalado"
fi

# ── Instalar Docker ──────────────────────────────────────
if ! command -v docker &>/dev/null; then
  info "Instalando Docker..."
  curl -fsSL https://get.docker.com | bash
  systemctl enable docker
  systemctl start docker
  log "Docker $(docker --version) instalado"
else
  log "Docker $(docker --version) já instalado"
fi

# ── Instalar Docker Compose ──────────────────────────────
if ! command -v docker-compose &>/dev/null && ! docker compose version &>/dev/null 2>&1; then
  info "Instalando Docker Compose..."
  COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep '"tag_name"' | cut -d'"' -f4)
  curl -SL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-x86_64" \
    -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
  log "Docker Compose instalado"
else
  log "Docker Compose já instalado"
fi

# ── Instalar PM2 (alternativa sem Docker) ────────────────
if ! command -v pm2 &>/dev/null; then
  info "Instalando PM2..."
  npm install -g pm2 --silent
  log "PM2 $(pm2 --version) instalado"
else
  log "PM2 já instalado"
fi

# ── Configurar Firewall ──────────────────────────────────
info "Configurando firewall (UFW)..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 3000/tcp comment 'Amanda AI'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable
log "Firewall configurado"

# ── Clonar repositório ───────────────────────────────────
INSTALL_DIR="/opt/amanda"
if [ ! -d "$INSTALL_DIR" ]; then
  info "Clonando repositório..."
  git clone https://github.com/rdmodasbrasilcontato/amanda.git "$INSTALL_DIR"
  log "Repositório clonado em $INSTALL_DIR"
else
  info "Repositório já existe em $INSTALL_DIR — atualizando..."
  cd "$INSTALL_DIR" && git pull origin main
fi

cd "$INSTALL_DIR"

# ── Configurar .env ──────────────────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
  warn "Arquivo .env criado a partir do .env.example"
  warn "EDITE o .env antes de continuar: nano $INSTALL_DIR/.env"
  echo ""
  echo "  Variáveis obrigatórias:"
  echo "  - OPENAI_API_KEY"
  echo "  - SUPABASE_URL"
  echo "  - SUPABASE_ANON_KEY"
  echo "  - SUPABASE_SERVICE_ROLE_KEY"
  echo "  - DATABASE_URL"
  echo "  - ZAPI_INSTANCE_ID"
  echo "  - ZAPI_TOKEN"
  echo "  - ZAPI_CLIENT_TOKEN"
  echo "  - WEBHOOK_BASE_URL"
  echo ""
  echo "Após editar, rode: cd $INSTALL_DIR && bash scripts/start.sh"
else
  log ".env já configurado"
fi

# ── Instalar dependências Node ───────────────────────────
info "Instalando dependências npm..."
npm ci --only=production=false --silent
log "Dependências instaladas"

# ── Configurar serviço systemd (fallback sem Docker) ─────
cat > /etc/systemd/system/amanda-ai.service << EOF
[Unit]
Description=Amanda AI WhatsApp Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=$INSTALL_DIR/.env
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
log "Serviço systemd configurado"

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║   Instalação concluída!                    ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "Próximos passos:"
echo "  1. Edite o .env: nano $INSTALL_DIR/.env"
echo "  2. Suba o sistema: cd $INSTALL_DIR && bash scripts/start.sh"
echo "  3. Veja os logs:  pm2 logs amanda-ai"
echo ""

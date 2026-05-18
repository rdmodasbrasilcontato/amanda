#!/bin/bash
# ════════════════════════════════════════════════════════
# Amanda AI — Atualizar para versão mais recente
# Faz backup automático antes de atualizar
# ════════════════════════════════════════════════════════

set -euo pipefail

GREEN='\033[0;32m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
info() { echo -e "${BLUE}[→]${NC} $1"; }

cd "$(dirname "$0")/.."

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║       Amanda AI — Atualização              ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Backup automático
info "Fazendo backup antes de atualizar..."
bash scripts/backup.sh

# Pull
info "Baixando atualizações..."
git pull origin main
log "Código atualizado"

# Rebuild
info "Compilando..."
npm ci --only=production=false --silent
npm run build
log "Build concluído"

# Restart
info "Reiniciando..."
if command -v docker &>/dev/null && docker compose ps 2>/dev/null | grep -q "amanda"; then
  docker compose up -d --build
else
  pm2 restart amanda-ai
fi

log "Atualização concluída!"

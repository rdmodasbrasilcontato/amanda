#!/bin/bash
# ════════════════════════════════════════════════════════
# Amanda AI — Script de Restore
# Uso: bash scripts/restore.sh [arquivo_backup.tar.gz]
# ════════════════════════════════════════════════════════

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
info() { echo -e "${BLUE}[→]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

cd "$(dirname "$0")/.."

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║       Amanda AI — Restore                  ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# ── Selecionar arquivo de backup ─────────────────────────
BACKUP_FILE="${1:-}"

if [ -z "$BACKUP_FILE" ]; then
  # Listar backups disponíveis
  BACKUPS=($(ls -t backups/amanda_backup_*.tar.gz 2>/dev/null || true))
  if [ ${#BACKUPS[@]} -eq 0 ]; then
    err "Nenhum backup encontrado em ./backups/"
  fi

  echo "Backups disponíveis:"
  for i in "${!BACKUPS[@]}"; do
    SIZE=$(du -sh "${BACKUPS[$i]}" | cut -f1)
    echo "  [$i] ${BACKUPS[$i]} ($SIZE)"
  done
  echo ""
  read -p "Escolha o número do backup [0]: " CHOICE
  CHOICE="${CHOICE:-0}"
  BACKUP_FILE="${BACKUPS[$CHOICE]}"
fi

[ ! -f "$BACKUP_FILE" ] && err "Arquivo não encontrado: $BACKUP_FILE"

info "Restaurando: $BACKUP_FILE"

# ── Confirmar ────────────────────────────────────────────
warn "Isso vai SUBSTITUIR os arquivos atuais (exceto node_modules e dist)"
read -p "Continuar? (s/N): " CONFIRM
[[ "$CONFIRM" != "s" && "$CONFIRM" != "S" ]] && { info "Cancelado."; exit 0; }

# ── Parar sistema ────────────────────────────────────────
info "Parando Amanda AI..."
if command -v docker &>/dev/null && docker compose ps 2>/dev/null | grep -q "amanda"; then
  docker compose down
  log "Docker parado"
elif command -v pm2 &>/dev/null; then
  pm2 stop amanda-ai 2>/dev/null || true
  log "PM2 parado"
fi

# ── Backup do estado atual ───────────────────────────────
if [ -f .env ]; then
  cp .env .env.before_restore
  warn ".env atual salvo como .env.before_restore"
fi

# ── Extrair backup ───────────────────────────────────────
info "Extraindo backup..."
TEMP_DIR=$(mktemp -d)
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

# Encontrar pasta extraída
EXTRACTED_DIR=$(ls "$TEMP_DIR")
SOURCE_DIR="$TEMP_DIR/$EXTRACTED_DIR"

# ── Restaurar arquivos ───────────────────────────────────
info "Restaurando arquivos..."

[ -f "$SOURCE_DIR/.env" ]             && cp "$SOURCE_DIR/.env" .env && log ".env restaurado"
[ -f "$SOURCE_DIR/package.json" ]     && cp "$SOURCE_DIR/package.json" . && log "package.json restaurado"
[ -f "$SOURCE_DIR/tsconfig.json" ]    && cp "$SOURCE_DIR/tsconfig.json" . && log "tsconfig.json restaurado"
[ -d "$SOURCE_DIR/src" ]              && cp -r "$SOURCE_DIR/src" . && log "src/ restaurado"

rm -rf "$TEMP_DIR"

# ── Reinstalar dependências ──────────────────────────────
info "Reinstalando dependências..."
npm ci --only=production=false --silent
log "Dependências reinstaladas"

# ── Rebuild ──────────────────────────────────────────────
info "Compilando..."
npm run build
log "Build concluído"

# ── Reiniciar ────────────────────────────────────────────
info "Reiniciando sistema..."
bash scripts/start.sh

echo ""
log "Restore concluído com sucesso!"

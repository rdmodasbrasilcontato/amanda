#!/bin/bash
# ════════════════════════════════════════════════════════
# Amanda AI — Script de Backup
# Faz backup de: .env, logs, configurações
# (Banco de dados fica no Supabase — backup via dashboard)
# ════════════════════════════════════════════════════════

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
info() { echo -e "${BLUE}[→]${NC} $1"; }

cd "$(dirname "$0")/.."

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
BACKUP_FILE="$BACKUP_DIR/amanda_backup_${TIMESTAMP}.tar.gz"

mkdir -p "$BACKUP_DIR"

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║       Amanda AI — Backup                   ║"
echo "╚════════════════════════════════════════════╝"
echo ""
info "Timestamp: $TIMESTAMP"

# ── Criar backup ─────────────────────────────────────────
info "Criando backup..."

ITEMS_TO_BACKUP=""
[ -f .env ]                  && ITEMS_TO_BACKUP="$ITEMS_TO_BACKUP .env"
[ -f package.json ]          && ITEMS_TO_BACKUP="$ITEMS_TO_BACKUP package.json"
[ -f tsconfig.json ]         && ITEMS_TO_BACKUP="$ITEMS_TO_BACKUP tsconfig.json"
[ -f docker-compose.yml ]    && ITEMS_TO_BACKUP="$ITEMS_TO_BACKUP docker-compose.yml"
[ -d src ]                   && ITEMS_TO_BACKUP="$ITEMS_TO_BACKUP src"
[ -d logs ]                  && ITEMS_TO_BACKUP="$ITEMS_TO_BACKUP logs"

# Metadados do backup
cat > /tmp/amanda_backup_meta.json << EOF
{
  "timestamp": "$TIMESTAMP",
  "version": "$(node -e "console.log(require('./package.json').version)" 2>/dev/null || echo 'unknown')",
  "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "git_branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')",
  "node_version": "$(node -v)",
  "created_by": "amanda backup script"
}
EOF

tar -czf "$BACKUP_FILE" \
  -C "$(pwd)" \
  $ITEMS_TO_BACKUP \
  --transform "s|^|amanda_${TIMESTAMP}/|" \
  2>/dev/null

# Adicionar metadados
tar -rf "$BACKUP_FILE" /tmp/amanda_backup_meta.json \
  --transform "s|.*/|amanda_${TIMESTAMP}/|" 2>/dev/null || true

rm -f /tmp/amanda_backup_meta.json

SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
log "Backup criado: $BACKUP_FILE ($SIZE)"

# ── Limpar backups antigos (manter últimos 10) ───────────
BACKUP_COUNT=$(ls "$BACKUP_DIR"/amanda_backup_*.tar.gz 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt 10 ]; then
  info "Limpando backups antigos (mantendo últimos 10)..."
  ls -t "$BACKUP_DIR"/amanda_backup_*.tar.gz | tail -n +11 | xargs rm -f
  log "Backups antigos removidos"
fi

# ── Listar backups disponíveis ───────────────────────────
echo ""
info "Backups disponíveis:"
ls -lh "$BACKUP_DIR"/amanda_backup_*.tar.gz 2>/dev/null | \
  awk '{print "  " $NF " (" $5 ")"}'

echo ""
log "Backup concluído!"
echo ""
echo "  Para restaurar: bash scripts/restore.sh $BACKUP_FILE"
echo ""

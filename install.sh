#!/bin/bash
# ════════════════════════════════════════════════════════════════════════════
# Amanda AI — Instalador SaaS White-Label
# Uso: bash install.sh
# ════════════════════════════════════════════════════════════════════════════

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; RED='\033[0;31m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
log()     { echo -e "${GREEN}[✓]${NC} $1"; }
warn()    { echo -e "${YELLOW}[!]${NC} $1"; }
info()    { echo -e "${BLUE}[→]${NC} $1"; }
err()     { echo -e "${RED}[✗]${NC} $1"; exit 1; }
step()    { echo -e "\n${CYAN}${BOLD}━━━ $1 ━━━${NC}"; }
ask()     { echo -e "${YELLOW}?${NC} $1"; }

INSTALL_DIR="/opt/amanda"
CLIENT_CONFIG=""

# ════════════════════════════════════════════════════════
# BANNER
# ════════════════════════════════════════════════════════
clear
echo -e "${CYAN}${BOLD}"
cat << 'EOF'
  ╔══════════════════════════════════════════════════════════╗
  ║                                                          ║
  ║          Amanda AI — Instalador White-Label              ║
  ║          Configuração completa em um comando             ║
  ║                                                          ║
  ╚══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"
echo -e "  Este assistente irá configurar a Amanda AI para um novo cliente."
echo -e "  Tempo estimado: ${BOLD}5-10 minutos${NC}\n"

# ════════════════════════════════════════════════════════
# VERIFICAR ROOT
# ════════════════════════════════════════════════════════
[[ $EUID -ne 0 ]] && err "Execute como root: sudo bash install.sh"

# ════════════════════════════════════════════════════════
# PASSO 1: DADOS DO CLIENTE
# ════════════════════════════════════════════════════════
step "PASSO 1/7 — Dados do Cliente"

ask "Nome da empresa (ex: Loja da Maria):"
read -r CLIENT_BUSINESS_NAME
[ -z "$CLIENT_BUSINESS_NAME" ] && err "Nome da empresa é obrigatório"

ask "Nome da assistente virtual (ex: Amanda, Sofia, Julia):"
read -r CLIENT_BOT_NAME
CLIENT_BOT_NAME="${CLIENT_BOT_NAME:-Amanda}"

ask "Segmento do negócio (ex: moda feminina, pet shop, imóveis):"
read -r CLIENT_SEGMENT
CLIENT_SEGMENT="${CLIENT_SEGMENT:-comércio}"

ask "Site da empresa (ex: https://minhaloja.com.br) [opcional]:"
read -r CLIENT_WEBSITE
CLIENT_WEBSITE="${CLIENT_WEBSITE:-}"

ask "Instagram da empresa (ex: https://instagram.com/minhaloja) [opcional]:"
read -r CLIENT_INSTAGRAM
CLIENT_INSTAGRAM="${CLIENT_INSTAGRAM:-}"

ask "Telefone da empresa [opcional]:"
read -r CLIENT_PHONE
CLIENT_PHONE="${CLIENT_PHONE:-}"

ask "Google Maps da empresa (URL completa) [opcional]:"
read -r CLIENT_MAPS
CLIENT_MAPS="${CLIENT_MAPS:-}"

# Slug para identificar o cliente (pasta, domínio, etc.)
CLIENT_SLUG=$(echo "$CLIENT_BUSINESS_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g')
log "Cliente: ${CLIENT_BUSINESS_NAME} | Slug: ${CLIENT_SLUG} | Bot: ${CLIENT_BOT_NAME}"

# ════════════════════════════════════════════════════════
# PASSO 2: CREDENCIAIS — OPENAI
# ════════════════════════════════════════════════════════
step "PASSO 2/7 — OpenAI (IA e análise comportamental)"
echo -e "  Obtenha em: ${BLUE}https://platform.openai.com/api-keys${NC}\n"

ask "OPENAI_API_KEY (sk-proj-...):"
read -r OPENAI_API_KEY
[ -z "$OPENAI_API_KEY" ] && err "OpenAI API Key é obrigatória"

log "OpenAI configurado"

# ════════════════════════════════════════════════════════
# PASSO 3: CREDENCIAIS — SUPABASE
# ════════════════════════════════════════════════════════
step "PASSO 3/7 — Supabase (banco de dados)"
echo -e "  Crie um projeto em: ${BLUE}https://supabase.com${NC}"
echo -e "  Pegue as chaves em: ${BLUE}Project Settings → API${NC}\n"

ask "SUPABASE_URL (https://xxxxxx.supabase.co):"
read -r SUPABASE_URL
[ -z "$SUPABASE_URL" ] && err "Supabase URL é obrigatória"

ask "SUPABASE_ANON_KEY (eyJ...):"
read -r SUPABASE_ANON_KEY
[ -z "$SUPABASE_ANON_KEY" ] && err "Supabase Anon Key é obrigatória"

ask "SUPABASE_SERVICE_ROLE_KEY (eyJ...):"
read -r SUPABASE_SERVICE_ROLE_KEY
[ -z "$SUPABASE_SERVICE_ROLE_KEY" ] && err "Supabase Service Role Key é obrigatória"

ask "DATABASE_URL (postgresql://postgres.[PROJETO]:[SENHA]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require):"
read -r DATABASE_URL
[ -z "$DATABASE_URL" ] && err "Database URL é obrigatória"

# Extrair senha do DATABASE_URL para DB_PASSWORD
DB_PASSWORD=$(echo "$DATABASE_URL" | sed 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/')

log "Supabase configurado"

# ════════════════════════════════════════════════════════
# PASSO 4: CREDENCIAIS — Z-API (WHATSAPP)
# ════════════════════════════════════════════════════════
step "PASSO 4/7 — Z-API (WhatsApp)"
echo -e "  Crie uma instância em: ${BLUE}https://z-api.io${NC}\n"

ask "ZAPI_INSTANCE_ID:"
read -r ZAPI_INSTANCE_ID
[ -z "$ZAPI_INSTANCE_ID" ] && err "Z-API Instance ID é obrigatório"

ask "ZAPI_TOKEN:"
read -r ZAPI_TOKEN
[ -z "$ZAPI_TOKEN" ] && err "Z-API Token é obrigatório"

ask "ZAPI_CLIENT_TOKEN:"
read -r ZAPI_CLIENT_TOKEN
[ -z "$ZAPI_CLIENT_TOKEN" ] && err "Z-API Client Token é obrigatório"

ZAPI_BASE_URL="https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}"
log "Z-API configurado | URL: $ZAPI_BASE_URL"

# ════════════════════════════════════════════════════════
# PASSO 5: SERVIDOR E DOMÍNIO
# ════════════════════════════════════════════════════════
step "PASSO 5/7 — Servidor e Domínio"

# Detectar IP público automaticamente
PUBLIC_IP=$(curl -s --max-time 5 https://api.ipify.org 2>/dev/null || curl -s --max-time 5 http://checkip.amazonaws.com 2>/dev/null || echo "")

ask "IP público ou domínio desta VPS${PUBLIC_IP:+ (detectado: $PUBLIC_IP)} [deixe em branco para usar IP detectado]:"
read -r SERVER_HOST
SERVER_HOST="${SERVER_HOST:-$PUBLIC_IP}"
[ -z "$SERVER_HOST" ] && err "IP/domínio é obrigatório"

ask "Usar SSL com Let's Encrypt? Requer domínio apontado para esta VPS (s/N):"
read -r USE_SSL
USE_SSL=$(echo "${USE_SSL:-n}" | tr '[:upper:]' '[:lower:]')

if [[ "$USE_SSL" == "s" ]]; then
  ask "E-mail para Let's Encrypt (para alertas de renovação):"
  read -r CERTBOT_EMAIL
  [ -z "$CERTBOT_EMAIL" ] && err "E-mail é obrigatório para SSL"
  WEBHOOK_BASE_URL="https://${SERVER_HOST}"
  USE_HTTPS=true
else
  WEBHOOK_BASE_URL="http://${SERVER_HOST}:3000"
  USE_HTTPS=false
  warn "Sem SSL. Para usar com HTTPS depois, execute: bash scripts/enable-ssl.sh"
fi

log "Servidor: $SERVER_HOST | SSL: $USE_HTTPS | Webhook: $WEBHOOK_BASE_URL"

# ════════════════════════════════════════════════════════
# PASSO 6: INSTALAR DEPENDÊNCIAS DO SISTEMA
# ════════════════════════════════════════════════════════
step "PASSO 6/7 — Instalando sistema"

info "Atualizando pacotes..."
apt-get update -qq 2>/dev/null
apt-get install -y -qq curl wget git build-essential ca-certificates openssl 2>/dev/null
log "Pacotes instalados"

# Node.js 20
info "Verificando Node.js..."
if ! command -v node &>/dev/null || [[ $(node -v 2>/dev/null | cut -dv -f2 | cut -d. -f1) -lt 20 ]]; then
  info "Instalando Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
  apt-get install -y -qq nodejs > /dev/null 2>&1
fi
log "Node.js $(node -v)"

# PM2
npm install -g pm2 --silent 2>/dev/null || true
log "PM2 $(pm2 -v 2>/dev/null || echo 'instalado')"

# Docker
if ! command -v docker &>/dev/null; then
  info "Instalando Docker..."
  curl -fsSL https://get.docker.com | bash > /dev/null 2>&1
  systemctl enable docker && systemctl start docker
  log "Docker instalado"
else
  log "Docker já presente"
fi

# Firewall
if command -v ufw &>/dev/null; then
  ufw allow 22/tcp > /dev/null 2>&1 || true
  ufw allow 80/tcp > /dev/null 2>&1 || true
  ufw allow 443/tcp > /dev/null 2>&1 || true
  ufw allow 3000/tcp > /dev/null 2>&1 || true
  ufw --force enable > /dev/null 2>&1 || true
  log "Firewall configurado (22, 80, 443, 3000)"
fi

# ════════════════════════════════════════════════════════
# PASSO 7: INSTALAR E CONFIGURAR AMANDA
# ════════════════════════════════════════════════════════
step "PASSO 7/7 — Configurando Amanda AI"

# Clonar ou atualizar repositório
if [ -d "$INSTALL_DIR/.git" ]; then
  info "Atualizando código..."
  cd "$INSTALL_DIR" && git pull origin main --quiet
else
  info "Clonando repositório..."
  git clone --quiet https://github.com/rdmodasbrasilcontato/amanda.git "$INSTALL_DIR"
fi
cd "$INSTALL_DIR"
log "Código pronto em $INSTALL_DIR"

# Gerar segredos aleatórios
JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
ADMIN_API_KEY=$(openssl rand -hex 24)
WEBHOOK_VERIFY_TOKEN=$(openssl rand -hex 16)

# Gerar prompts personalizados para o cliente
info "Gerando prompts personalizados para ${CLIENT_BUSINESS_NAME}..."
bash scripts/client/generate-prompts.sh \
  "$CLIENT_BOT_NAME" \
  "$CLIENT_BUSINESS_NAME" \
  "$CLIENT_SEGMENT" \
  "${CLIENT_WEBSITE:-}" \
  "${CLIENT_INSTAGRAM:-}" \
  "${CLIENT_PHONE:-}" \
  "${CLIENT_MAPS:-}"
log "Prompts personalizados gerados"

# Escrever .env
info "Configurando variáveis de ambiente..."
cat > "$INSTALL_DIR/.env" << EOF
# ═══════════════════════════════════════════════════════
# Amanda AI — ${CLIENT_BUSINESS_NAME}
# Gerado em: $(date '+%d/%m/%Y %H:%M:%S')
# ═══════════════════════════════════════════════════════

# ─── OPENAI ───
OPENAI_API_KEY=${OPENAI_API_KEY}
OPENAI_MODEL=gpt-4o
OPENAI_FALLBACK_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_WHISPER_MODEL=whisper-1
OPENAI_TTS_MODEL=tts-1
OPENAI_TTS_VOICE=nova
OPENAI_MAX_TOKENS=1024
OPENAI_TEMPERATURE=0.7
OPENAI_TIMEOUT_MS=45000

# ─── SUPABASE ───
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
SUPABASE_STORAGE_BUCKET_AUDIO=amanda-audios
SUPABASE_STORAGE_BUCKET_IMAGES=amanda-imagens
SUPABASE_STORAGE_BUCKET_DOCS=amanda-docs

# ─── POSTGRES ───
DATABASE_URL=${DATABASE_URL}
DB_PASSWORD=${DB_PASSWORD}
DATABASE_MAX_CONNECTIONS=10
DATABASE_SSL=true

# ─── Z-API ───
ZAPI_INSTANCE_ID=${ZAPI_INSTANCE_ID}
ZAPI_TOKEN=${ZAPI_TOKEN}
ZAPI_CLIENT_TOKEN=${ZAPI_CLIENT_TOKEN}
ZAPI_BASE_URL=${ZAPI_BASE_URL}
ZAPI_WEBHOOK_VERIFY_TOKEN=${WEBHOOK_VERIFY_TOKEN}
ZAPI_AUTO_READ=true
ZAPI_TYPING_DELAY_MS=1500

# ─── REDIS ───
REDIS_URL=redis://redis:6379
REDIS_TLS=false
REDIS_TTL_SESSION_SECONDS=86400
REDIS_TTL_DEBOUNCE_SECONDS=8

# ─── APP ───
NODE_ENV=production
PORT=3000
APP_NAME=${CLIENT_BOT_NAME} AI
APP_VERSION=1.0.0
WEBHOOK_BASE_URL=${WEBHOOK_BASE_URL}
ALLOWED_ORIGINS=*
LOG_LEVEL=info
TIMEZONE=America/Sao_Paulo

# ─── NEGÓCIO ───
BUSINESS_NAME=${CLIENT_BUSINESS_NAME}
BUSINESS_PHONE=${CLIENT_PHONE}
BUSINESS_INSTAGRAM=${CLIENT_INSTAGRAM}
BUSINESS_WEBSITE=${CLIENT_WEBSITE}
BUSINESS_GOOGLE_MAPS=${CLIENT_MAPS}

# ─── AMANDA ───
AMANDA_PERSONA_VERSION=v8
AMANDA_DEBOUNCE_MS=8000
AMANDA_TYPING_MIN_MS=1200
AMANDA_TYPING_MAX_MS=3800
AMANDA_AUDIO_REPLY_PROBABILITY=0.15
AMANDA_FOLLOWUP_HOURS_1=2
AMANDA_FOLLOWUP_HOURS_2=24
AMANDA_FOLLOWUP_HOURS_3=72
AMANDA_HANDOFF_KEYWORDS=humano,atendente,vendedor,gerente

# ─── SEGURANÇA ───
JWT_SECRET=${JWT_SECRET}
ADMIN_API_KEY=${ADMIN_API_KEY}
RATE_LIMIT_PER_MINUTE=60

# ─── OBSERVABILIDADE ───
LOG_TRANSPORT=stdout
EOF
log ".env gerado com segredos aleatórios"

# Build
info "Compilando aplicação..."
npm ci --only=production=false --silent 2>/dev/null
npm run build --silent 2>/dev/null
log "Build concluído"

# Iniciar com Docker Compose (preferido) ou PM2
if command -v docker &>/dev/null; then
  info "Iniciando com Docker Compose..."
  docker compose -f docker-compose.yml down 2>/dev/null || true
  docker compose -f docker-compose.yml up -d 2>/dev/null
  log "Containers iniciados"
else
  info "Iniciando com PM2..."
  pm2 delete amanda-ai 2>/dev/null || true
  pm2 start dist/server.js \
    --name amanda-ai \
    --max-memory-restart 512M \
    --restart-delay 5000
  pm2 save
  pm2 startup | tail -1 | bash 2>/dev/null || true
  log "PM2 iniciado"
fi

# SSL com Certbot
if [[ "$USE_HTTPS" == "true" ]]; then
  info "Configurando SSL com Let's Encrypt..."
  bash scripts/enable-ssl.sh "$SERVER_HOST" "$CERTBOT_EMAIL" || warn "SSL falhou — execute manualmente: bash scripts/enable-ssl.sh $SERVER_HOST $CERTBOT_EMAIL"
fi

# Health check
info "Aguardando sistema inicializar..."
sleep 8
PORT_CHECK=3000
if curl -sf "http://localhost:${PORT_CHECK}/health" > /dev/null 2>&1; then
  log "Sistema respondendo ✓"
else
  warn "Health check falhou — pode demorar mais. Verifique: docker compose logs"
fi

# ════════════════════════════════════════════════════════
# RESUMO FINAL
# ════════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}${BOLD}"
cat << 'EOF'
  ╔══════════════════════════════════════════════════════════╗
  ║              Instalação Concluída!                       ║
  ╚══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "  ${BOLD}Cliente:${NC}     ${CLIENT_BUSINESS_NAME}"
echo -e "  ${BOLD}Bot:${NC}         ${CLIENT_BOT_NAME}"
echo -e "  ${BOLD}Diretório:${NC}   ${INSTALL_DIR}"
echo ""
echo -e "  ${BOLD}Próximos passos:${NC}"
echo -e "  ${CYAN}1.${NC} Configure o webhook no Z-API:"
echo -e "     URL: ${YELLOW}${WEBHOOK_BASE_URL}/webhook/zapi${NC}"
echo -e "     Tipo: Receber mensagens"
echo ""
echo -e "  ${CYAN}2.${NC} Aplique o schema no Supabase:"
echo -e "     Cole e execute os SQLs em: ${BLUE}https://supabase.com/dashboard/project/_/sql${NC}"
echo -e "     Arquivos (nesta ordem):"
echo -e "     ${YELLOW}src/database/migrations/001_initial_schema.sql${NC}"
echo -e "     ${YELLOW}src/database/migrations/002_vector_memory.sql${NC}"
echo -e "     ${YELLOW}src/database/migrations/003_full_schema.sql${NC}"
echo -e "     ${YELLOW}src/database/migrations/004_amanda_silent_behavioral.sql${NC}"
echo ""
echo -e "  ${CYAN}3.${NC} Verifique os logs:"
echo -e "     ${YELLOW}docker compose logs -f${NC}   ou   ${YELLOW}pm2 logs amanda-ai${NC}"
echo ""
echo -e "  ${CYAN}4.${NC} Chave do painel admin:"
echo -e "     ${YELLOW}ADMIN_API_KEY=${ADMIN_API_KEY}${NC}"
echo -e "     ${RED}Guarde esta chave em local seguro!${NC}"
echo ""
echo -e "  ${BOLD}Comandos úteis:${NC}"
echo -e "  docker compose ps           # status dos containers"
echo -e "  docker compose logs -f      # logs em tempo real"
echo -e "  bash scripts/backup.sh      # backup manual"
echo -e "  bash scripts/update.sh      # atualizar versão"
echo ""

# Salvar resumo em arquivo
cat > "${INSTALL_DIR}/.install-summary.txt" << SUMMARY
Amanda AI — Instalação: $(date '+%d/%m/%Y %H:%M:%S')
Cliente: ${CLIENT_BUSINESS_NAME}
Bot: ${CLIENT_BOT_NAME}
Servidor: ${SERVER_HOST}
Webhook URL: ${WEBHOOK_BASE_URL}/webhook/zapi
Admin Key: ${ADMIN_API_KEY}
SSL: ${USE_HTTPS}
SUMMARY
log "Resumo salvo em ${INSTALL_DIR}/.install-summary.txt"

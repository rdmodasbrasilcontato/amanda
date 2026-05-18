#!/bin/bash
# ════════════════════════════════════════════════════════
# Amanda AI — Habilitar SSL com Let's Encrypt
# Uso: sudo bash scripts/enable-ssl.sh dominio.com email@exemplo.com
# ════════════════════════════════════════════════════════

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
info() { echo -e "${BLUE}[→]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

DOMAIN="${1:-}"
EMAIL="${2:-}"

[ -z "$DOMAIN" ] && err "Uso: bash scripts/enable-ssl.sh dominio.com email@exemplo.com"
[ -z "$EMAIL" ]  && err "Uso: bash scripts/enable-ssl.sh dominio.com email@exemplo.com"
[[ $EUID -ne 0 ]] && err "Execute como root: sudo bash scripts/enable-ssl.sh"

cd "$(dirname "$0")/.."

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║       Amanda AI — Ativar SSL               ║"
echo "╚════════════════════════════════════════════╝"
echo ""
info "Domínio: $DOMAIN"
info "E-mail:  $EMAIL"
echo ""

# Instalar Certbot
info "Instalando Certbot..."
if ! command -v certbot &>/dev/null; then
  apt-get update -qq
  apt-get install -y -qq certbot python3-certbot-nginx 2>/dev/null || \
    apt-get install -y -qq certbot 2>/dev/null
fi
log "Certbot disponível"

# Parar nginx se estiver rodando na porta 80
if docker ps 2>/dev/null | grep -q nginx; then
  info "Parando nginx temporariamente..."
  docker compose stop nginx 2>/dev/null || true
fi

# Obter certificado (standalone)
info "Obtendo certificado SSL para $DOMAIN..."
certbot certonly \
  --standalone \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  -d "$DOMAIN" \
  --preferred-challenges http
log "Certificado obtido"

CERT_PATH="/etc/letsencrypt/live/${DOMAIN}"
log "Certificados em: $CERT_PATH"

# Gerar configuração nginx com SSL
info "Gerando configuração nginx com SSL..."
mkdir -p nginx

cat > nginx/nginx.conf << NGINX
events {
    worker_connections 1024;
}

http {
    upstream amanda_app {
        server amanda:3000;
    }

    # Redirecionar HTTP → HTTPS
    server {
        listen 80;
        server_name ${DOMAIN};
        return 301 https://\$host\$request_uri;
    }

    # HTTPS
    server {
        listen 443 ssl http2;
        server_name ${DOMAIN};

        ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
        ssl_protocols       TLSv1.2 TLSv1.3;
        ssl_ciphers         HIGH:!aNULL:!MD5;
        ssl_session_cache   shared:SSL:10m;
        ssl_session_timeout 10m;

        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options DENY always;
        add_header X-Content-Type-Options nosniff always;

        client_max_body_size 50M;

        location / {
            proxy_pass http://amanda_app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_cache_bypass \$http_upgrade;
            proxy_read_timeout 90;
        }

        location /health {
            proxy_pass http://amanda_app/health;
            access_log off;
        }
    }
}
NGINX
log "nginx.conf gerado com SSL"

# Atualizar .env com HTTPS
if [ -f .env ]; then
  sed -i "s|^WEBHOOK_BASE_URL=.*|WEBHOOK_BASE_URL=https://${DOMAIN}|" .env
  log ".env atualizado com HTTPS"
fi

# Atualizar docker-compose para montar certificados
info "Atualizando docker-compose para SSL..."
if ! grep -q "letsencrypt" docker-compose.yml 2>/dev/null; then
  # Adicionar volume de certs ao serviço nginx se existir
  warn "Adicione manualmente ao docker-compose.yml os volumes do Let's Encrypt no nginx:"
  warn "  - /etc/letsencrypt:/etc/letsencrypt:ro"
fi

# Reiniciar
info "Reiniciando serviços..."
if command -v docker &>/dev/null && [ -f docker-compose.yml ]; then
  docker compose up -d
else
  pm2 restart amanda-ai 2>/dev/null || true
fi

# Renovação automática
info "Configurando renovação automática do certificado..."
CRON_JOB="0 3 * * 1 certbot renew --quiet && docker compose -C $(pwd) restart nginx"
(crontab -l 2>/dev/null; echo "$CRON_JOB") | sort -u | crontab -
log "Renovação automática configurada (toda segunda às 3h)"

echo ""
log "SSL ativado! Amanda AI rodando em https://${DOMAIN}"
echo ""
echo "  Configure o webhook no Z-API:"
echo "  URL: https://${DOMAIN}/webhook/zapi"
echo ""

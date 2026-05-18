# Amanda AI — Guia Completo de Deploy

## Pré-requisitos

| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| CPU | 1 vCPU | 2 vCPU |
| RAM | 512 MB | 1 GB |
| Disco | 5 GB | 20 GB |
| OS | Ubuntu 20.04+ | Ubuntu 22.04 LTS |
| Node.js | 20.x | 20.x LTS |

## Serviços externos necessários (obrigatórios)

| Serviço | Para quê | Onde criar |
|---------|----------|------------|
| **OpenAI** | Análise comportamental, embeddings, Whisper | platform.openai.com |
| **Supabase** | Banco de dados PostgreSQL + Storage | supabase.com |
| **Z-API** | Integração WhatsApp | z-api.io |

---

## Deploy em Nova VPS (comando único)

```bash
curl -sSL https://raw.githubusercontent.com/rdmodasbrasilcontato/amanda/main/scripts/deploy.sh | sudo bash
```

Ou manualmente:

```bash
sudo bash -c "$(curl -sSL https://raw.githubusercontent.com/rdmodasbrasilcontato/amanda/main/scripts/deploy.sh)"
```

---

## Deploy Manual Passo a Passo

### 1. Clonar o repositório

```bash
git clone https://github.com/rdmodasbrasilcontato/amanda.git
cd amanda
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
nano .env
```

Preencha obrigatoriamente:

```env
OPENAI_API_KEY=sk-proj-...
SUPABASE_URL=https://SEU_PROJETO.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres.SEU_PROJETO:SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require
ZAPI_INSTANCE_ID=SEU_INSTANCE_ID
ZAPI_TOKEN=SEU_TOKEN
ZAPI_CLIENT_TOKEN=SEU_CLIENT_TOKEN
ZAPI_BASE_URL=https://api.z-api.io/instances/SEU_INSTANCE_ID/token/SEU_TOKEN
WEBHOOK_BASE_URL=http://SEU_IP_PUBLICO:3000
NODE_ENV=production
```

### 3. Subir o sistema

```bash
bash scripts/start.sh
```

---

## Deploy com Docker

```bash
cp .env.example .env
nano .env  # preencha as variáveis

docker compose up -d
docker compose logs -f
```

---

## Configurar Webhook no Z-API

Após subir o sistema, configure o webhook no painel Z-API:

- **URL do webhook:** `http://SEU_IP:3000/webhook/zapi`
- **Tipo:** Receber mensagens

---

## Banco de Dados (Supabase)

O schema é aplicado automaticamente via migrations. Se necessário, rode manualmente no SQL Editor do Supabase na ordem:

1. `src/database/migrations/001_initial_schema.sql`
2. `src/database/migrations/002_vector_memory.sql`
3. `src/database/migrations/003_full_schema.sql`
4. `src/database/migrations/004_amanda_silent_behavioral.sql`
5. `fix_schema_v5.sql`
6. `fix_schema_v5_step2.sql`

---

## Comandos úteis

```bash
# Ver logs em tempo real
pm2 logs amanda-ai

# Status
pm2 status

# Reiniciar
pm2 restart amanda-ai

# Parar
pm2 stop amanda-ai

# Health check
curl http://localhost:3000/health

# Admin dashboard
curl -H "x-admin-key: SEU_ADMIN_API_KEY" http://localhost:3000/admin/status

# Backup manual
bash scripts/backup.sh

# Atualizar versão
bash scripts/update.sh
```

---

## Variáveis de Ambiente Completas

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `OPENAI_API_KEY` | ✅ | Chave da API OpenAI |
| `SUPABASE_URL` | ✅ | URL do projeto Supabase |
| `SUPABASE_ANON_KEY` | ✅ | Chave anônima Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Chave de serviço Supabase |
| `DATABASE_URL` | ✅ | URL PostgreSQL (pooler) |
| `ZAPI_INSTANCE_ID` | ✅ | ID da instância Z-API |
| `ZAPI_TOKEN` | ✅ | Token Z-API |
| `ZAPI_CLIENT_TOKEN` | ✅ | Client Token Z-API |
| `WEBHOOK_BASE_URL` | ✅ | IP/domínio público da VPS |
| `PORT` | ❌ | Porta (padrão: 3000) |
| `REDIS_URL` | ❌ | URL Redis (opcional) |
| `ADMIN_API_KEY` | ❌ | Chave do painel admin |
| `JWT_SECRET` | ❌ | Secret JWT |

---

## Solução de Problemas

### Bot não responde mensagens
- Verifique se o webhook está configurado no Z-API
- Verifique se a porta 3000 está aberta no firewall
- Veja os logs: `pm2 logs amanda-ai`

### Erro de banco de dados
- Verifique `DATABASE_URL` no .env
- Rode os scripts SQL no Supabase

### Follow-ups não são enviados
- Verifique se o processo está rodando: `pm2 status`
- O horário comercial é 09h–20h (Brasília)
- Verifique a tabela `followups` no Supabase

### Erro de memória
- Aumente o limite: `pm2 restart amanda-ai --max-memory-restart 1G`

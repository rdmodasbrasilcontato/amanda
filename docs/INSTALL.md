# Amanda AI — Guia de Instalação

## Instalação em um Único Comando

Para qualquer cliente novo, execute em uma VPS Linux limpa:

```bash
curl -sSL https://raw.githubusercontent.com/rdmodasbrasilcontato/amanda/main/install.sh | sudo bash
```

O assistente de instalação vai perguntar:
1. Nome da empresa e da assistente
2. Credenciais OpenAI
3. Credenciais Supabase
4. Credenciais Z-API
5. IP/domínio do servidor
6. Se deseja SSL automático

---

## Pré-requisitos por Cliente

### 1. OpenAI
- Acesse: https://platform.openai.com/api-keys
- Crie uma API Key com saldo suficiente
- Custo estimado: R$ 50–200/mês dependendo do volume

### 2. Supabase (banco de dados)
- Acesse: https://supabase.com
- Crie um novo projeto (plano Free ou Pro)
- Pegue as chaves em: **Project Settings → API**
  - Project URL
  - anon/public key
  - service_role key
- Pegue a URL do banco em: **Project Settings → Database → Connection String (URI)**
  - Use a opção "Session mode" (porta 5432) ou "Transaction mode" (porta 6543)

### 3. Z-API (WhatsApp)
- Acesse: https://z-api.io
- Crie uma instância e conecte ao WhatsApp do cliente
- Pegue: Instance ID, Token, Client Token

### 4. VPS Linux
- Ubuntu 20.04+ ou Debian 11+
- Mínimo: 1 vCPU, 1GB RAM, 20GB disco
- Acesso root via SSH

---

## Schema do Banco de Dados

Após criar o projeto Supabase, aplique os migrations no SQL Editor:

1. `src/database/migrations/001_initial_schema.sql`
2. `src/database/migrations/002_vector_memory.sql`
3. `src/database/migrations/003_full_schema.sql`
4. `src/database/migrations/004_amanda_silent_behavioral.sql`

Acesse: https://supabase.com/dashboard/project/[SEU-PROJETO]/sql

---

## Configurar Webhook no Z-API

Após a instalação, configure no painel Z-API:
- **URL:** `http://SEU-IP:3000/webhook/zapi` (ou `https://SEU-DOMINIO/webhook/zapi` com SSL)
- **Tipo:** Receber mensagens

---

## Verificar Instalação

```bash
# Health check
curl http://localhost:3000/health

# Logs
docker compose logs -f
# ou
pm2 logs amanda-ai

# Status
docker compose ps
# ou
pm2 status
```

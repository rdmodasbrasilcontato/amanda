# DEPLOY RUNBOOK — Amanda AI

**Audiência:** outra sessão Claude (ou operador humano) com acesso RDP/PowerShell à VPS Windows.
**Objetivo:** subir Amanda AI na VPS `85.208.51.87`, conectar Z-API + Supabase + OpenAI, e fazer teste de envio de mensagem WhatsApp.
**Tempo estimado:** 15–25 min.
**Idempotente:** sim — pode re-rodar qualquer passo.

> 🔐 **Os segredos NÃO estão neste arquivo** (push rejeitado pelo secret scanning). O usuário (Renan / RD Modas) deve fornecer o arquivo `.env` por canal seguro (mensagem direta no chat Claude, paste em RDP, ou copiar via clipboard remoto). Ver Etapa 3.

---

## Contexto

| | Valor |
|---|---|
| **VPS** | Windows, `85.208.51.87`, 4 cores / 8GB / 75GB NVMe |
| **App port** | `3000` |
| **Branch git** | `claude/add-message-sanitizer-y7KMu` |
| **Repo** | `rdmodasbrasilcontato/amanda` |
| **DB** | Supabase (pooler `aws-0-sa-east-1.pooler.supabase.com:6543`) |
| **Z-API instância** | `3F14410AB846D1B63CF10E5C90DD1B0B` |
| **Diretório alvo na VPS** | `C:\amanda` |

---

## Pré-requisitos

PowerShell **como Administrador** na VPS:

```powershell
# 1. Admin?
[Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent() | Select-Object -ExpandProperty IsInRole -ArgumentList ([Security.Principal.WindowsBuiltInRole]::Administrator)
# Esperado: True

# 2. Internet outbound funcionando?
Test-NetConnection api.openai.com -Port 443 -InformationLevel Quiet
Test-NetConnection api.z-api.io -Port 443 -InformationLevel Quiet
Test-NetConnection aws-0-sa-east-1.pooler.supabase.com -Port 6543 -InformationLevel Quiet
# Esperado: True nos 3
```

Se algum `False`: revisar firewall outbound antes de continuar.

---

## Etapa 1 — Instalar Node.js 20 + Git

```powershell
if (-not (Get-Command node -ErrorAction SilentlyContinue) -or ([version](node -v).TrimStart('v')).Major -lt 20) {
  winget install -e --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
  $env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path', 'User')
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  winget install -e --id Git.Git --silent --accept-package-agreements --accept-source-agreements
  $env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path', 'User')
}

node -v   # >= v20
npm -v
git --version
```

Se `winget` não estiver disponível: Node em https://nodejs.org/dist/v20.18.1/node-v20.18.1-x64.msi e Git em https://git-scm.com/download/win.

---

## Etapa 2 — Clonar repo no branch correto

```powershell
Set-Location C:\
if (Test-Path C:\amanda) {
  Set-Location C:\amanda
  git fetch origin
  git checkout claude/add-message-sanitizer-y7KMu
  git reset --hard origin/claude/add-message-sanitizer-y7KMu
} else {
  git clone -b claude/add-message-sanitizer-y7KMu https://github.com/rdmodasbrasilcontato/amanda.git C:\amanda
  Set-Location C:\amanda
}

git log --oneline -3
# Esperado: ver commit "refactor: align schema and types..." entre os 3 do topo
```

Se o repo for privado e o clone pedir credenciais: `gh auth login` (instala via `winget install GitHub.cli`) ou usar token pessoal na URL `https://USER:TOKEN@github.com/...`.

---

## Etapa 3 — Receber `.env` do usuário

Os segredos não estão neste runbook. O usuário deve fornecer **o conteúdo completo do `.env`** (chave OpenAI, Supabase keys + senha, Z-API tokens, JWT, etc.) por canal seguro.

### Opção A — Usuário cola direto no PowerShell (mais rápido):

```powershell
# Pedir ao usuário: "cole o conteúdo do .env e pressione Enter duas vezes ao terminar"
$lines = @()
while ($true) {
  $line = Read-Host
  if ([string]::IsNullOrWhiteSpace($line) -and $lines.Count -gt 5) { break }
  $lines += $line
}
$lines -join "`n" | Out-File -FilePath C:\amanda\.env -Encoding utf8 -Force
```

### Opção B — Usuário usa transferência de arquivo via RDP:

Copiar `.env` no PC local → colar em `C:\amanda\.env` na VPS via clipboard do RDP.

### Validar `.env`

```powershell
Test-Path C:\amanda\.env   # True
$envContent = Get-Content C:\amanda\.env
$envContent.Count   # esperado ~50-70 linhas
# Verificar variáveis críticas existem (sem mostrar valores):
@('OPENAI_API_KEY','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','DATABASE_URL','ZAPI_INSTANCE_ID','ZAPI_TOKEN','ZAPI_CLIENT_TOKEN','JWT_SECRET','ADMIN_API_KEY') | ForEach-Object {
  $found = $envContent | Where-Object { $_ -match "^$_=" -and $_ -notmatch '=$' }
  if ($found) { "OK  $_" } else { "MISS $_" }
}
# Esperado: "OK" em todas
```

**Atenção:** a `DATABASE_URL` deve usar o **pooler** Supabase:
```
postgresql://postgres.<PROJECT_REF>:<PASSWORD>@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require
```
Não usar `db.<PROJECT_REF>.supabase.co:5432` (DNS pode falhar dependendo do ambiente).

---

## Etapa 4 — Instalar dependências, rodar migration, build

```powershell
Set-Location C:\amanda
npm install
# Esperado: "found 0 vulnerabilities" (ou poucas)

npm run typecheck
# Esperado: saída vazia (zero erros)

npm run migrate
# Esperado:
#   "Aplicando migration..." version=004_english_complete_schema
#   "✅ Migration aplicada com sucesso"
#   "✅ Todas as migrations aplicadas"

npm run build
# Esperado: cria dist/ sem erros
```

**Troubleshooting migration:**

| Erro | Causa | Ação |
|---|---|---|
| `ENOTFOUND db.xxx.supabase.co` | `.env` aponta pro host direto | Trocar `DATABASE_URL` pro pooler |
| `permission denied to create extension vector` | Extensões pgvector/pg_trgm/uuid-ossp desabilitadas | Supabase Dashboard → Database → Extensions: habilitar `vector`, `pg_trgm`, `uuid-ossp`. Re-rodar `npm run migrate` |
| `password authentication failed` | Senha do DB errada | Verificar `DATABASE_URL` |

---

## Etapa 5 — Abrir porta 3000 no Windows Firewall

```powershell
if (-not (Get-NetFirewallRule -DisplayName "Amanda AI Inbound 3000" -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName "Amanda AI Inbound 3000" `
    -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
}

Get-NetFirewallRule -DisplayName "Amanda AI Inbound 3000" | Format-List DisplayName, Enabled, Action
# Esperado: Enabled=True, Action=Allow
```

> ⚠️ A VPS pode ter firewall **externo** (no painel do provedor da hospedagem) além do Windows Firewall. Se o teste externo da Etapa 7 falhar, abrir 3000 lá também.

---

## Etapa 6 — Subir como serviço com PM2

```powershell
npm install -g pm2 pm2-windows-startup
pm2-startup install

Set-Location C:\amanda
pm2 start dist/server.js --name amanda-ai --time
pm2 save

pm2 status
# Esperado: amanda-ai com status "online"

pm2 logs amanda-ai --lines 30 --nostream
# Esperado ver:
#   "🚀 Iniciando Amanda AI v1.0.0..."
#   "✅ PostgreSQL conectado"
#   "✅ Amanda AI escutando na porta 3000"
```

Se status = "errored" ou "stopped": `pm2 logs amanda-ai --lines 100` e investigar a stack trace.

---

## Etapa 7 — Verificar HTTP response

### 7.1 Localmente na VPS

```powershell
Invoke-RestMethod http://localhost:3000/health
# Esperado: { status: "ok", ... }

Invoke-RestMethod http://localhost:3000/webhook/zapi/health
# Esperado: { status: "ok", service: "zapi-webhook" }
```

### 7.2 Externamente (do seu PC pessoal, no navegador)

Abrir: **http://85.208.51.87:3000/health**

- ✅ JSON na tela → seguir pra Etapa 8
- ❌ Timeout → firewall externo do provedor está bloqueando. Abrir lá

---

## Etapa 8 — Configurar webhook no Z-API

Z-API expõe REST pra setar webhook. Na VPS (substituir `<ZAPI_INSTANCE>` e `<ZAPI_TOKEN>` pelos valores do `.env`):

```powershell
# Carregar valores do .env
Get-Content C:\amanda\.env | ForEach-Object {
  if ($_ -match '^([^=]+)=(.*)$') { [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process') }
}

$base = "https://api.z-api.io/instances/$env:ZAPI_INSTANCE_ID/token/$env:ZAPI_TOKEN"
$headers = @{ "Client-Token" = $env:ZAPI_CLIENT_TOKEN; "Content-Type" = "application/json" }
$webhookUrl = "http://85.208.51.87:3000/webhook/zapi"

# Webhook "Ao receber" (received messages)
Invoke-RestMethod -Method Put -Uri "$base/update-webhook-received" `
  -Headers $headers -Body (@{ value = $webhookUrl } | ConvertTo-Json)

# Webhook "Status da mensagem" (delivery/read receipts) — opcional
Invoke-RestMethod -Method Put -Uri "$base/update-webhook-message-status" `
  -Headers $headers -Body (@{ value = $webhookUrl } | ConvertTo-Json)

# Status da instância
Invoke-RestMethod -Method Get -Uri "$base/status" -Headers $headers
# Esperado: { connected: true, ... }
# Se connected=false: escanear QR code no painel Z-API → "Dados da instância web"
```

> Se Z-API rejeitar HTTP com erro "URL inválida — exige HTTPS": ir pra **Etapa 8-bis** (Cloudflare Tunnel).

### Etapa 8-bis — Cloudflare Tunnel (HTTPS gratuito sem domínio)

```powershell
winget install --id Cloudflare.cloudflared --silent --accept-package-agreements --accept-source-agreements
$env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine')

# Subir tunnel em background
Start-Process -NoNewWindow -FilePath "cloudflared" `
  -ArgumentList "tunnel --url http://localhost:3000" `
  -RedirectStandardOutput C:\amanda\tunnel.log `
  -RedirectStandardError C:\amanda\tunnel.err

Start-Sleep -Seconds 8
Get-Content C:\amanda\tunnel.err | Select-String "trycloudflare.com"
# Anotar a URL https://xxx-yyy-zzz.trycloudflare.com
```

Re-executar bloco da Etapa 8 com `$webhookUrl = "https://xxx-yyy-zzz.trycloudflare.com/webhook/zapi"`.

Pra tunnel permanente (não muda URL a cada reinício): https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/

---

## Etapa 9 — Teste real de WhatsApp

1. De **outro número** WhatsApp (não o conectado na Z-API), envie **"oi"** pro número da loja.
2. Na VPS rodar:
   ```powershell
   pm2 logs amanda-ai
   ```
3. Em 1–5 segundos deve aparecer:
   - `Mensagem recebida` (com phone do remetente)
   - `Amanda response gerada` (com tokensUsed)
   - `Mensagem texto enviada via Z-API`
4. No celular remetente, Amanda responde em poucos segundos.

### Se nada acontecer

| Sintoma | Causa provável | Ação |
|---|---|---|
| Log silencioso | Webhook não chegou | No painel Z-API: confirmar URL salva. Tab "Logs" da Z-API mostra tentativas de webhook |
| `DATABASE error` | Migration falhou | Refazer Etapa 4.2 |
| `OpenAI 401` | Key inválida ou esgotou créditos | Verificar `OPENAI_API_KEY` e billing na OpenAI |
| `Z-API 401/403` | `Client-Token` errado | Painel Z-API → "Segurança" → copiar Client-Token novamente |
| Resposta vazia chegando ao cliente | Sanitizer descartou tudo | `pm2 logs` deve mostrar `Sanitizer: mensagens inválidas removidas` — investigar contexto enviado |
| `connected: false` | WhatsApp não pareado | Escanear QR no painel Z-API |

---

## Comandos úteis pós-deploy

```powershell
pm2 status                     # estado dos processos
pm2 logs amanda-ai             # logs ao vivo
pm2 logs amanda-ai --lines 200 # histórico
pm2 restart amanda-ai          # restart (após mudar .env)
pm2 reload amanda-ai           # zero-downtime reload (após git pull + build)

# Atualizar código:
cd C:\amanda
git pull
npm install
npm run build
pm2 reload amanda-ai
```

---

## URLs finais

| | URL |
|---|---|
| Health | http://85.208.51.87:3000/health |
| Webhook Z-API (entrada) | http://85.208.51.87:3000/webhook/zapi |
| Admin (precisa header `x-admin-key: <ADMIN_API_KEY do .env>`) | http://85.208.51.87:3000/admin/status |

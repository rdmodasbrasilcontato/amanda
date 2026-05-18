# Amanda AI — Guia White-Label

## Como Implantar para um Novo Cliente

### Processo Completo (30 minutos)

#### Passo 1: Preparar credenciais do cliente

Colete antes de ir:
- [ ] CNPJ/nome da empresa
- [ ] Nome da assistente virtual (Amanda, Sofia, Julia, etc.)
- [ ] Segmento do negócio
- [ ] Site, Instagram, telefone, Google Maps
- [ ] Acesso à conta OpenAI (ou criar uma nova)
- [ ] Acesso ao Supabase (criar novo projeto)
- [ ] Acesso ao Z-API (criar nova instância)
- [ ] IP ou domínio da VPS

#### Passo 2: Criar projeto Supabase

1. Acesse https://supabase.com e crie um novo projeto
2. Nome sugerido: `amanda-[nome-cliente]` (ex: `amanda-loja-maria`)
3. Anote as credenciais (URL, anon key, service role key, database URL)

#### Passo 3: Criar instância Z-API

1. Acesse https://z-api.io e crie nova instância
2. Conecte ao WhatsApp do cliente (scanear QR Code)
3. Anote: Instance ID, Token, Client Token

#### Passo 4: Executar instalação

```bash
# Na VPS do cliente (como root)
curl -sSL https://raw.githubusercontent.com/rdmodasbrasilcontato/amanda/main/install.sh | sudo bash
```

Responda as perguntas do wizard com os dados coletados.

#### Passo 5: Aplicar schema no Supabase

No SQL Editor do Supabase, execute em ordem:
1. `src/database/migrations/001_initial_schema.sql`
2. `src/database/migrations/002_vector_memory.sql`
3. `src/database/migrations/003_full_schema.sql`
4. `src/database/migrations/004_amanda_silent_behavioral.sql`

#### Passo 6: Configurar webhook no Z-API

- URL: `http://[IP-DO-CLIENTE]:3000/webhook/zapi`
- Tipo: Receber mensagens

#### Passo 7: Personalizar prompts

Após a instalação, os prompts são gerados automaticamente. Para personalizar:

```bash
nano /opt/amanda/src/prompts/store-info.txt  # Informações da loja
nano /opt/amanda/src/prompts/identity.txt    # Persona da assistente
nano /opt/amanda/src/prompts/sales.txt       # Estratégia de vendas
```

Após editar, rebuild:
```bash
cd /opt/amanda && npm run build && pm2 restart amanda-ai
```

---

## Estrutura de Prompts White-Label

| Arquivo | Função | Personalizar? |
|---------|--------|---------------|
| `identity.txt` | Quem é a assistente, onde trabalha | ✅ Sempre |
| `personality.txt` | Tom, estilo de comunicação | ✅ Sempre |
| `store-info.txt` | Info da loja: produtos, preços, horários | ✅ Sempre |
| `sales.txt` | Abordagem de vendas | ✅ Recomendado |
| `followup.txt` | Mensagens de follow-up | ✅ Recomendado |
| `restrictions.txt` | O que ela NÃO pode fazer | ⚠️ Com cuidado |
| `humanization.txt` | Variações de linguagem | ➡️ Opcional |
| `memory.txt` | Como usar o histórico | ➡️ Raramente |
| `emotional.txt` | Inteligência emocional | ➡️ Raramente |
| `anti-spam.txt` | Proteção contra spam | ➡️ Raramente |

---

## Customizações por Cliente

### Nome da Assistente
O `install.sh` pergunta o nome durante a instalação. Para mudar depois:

```bash
# Editar .env
nano /opt/amanda/.env
# Alterar: APP_NAME=Sofia AI

# Editar prompts
nano /opt/amanda/src/prompts/identity.txt  # Trocar "Amanda" pelo novo nome

# Rebuild
cd /opt/amanda && npm run build && pm2 restart amanda-ai
```

### Horário de Funcionamento
Edite `src/utils/businessHours.ts` ou configure via ENV:

```env
# Padrão: 09:00 às 20:00 (horário de Brasília)
BUSINESS_HOURS_START=9
BUSINESS_HOURS_END=20
TIMEZONE=America/Sao_Paulo
```

### Mensagens de Follow-up
Edite os tempos em `.env`:

```env
AMANDA_FOLLOWUP_HOURS_1=2   # Primeiro follow-up (2 horas)
AMANDA_FOLLOWUP_HOURS_2=24  # Segundo follow-up (24 horas)
AMANDA_FOLLOWUP_HOURS_3=72  # Terceiro follow-up (3 dias)
```

---

## Checklists de Entrega

### Antes de entregar ao cliente:
- [ ] Amanda respondendo mensagens no WhatsApp
- [ ] Follow-ups sendo enviados nos horários corretos
- [ ] Logs sem erros críticos
- [ ] Health check retornando 200
- [ ] Webhook configurado no Z-API
- [ ] Schema do banco aplicado completamente
- [ ] Prompts personalizados com dados da loja

### Entregar ao cliente:
- [ ] URL do webhook (para configurar no Z-API)
- [ ] Admin API Key (para painel admin)
- [ ] Instruções básicas de manutenção
- [ ] Contato para suporte técnico

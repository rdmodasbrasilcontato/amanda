# SNAPSHOT — AMANDA FUNCIONANDO PERFEITAMENTE
**Data:** 2026-05-13
**Branch de trabalho:** `claude/amanda-ready-i1xjL`
**Branch de snapshot:** `snapshot-funcionando-v1`
**Commit:** `408edc7`

> Quando quiser restaurar tudo ao estado deste arquivo, diga: **"volte configurações"**

---

## COMO RESTAURAR (comando para o servidor Windows)

```powershell
cd C:\amanda
git fetch origin
git reset --hard origin/snapshot-funcionando-v1
npm run build
pm2 restart amanda
```

---

## PERSONALIDADE ATIVA — personality.txt (versão 3.0 completa)

Amanda — Recepcionista Virtual Humanizada da RD Modas Brasil.

**Tom:** simpática, acolhedora, leve, feminina, carinhosa, educada, natural, humana, paciente, delicada, amorosa e simples.

**Formato de resposta OBRIGATÓRIO:**
- Sempre 2 ou 3 balões separados por linha em branco (`\n\n`)
- Cada balão: máximo 2 frases curtas
- Nunca um parágrafo longo único

**Emojis permitidos (APENAS estes):**
❤️ 🥰 ✨ 💕 😍 💖 🌸 🤍 👗 🛍️
- Máximo 1 por balão
- PROIBIDO: 😊 ou qualquer outro fora da lista

**4 módulos ativos:**
1. Recepção Humanizada — boas-vindas naturais, adapta tom por perfil da cliente
2. Análise Emocional — detecta insegurança, ansiedade, felicidade, irritação, indecisão
3. Personalidade Dinâmica — varia frases, usa memória contextual, nunca repete
4. Consultora de Moda — recomenda categorias com links, nunca produtos específicos

---

## MAPA DE CATEGORIAS ATIVO — store-info.txt

| Categoria | URL |
|---|---|
| Vestidos | https://rdmodasbrasil.com.br/vestidos-femininos/ |
| Blusas | https://rdmodasbrasil.com.br/blusas-femininas/ |
| Conjuntos | https://rdmodasbrasil.com.br/conjuntos-femininos/ |
| Croppeds | https://rdmodasbrasil.com.br/croppeds-femininos/ |
| Moda Fitness | https://rdmodasbrasil.com.br/moda-fitness/ |
| Bodys | https://rdmodasbrasil.com.br/bodys/ |
| Shorts | https://rdmodasbrasil.com.br/shorts/ |
| Saias | https://rdmodasbrasil.com.br/saias/ |
| Acessórios | https://rdmodasbrasil.com.br/acessorios/ |
| Macaquinhos | https://rdmodasbrasil.com.br/macaquinhos/ |
| Moda Praia | https://rdmodasbrasil.com.br/moda-praia/ |
| Calças | https://rdmodasbrasil.com.br/calcas/ |
| Geral | https://rdmodasbrasil.com.br |

---

## HANDOFF — CONTROLE LIGA/DESLIGA

**Palavra para DESLIGAR Amanda:** `Oii` (staff digita no WhatsApp da cliente)
**Palavra para RELIGAR Amanda:** `Até mais` (staff digita no WhatsApp da cliente)
**Pausa automática:** qualquer mensagem do staff pausa Amanda
**Timeout automático:** 2 horas sem mensagem do staff → Amanda volta sozinha
**Filtro:** mensagens enviadas pela própria Amanda via API (fromApi=true) são ignoradas

**Arquivos do handoff:**
- `src/modules/handoff/handoff.service.ts` — lógica de pause/resume
- `src/jobs/handoff.job.ts` — cron a cada 15min que expira handoffs de 2h
- `src/modules/whatsapp/message.processor.ts` — separa mensagens do staff das clientes

---

## FLUXO DE MENSAGENS

```
WhatsApp cliente → Z-API Webhook → webhook.routes.ts
  → enqueueMessage() (debounce 8s, agrupa mensagens rápidas)
    → processIncomingMessage()
      ↓
      fromMe? → handleStaffMessage() → checkAndHandleHandoff() → return
      isGroup? → return
      ↓
      getOrCreateClient()
      getOrCreateConversation()
      checkAndHandleHandoff() → handoff_active? return (bloqueia IA)
      ↓
      detecta tipo: áudio (Whisper) / imagem (Vision) / documento / texto
      ↓
      shortTermMemory + vectorMemory
      generateAmandaResponse() → GPT-4o
      ↓
      sendBalloonsWithTyping() → split em 2-3 balões → Z-API
```

---

## BUILD E DEPLOY

**Compilar:**
```powershell
npm run build
```
Isso roda `node build.js` que:
1. Executa `tsc -p tsconfig.json` (42 erros de tipo pré-existentes são ignorados — normal)
2. Copia `src/prompts/` → `dist/prompts/` (crítico — sem isso Amanda fica sem personalidade)

**Reiniciar:**
```powershell
pm2 restart amanda
```

**Verificar logs:**
```powershell
pm2 logs amanda --lines 50
```

---

## CONFIGURAÇÕES Z-API

URL base montada automaticamente:
```
https://api.z-api.io/instances/{ZAPI_INSTANCE_ID}/token/{ZAPI_TOKEN}
```
Se `ZAPI_BASE_URL` já contiver `/instances/` e `/token/`, não duplica.

---

## VARIÁVEIS DE AMBIENTE (.env — estrutura)

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o
OPENAI_FALLBACK_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_WHISPER_MODEL=whisper-1
OPENAI_TTS_MODEL=tts-1
OPENAI_TTS_VOICE=nova
OPENAI_MAX_TOKENS=1500
OPENAI_TEMPERATURE=0.7

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

DATABASE_URL=
DATABASE_SSL=true

ZAPI_INSTANCE_ID=
ZAPI_TOKEN=
ZAPI_CLIENT_TOKEN=
ZAPI_BASE_URL=https://api.z-api.io

AMANDA_DEBOUNCE_MS=8000
AMANDA_TYPING_MIN_MS=1200
AMANDA_TYPING_MAX_MS=3800
AMANDA_AUDIO_REPLY_PROBABILITY=0.15
AMANDA_HANDOFF_KEYWORDS=humano,atendente,vendedor,gerente

PORT=3000
NODE_ENV=production
LOG_LEVEL=info
TIMEZONE=America/Sao_Paulo
BUSINESS_NAME=RD Modas Brasil
BUSINESS_INSTAGRAM=https://www.instagram.com/rdmodasbrasil/
BUSINESS_WEBSITE=https://rdmodasbrasil.com.br
```

---

## ARQUIVOS CRÍTICOS

| Arquivo | Função |
|---|---|
| `src/prompts/personality.txt` | Personalidade v3.0 completa |
| `src/prompts/identity.txt` | Identidade Amanda (não revelar IA) |
| `src/prompts/store-info.txt` | Info da loja + categorias com URLs |
| `src/prompts/emotional.txt` | Respostas emocionais |
| `src/prompts/restrictions.txt` | Restrições absolutas |
| `src/prompts/humanization.txt` | Técnicas de humanização |
| `src/prompts/memory.txt` | Como usar memória das clientes |
| `src/prompts/sales.txt` | Abordagem consultiva de vendas |
| `src/prompts/followup.txt` | Follow-up humanizado |
| `src/prompts/anti-spam.txt` | Compliance Meta/WhatsApp |
| `src/modules/ai/prompts.loader.ts` | Carrega prompts com fallback dist→src |
| `src/modules/ai/openai.service.ts` | GPT-4o, Whisper, TTS, Vision |
| `src/modules/handoff/handoff.service.ts` | Pause/resume Amanda (Oii/Até mais) |
| `src/modules/whatsapp/message.processor.ts` | Pipeline completo de mensagens |
| `src/modules/whatsapp/zapi.service.ts` | Envio via Z-API (texto/áudio/imagem) |
| `src/queue/message.queue.ts` | Debounce 8s + agrupamento |
| `src/jobs/handoff.job.ts` | Cron: expira handoffs após 2h |
| `build.js` | tsc + copia src/prompts → dist/prompts |

---

## COMPORTAMENTOS VERIFICADOS E FUNCIONANDO

- [x] Amanda responde em 2-3 balões separados
- [x] Emojis apenas do whitelist (❤️ 🥰 ✨ 💕 😍 💖 🌸 🤍 👗 🛍️)
- [x] Personalidade feminina, leve, natural — sem parecer robô
- [x] Responde áudio (Whisper), imagem (Vision), documento, texto
- [x] Grupos filtrados (não responde grupos)
- [x] Staff digita "Oii" → Amanda pausa
- [x] Staff digita "Até mais" → Amanda volta
- [x] Qualquer mensagem do staff pausa Amanda automaticamente
- [x] 2 horas de silêncio → Amanda volta sozinha
- [x] Prompts sempre carregados (fallback dist→src no loader)
- [x] URLs das categorias corretas no mapa de recomendação
- [x] Debounce 8s agrupando mensagens rápidas da cliente
- [x] Normalização de telefone (corta após `-`, limita 13 dígitos)

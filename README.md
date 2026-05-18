# Amanda AI — Assistente WhatsApp com IA

Amanda AI é uma assistente virtual para WhatsApp com análise comportamental silenciosa, follow-ups automáticos e persona humanizada. Pronta para ser implantada como produto white-label para qualquer cliente.

## Deploy em 1 Comando

```bash
curl -sSL https://raw.githubusercontent.com/rdmodasbrasilcontato/amanda/main/install.sh | sudo bash
```

O instalador pergunta as credenciais do cliente e configura tudo automaticamente.

## Documentação

| Documento | Conteúdo |
|-----------|----------|
| [docs/INSTALL.md](docs/INSTALL.md) | Instalação passo a passo |
| [docs/WHITE-LABEL.md](docs/WHITE-LABEL.md) | Como implantar para novos clientes |
| [DEPLOY.md](DEPLOY.md) | Deploy em VPS existente |
| [docs/BACKUP.md](docs/BACKUP.md) | Backup e restore |
| [docs/UPDATE.md](docs/UPDATE.md) | Atualizar versão |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Solução de problemas |

## Serviços Necessários

| Serviço | Função | Onde criar |
|---------|--------|-----------|
| **OpenAI** | IA, análise comportamental, transcrição | platform.openai.com |
| **Supabase** | Banco de dados PostgreSQL + Storage | supabase.com |
| **Z-API** | Integração WhatsApp | z-api.io |

## Arquitetura

```
WhatsApp → Z-API → Webhook → Amanda AI (Node.js/TypeScript)
                                  ↓
                           OpenAI GPT-4o
                                  ↓
                           Supabase (PostgreSQL)
                                  ↓
                           Redis (cache/sessões)
```

## Estrutura do Projeto

```
amanda/
├── install.sh              # Instalador white-label (wizard interativo)
├── Dockerfile              # Container da aplicação
├── docker-compose.yml      # Stack básica (app + redis)
├── docker/
│   └── docker-compose.full.yml  # Stack completa (+ nginx/SSL)
├── nginx/
│   └── nginx.conf          # Proxy reverso
├── scripts/
│   ├── start.sh            # Iniciar sistema
│   ├── backup.sh           # Backup com rotação
│   ├── restore.sh          # Restaurar backup
│   ├── update.sh           # Atualizar versão
│   ├── enable-ssl.sh       # Ativar SSL (Let's Encrypt)
│   └── client/
│       └── generate-prompts.sh  # Gerar prompts white-label
├── src/
│   ├── prompts/            # Prompts personalizáveis por cliente
│   ├── modules/            # Módulos: AI, followup, leadScore, etc.
│   ├── jobs/               # Cron jobs (followup, handoff, score decay)
│   └── database/migrations/  # Schema do banco
└── docs/
    ├── INSTALL.md
    ├── WHITE-LABEL.md
    ├── BACKUP.md
    ├── UPDATE.md
    └── TROUBLESHOOTING.md
```

## Comandos Rápidos

```bash
# Logs em tempo real
docker compose logs -f
pm2 logs amanda-ai

# Status
docker compose ps
pm2 status

# Reiniciar
docker compose restart amanda
pm2 restart amanda-ai

# Backup
bash scripts/backup.sh

# Atualizar
bash scripts/update.sh

# Health check
curl http://localhost:3000/health
```

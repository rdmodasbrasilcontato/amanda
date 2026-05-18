# Amanda AI — Solução de Problemas

## Bot não responde mensagens

**1. Verificar se o sistema está rodando:**
```bash
docker compose ps        # Docker
pm2 status               # PM2
curl http://localhost:3000/health
```

**2. Verificar webhook no Z-API:**
- Acesse o painel Z-API
- Confirme que o webhook está configurado: `http://SEU-IP:3000/webhook/zapi`
- Teste enviando uma mensagem para o WhatsApp conectado

**3. Verificar logs:**
```bash
docker compose logs -f amanda
pm2 logs amanda-ai
```

**4. Verificar firewall:**
```bash
ufw status
# Porta 3000 deve estar liberada (ou 80/443 com nginx)
```

---

## Erro de banco de dados

**Sintoma:** `relation "tabela" does not exist` nos logs

**Solução:** Aplique os migrations no Supabase SQL Editor na ordem:
1. `src/database/migrations/001_initial_schema.sql`
2. `src/database/migrations/002_vector_memory.sql`
3. `src/database/migrations/003_full_schema.sql`
4. `src/database/migrations/004_amanda_silent_behavioral.sql`

**Verificar conexão:**
```bash
# No .env, confirmar DATABASE_URL
grep DATABASE_URL /opt/amanda/.env
```

---

## Follow-ups não são enviados

**Verificar:**
1. Sistema rodando: `pm2 status` ou `docker compose ps`
2. Horário comercial: follow-ups só saem das 09h às 20h (Brasília)
3. Tabela `followups` no Supabase: verificar se há registros com `status='pendente'`
4. Logs do job: `pm2 logs amanda-ai | grep followup`

---

## Erro de fuso horário (mensagens fora do horário)

**Verificar `.env`:**
```env
TIMEZONE=America/Sao_Paulo
```

**Verificar `server.ts` (linha 2):**
```typescript
process.env.TZ = 'America/Sao_Paulo';
```

**Testar:**
```bash
docker compose exec amanda node -e "console.log(new Date().toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'}))"
```

---

## Erro de memória

**Sintoma:** Sistema reiniciando frequentemente

**Solução:**
```bash
# PM2
pm2 restart amanda-ai --max-memory-restart 1G

# Docker: editar docker-compose.yml
# Adicionar em services.amanda:
#   deploy:
#     resources:
#       limits:
#         memory: 1G
docker compose up -d
```

---

## SSL não funciona

**Verificar:**
```bash
certbot certificates   # Ver certificados instalados
nginx -t               # Testar configuração nginx (se instalado localmente)
docker compose logs nginx  # Logs do nginx (se Docker)
```

**Renovar certificado manualmente:**
```bash
certbot renew --force-renewal
docker compose restart nginx
```

---

## Webhook retornando erro 401/403

**Verificar:**
- O token do webhook no `.env` bate com o configurado no Z-API
- `ZAPI_WEBHOOK_VERIFY_TOKEN` no `.env`
- Header `client-token` na requisição Z-API bate com `ZAPI_CLIENT_TOKEN`

---

## Reinicialização de emergência

```bash
cd /opt/amanda

# Parar tudo
docker compose down
pm2 kill

# Limpar e reiniciar
docker compose up -d
# ou
pm2 start dist/server.js --name amanda-ai
```

---

## Ver admin dashboard

```bash
ADMIN_KEY=$(grep ADMIN_API_KEY /opt/amanda/.env | cut -d= -f2)
curl -H "x-admin-key: $ADMIN_KEY" http://localhost:3000/admin/status
```

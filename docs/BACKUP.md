# Amanda AI — Backup e Restore

## Backup Manual

```bash
bash scripts/backup.sh
```

Cria um arquivo `.tar.gz` em `./backups/` com:
- `.env` (configurações e credenciais)
- `src/` (código-fonte e prompts)
- `package.json`, `tsconfig.json`
- `docker-compose.yml`
- `logs/` (últimos logs)

O backup **não inclui** o banco de dados (fica no Supabase — faça backup pelo dashboard deles).

---

## Backup Automático

O script `update.sh` já faz backup antes de atualizar. Para programar backup diário:

```bash
# Adicionar ao crontab (backup todo dia às 2h da manhã)
crontab -e

# Adicione esta linha:
0 2 * * * cd /opt/amanda && bash scripts/backup.sh >> logs/backup.log 2>&1
```

---

## Restaurar Backup

```bash
# Restaurar o backup mais recente (interativo)
bash scripts/restore.sh

# Restaurar um backup específico
bash scripts/restore.sh backups/amanda_backup_20240115_020000.tar.gz
```

O restore:
1. Para o sistema
2. Salva o `.env` atual como `.env.before_restore`
3. Extrai o backup
4. Reinstala dependências
5. Faz rebuild
6. Reinicia o sistema

---

## Backup do Banco de Dados (Supabase)

O Supabase faz backup automático a cada 24h (plano Pro) ou a cada 7 dias (Free).

Para exportar manualmente:
1. Acesse o dashboard do projeto
2. Vá em **Settings → Database**
3. Use **Backups** para download do dump

Ou via CLI:
```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Exportar banco
supabase db dump --project-ref SEU_PROJECT_REF > backup_banco.sql
```

---

## Política de Retenção

O script de backup mantém os **últimos 10 backups** automaticamente.
Backups mais antigos são removidos ao criar um novo.

Para alterar o limite, edite `scripts/backup.sh`:
```bash
ls -t "$BACKUP_DIR"/amanda_backup_*.tar.gz | tail -n +11 | xargs rm -f
#                                                       ^^^
#                                                   Mude este número
```

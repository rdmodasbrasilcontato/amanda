# Amanda AI — Atualização de Versão

## Atualização Automática (recomendado)

```bash
cd /opt/amanda && bash scripts/update.sh
```

Este script:
1. Faz backup automático antes de atualizar
2. Baixa o código mais novo (`git pull`)
3. Instala/atualiza dependências
4. Faz rebuild da aplicação
5. Reinicia o sistema (Docker ou PM2)

---

## Atualização Manual

```bash
cd /opt/amanda

# 1. Backup
bash scripts/backup.sh

# 2. Baixar atualizações
git pull origin main

# 3. Instalar dependências
npm ci --only=production=false

# 4. Compilar
npm run build

# 5. Reiniciar
docker compose up -d --build
# ou
pm2 restart amanda-ai
```

---

## Atualizar Prompts Sem Restart Completo

Os prompts em `src/prompts/*.txt` são lidos em tempo de execução. Em muitos casos, basta editar e o sistema pega na próxima mensagem. Para garantir:

```bash
# Editar prompts
nano /opt/amanda/src/prompts/store-info.txt

# Reiniciar apenas o container da app (mantém Redis)
docker compose restart amanda
# ou
pm2 restart amanda-ai
```

---

## Verificar Versão Atual

```bash
cd /opt/amanda
node -e "console.log(require('./package.json').version)"
git log --oneline -5
```

---

## Rollback em Caso de Problema

Se a atualização quebrar algo:

```bash
# Ver backups disponíveis
ls -lh /opt/amanda/backups/

# Restaurar o backup mais recente
bash scripts/restore.sh

# Ou restaurar específico
bash scripts/restore.sh backups/amanda_backup_YYYYMMDD_HHMMSS.tar.gz
```

Ou reverter via git:

```bash
# Ver histórico
git log --oneline -10

# Reverter para commit anterior
git checkout HASH_DO_COMMIT -- .

# Rebuild
npm run build && pm2 restart amanda-ai
```

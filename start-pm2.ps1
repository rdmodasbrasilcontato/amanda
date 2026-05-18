# ════════════════════════════════════════════════════════
# Amanda AI — Iniciar com PM2 (recomendado para produção)
# PM2 mantém o processo rodando e reinicia se cair
# ════════════════════════════════════════════════════════

Set-Location -Path "C:\Users\Administrator\amanda"
Write-Host "Diretório atual: $(Get-Location)" -ForegroundColor Cyan

# Instalar PM2 globalmente se não tiver
$pm2 = Get-Command pm2 -ErrorAction SilentlyContinue
if (-not $pm2) {
    Write-Host "Instalando PM2..." -ForegroundColor Yellow
    npm install -g pm2
}

# Compilar
Write-Host "Compilando TypeScript..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO na compilação!" -ForegroundColor Red
    exit 1
}

# Parar instância anterior se existir
pm2 stop amanda-ai 2>$null
pm2 delete amanda-ai 2>$null

# Iniciar com PM2
pm2 start dist/server.js --name amanda-ai --max-memory-restart 512M

# Salvar configuração para reiniciar no boot
pm2 save
pm2 startup

Write-Host ""
Write-Host "✅ Amanda AI rodando com PM2!" -ForegroundColor Green
Write-Host "   pm2 status        — ver status"
Write-Host "   pm2 logs amanda-ai — ver logs em tempo real"
Write-Host "   pm2 stop amanda-ai — parar"
Write-Host "   pm2 restart amanda-ai — reiniciar"

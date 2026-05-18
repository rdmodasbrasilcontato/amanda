# ════════════════════════════════════════════════════════
# Amanda AI — Script de Inicialização VPS Windows
# Execute este arquivo no PowerShell como Administrador
# ════════════════════════════════════════════════════════

# Ir para a pasta correta
Set-Location -Path "C:\Users\Administrator\amanda"
Write-Host "Diretório atual: $(Get-Location)" -ForegroundColor Cyan

# Instalar dependências se necessário
if (-not (Test-Path "node_modules")) {
    Write-Host "Instalando dependências..." -ForegroundColor Yellow
    npm install
}

# Compilar TypeScript
Write-Host "Compilando TypeScript..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO na compilação! Verifique os erros acima." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build concluído com sucesso!" -ForegroundColor Green
Write-Host "Iniciando Amanda AI..." -ForegroundColor Cyan

# Iniciar o servidor
npm start

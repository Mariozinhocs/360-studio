# Backup files if they exist
$hasEnv = Test-Path .env
$hasFtpConfig = Test-Path ftp_config.json

if ($hasEnv) { Copy-Item .env .env.bak -Force }
if ($hasFtpConfig) { Copy-Item ftp_config.json ftp_config.json.bak -Force }

try {
    # Copy PROD config files to standard locations
    if (Test-Path .env.prod) {
        Copy-Item .env.prod .env -Force
        Write-Host "Configurando .env temporário para Produção..." -ForegroundColor Cyan
    } else {
        Write-Error ".env.prod não encontrado!"
        exit 1
    }
    
    if (Test-Path ftp_config_prod.json) {
        Copy-Item ftp_config_prod.json ftp_config.json -Force
        Write-Host "Configurando ftp_config.json temporário para Produção..." -ForegroundColor Cyan
    } else {
        Write-Error "ftp_config_prod.json não encontrado!"
        exit 1
    }

    # Execute standard deploy script
    Write-Host "Iniciando deploy de Produção..." -ForegroundColor Green
    powershell.exe -ExecutionPolicy Bypass -File .\deploy-staging.ps1
}
finally {
    # Restore original files
    if (Test-Path .env.bak) {
        Move-Item .env.bak .env -Force
    }
    if (Test-Path ftp_config.json.bak) {
        Move-Item ftp_config.json.bak ftp_config.json -Force
    }
    Write-Host "Configurações originais restauradas localmente." -ForegroundColor Yellow
}

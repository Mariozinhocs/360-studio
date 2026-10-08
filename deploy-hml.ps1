# Backup files if they exist
$hasEnv = Test-Path .env
$hasFtpConfig = Test-Path ftp_config.json

if ($hasEnv) { Copy-Item .env .env.bak -Force }
if ($hasFtpConfig) { Copy-Item ftp_config.json ftp_config.json.bak -Force }

try {
    # Copy HML config files to standard locations
    if (Test-Path .env.hml) {
        Copy-Item .env.hml .env -Force
        Write-Host "Configurando .env temporário para Homologação..." -ForegroundColor Cyan
    } else {
        Write-Error ".env.hml não encontrado!"
        exit 1
    }
    
    if (Test-Path ftp_config_hml.json) {
        Copy-Item ftp_config_hml.json ftp_config.json -Force
        Write-Host "Configurando ftp_config.json temporário para Homologação..." -ForegroundColor Cyan
    } else {
        Write-Error "ftp_config_hml.json não encontrado!"
        exit 1
    }

    # Create the remote /hml directory on FTP first
    $ftpHost = "ftp://ftp.360studio.hubdigital360.com"
    $ftpUser = "u576215103.360studio"
    $ftpPass = "4EU6aY;1Mq"
    try {
        $request = [System.Net.FtpWebRequest]::Create("$ftpHost/hml")
        $request.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $request.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
        $response = $request.GetResponse()
        $response.Close()
        Write-Host "Diretório remoto /hml criado com sucesso!" -ForegroundColor Green
    } catch {
        # Ignora se já existir
    }

    # Execute standard deploy script
    Write-Host "Iniciando deploy de Homologação..." -ForegroundColor Green
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

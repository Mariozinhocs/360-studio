[CmdletBinding()]
param(
    [switch]$OnlyChanged
)

$configFile = "ftp_config.json"
if (-not (Test-Path $configFile)) {
    Write-Error "Arquivo de configuração '$configFile' não encontrado na raiz do projeto."
    exit 1
}

$config = Get-Content $configFile | ConvertFrom-Json
$ftpHost = $config.host
$ftpUser = $config.user
$ftpPass = $config.pass
$ftpPath = $config.path

# Garante que o host comece com ftp://
if (-not $ftpHost.StartsWith("ftp://")) {
    $ftpHost = "ftp://$ftpHost"
}

# Remove barra final do host se houver
$ftpHost = $ftpHost.TrimEnd('/')

Write-Host "Iniciando deploy para staging: $ftpHost$ftpPath" -ForegroundColor Cyan

# Lista de arquivos/pastas para ignorar no upload
$ignoredPatterns = @(
    '\\\.git',
    '\\\.gitignore',
    'ftp_config\.json$',
    'deploy-staging\.ps1$',
    'deploy-production\.ps1$',
    'project_memory\.md$',
    'README\.md$',
    '\\\.gemini',
    '\.bak$'
)

# Coleta lista de arquivos alterados via git se o modo OnlyChanged estiver ativo
$changedFilesList = @()
if ($OnlyChanged) {
    Write-Host "Modo OnlyChanged ativo. Identificando arquivos alterados..." -ForegroundColor Yellow
    if (Test-Path .git) {
        # Alterações não commitadas (staged + unstaged)
        $gitDiff = git diff --name-only 2>$null
        $gitDiffStaged = git diff --cached --name-only 2>$null
        $gitUntracked = git ls-files --others --exclude-standard 2>$null
        
        if ($gitDiff) { $changedFilesList += $gitDiff }
        if ($gitDiffStaged) { $changedFilesList += $gitDiffStaged }
        if ($gitUntracked) { $changedFilesList += $gitUntracked }
        
        # Alterações commitadas localmente que ainda não foram enviadas (comparado com origin/main)
        git rev-parse --verify origin/main 2>$null
        if ($LASTEXITCODE -eq 0) {
            $gitUnpushed = git diff --name-only origin/main..HEAD 2>$null
            if ($gitUnpushed) { $changedFilesList += $gitUnpushed }
        }
        
        # Alterações do último commit (HEAD~1..HEAD)
        $gitLastCommit = git diff --name-only HEAD~1..HEAD 2>$null
        if ($gitLastCommit) { $changedFilesList += $gitLastCommit }
        
        # Normalização dos caminhos
        $changedFilesList = $changedFilesList | Where-Object { $_ } | ForEach-Object { $_.Replace("\", "/").TrimStart('/') } | Select-Object -Unique
        Write-Host "Arquivos alterados detectados via git: ($($changedFilesList.Count) arquivos)" -ForegroundColor Cyan
        foreach ($f in $changedFilesList) {
            Write-Host "  - $f" -ForegroundColor Gray
        }
    } else {
        Write-Warning "Repositório git não detectado no diretório atual. Todos os arquivos serão enviados."
        $OnlyChanged = $false
    }
}

# Coleta todos os arquivos recursivamente, exceto os ignorados
$files = Get-ChildItem -Path . -Recurse -File | Where-Object {
    $relativePath = $_.FullName.Replace((Get-Item .).FullName, "")
    $shouldIgnore = $false
    foreach ($pattern in $ignoredPatterns) {
        if ($relativePath -match $pattern) {
            $shouldIgnore = $true
            break
        }
    }
    if ($shouldIgnore) {
        return $false
    }
    
    if ($OnlyChanged) {
        $normRel = $relativePath.Replace("\", "/").TrimStart('/')
        return $changedFilesList -contains $normRel
    }
    
    return $true
}

# Função auxiliar para criar diretório remoto via FTP
function Create-RemoteDirectory {
    param (
        [string]$uri,
        [string]$user,
        [string]$pass
    )
    try {
        $request = [System.Net.FtpWebRequest]::Create($uri)
        $request.Timeout = 15000 # 15 segundos de timeout
        $request.Credentials = New-Object System.Net.NetworkCredential($user, $pass)
        $request.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
        $response = $request.GetResponse()
        $response.Close()
        Write-Host "Pasta criada: $uri" -ForegroundColor Yellow
    } catch {
        # Ignora erro se a pasta já existir (código HTTP 550)
    }
}

# Dicionário para rastrear pastas criadas para otimizar conexões
$createdFolders = @{}

foreach ($file in $files) {
    # Calcula caminho relativo formatado com barras invertidas corrigidas para URL
    $relativePath = $file.FullName.Replace((Get-Item .).FullName, "").Replace("\", "/")
    $remoteUri = "$ftpHost$ftpPath$relativePath"
    
    # Garante que a pasta destino exista no servidor remoto
    $remoteDirRelative = [System.IO.Path]::GetDirectoryName($relativePath).Replace("\", "/")
    
    if ($remoteDirRelative -and $remoteDirRelative -ne "/" -and $remoteDirRelative -ne "") {
        $parts = $remoteDirRelative.Split('/')
        $currentPath = ""
        foreach ($part in $parts) {
            if ($part) {
                $currentPath = "$currentPath/$part"
                if (-not $createdFolders.ContainsKey($currentPath)) {
                    Create-RemoteDirectory -uri "$ftpHost$ftpPath$currentPath" -user $ftpUser -pass $ftpPass
                    $createdFolders[$currentPath] = $true
                }
            }
        }
    }

    Write-Host "Enviando: $relativePath -> $remoteUri" -ForegroundColor White
    try {
        $request = [System.Net.FtpWebRequest]::Create($remoteUri)
        $request.Timeout = 30000 # 30 segundos de timeout
        $request.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $request.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
        $request.UseBinary = $true
        
        $fileBytes = [System.IO.File]::ReadAllBytes($file.FullName)
        $request.ContentLength = $fileBytes.Length
        
        $requestStream = $request.GetRequestStream()
        $requestStream.Write($fileBytes, 0, $fileBytes.Length)
        $requestStream.Close()
        
        $response = $request.GetResponse()
        $response.Close()
    } catch {
        Write-Error "Falha ao enviar arquivo $($relativePath) - $_"
    }
}

Write-Host "Deploy de staging concluído com sucesso!" -ForegroundColor Green

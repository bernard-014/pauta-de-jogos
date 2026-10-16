# Inicia o n8n local (D:\n8n) para o projeto de pauta de jogos.
# - Usa o Node 24 portátil em D:\n8n\runtime (o Node 26 do sistema não é suportado pelo n8n).
# - Guarda workflows/credenciais em .\.n8n (ignorado pelo git).
# - Carrega o .env para que os workflows possam usar {{ $env.NOME }}.
# Uso: .\start-n8n.ps1   ->  abre em http://localhost:5678
#      .\start-n8n.ps1 execute --file=wf.json   (qualquer outro comando do n8n)

$n8nArgs = @(if ($args.Count) { $args } else { 'start' })
$ErrorActionPreference = 'Stop'
$projeto = $PSScriptRoot
$n8nDir  = 'D:\n8n'
$nodeDir = Join-Path $n8nDir 'runtime\node-v24.22.0-win-x64'

# Variáveis do projeto (.env)
$envFile = Join-Path $projeto '.env'
if (Test-Path $envFile) {
    foreach ($linha in Get-Content $envFile) {
        if ($linha -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
            $valor = $Matches[2].Trim().Trim('"').Trim("'")
            Set-Item -Path "Env:$($Matches[1])" -Value $valor
        }
    }
}

$env:PATH = "$nodeDir;$env:PATH"
$env:N8N_USER_FOLDER = $projeto            # n8n cria .\.n8n aqui dentro
$env:N8N_BLOCK_ENV_ACCESS_IN_NODE = 'false' # permite {{ $env.TELEGRAM_CHAT_ID }} etc.
$env:GENERIC_TIMEZONE = 'America/Sao_Paulo' # horário do Schedule Trigger
$env:TZ = 'America/Sao_Paulo'
$env:N8N_RUNNERS_ENABLED = 'true'
$env:N8N_DIAGNOSTICS_ENABLED = 'false'

& (Join-Path $nodeDir 'node.exe') (Join-Path $n8nDir 'node_modules\n8n\bin\n8n') $n8nArgs

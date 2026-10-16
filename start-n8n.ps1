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
# Histórico de execuções: apaga sozinho o que tiver mais de 7 dias e devolve o espaço do SQLite ao iniciar
$env:EXECUTIONS_DATA_PRUNE = 'true'
$env:EXECUTIONS_DATA_MAX_AGE = '168'          # em horas
$env:DB_SQLITE_VACUUM_ON_STARTUP = 'true'

# Ao subir o servidor, fecha antes qualquer n8n já aberto (evita porta 5678 ocupada e dois n8n no mesmo banco).
# Só mexe nos processos do n8n instalado em D:\n8n; comandos como "execute" não fecham nada.
if ($n8nArgs[0] -eq 'start') {
    $antigos = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
        Where-Object { $_.CommandLine -like "*$n8nDir*" -and $_.ProcessId -ne $PID }
    if ($antigos) {
        Write-Host "Fechando n8n que já estava aberto ($(@($antigos).Count) processo(s))..."
        $antigos | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
        Start-Sleep -Seconds 3
    }
}

# Barra de progresso: o n8n não avisa quanto falta, então a barra é uma estimativa (90 s) e chega a 100% quando a porta abre.
# Roda em paralelo ao n8n e escreve uma linha a cada 5 s, só para mostrar que não travou.
if ($n8nArgs[0] -eq 'start') {
    $barra = [powershell]::Create().AddScript({
        $inicio = Get-Date
        while ($true) {
            $s = [int]((Get-Date) - $inicio).TotalSeconds
            $aberta = $false
            try { $c = New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1', 5678); $aberta = $true; $c.Close() } catch {}
            if ($aberta) { [Console]::WriteLine("[##########] 100%  PRONTO em ${s}s: abra http://localhost:5678"); break }
            $p = [Math]::Min(95, [int](100 * $s / 90)); $n = [int]($p / 10)
            [Console]::WriteLine("[$('#' * $n)$('-' * (10 - $n))] $p%  iniciando o n8n, pode levar alguns minutos na primeira vez... (${s}s)")
            Start-Sleep -Seconds 5
        }
    })
    $null = $barra.BeginInvoke()
}

& (Join-Path $nodeDir 'node.exe') (Join-Path $n8nDir 'node_modules\n8n\bin\n8n') $n8nArgs

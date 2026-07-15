$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$server = Start-Process -FilePath python -ArgumentList @('-m', 'agent_nonsense', '--quiet') -WorkingDirectory $root -WindowStyle Hidden -PassThru
try {
    Set-Location (Join-Path $root 'web')
    npm run dev
}
finally {
    if (-not $server.HasExited) { Stop-Process -Id $server.Id }
}

# Wrapper for the Windows scheduled task: reads new venue replies with the local Claude CLI and saves proposals.
# Output is appended to %USERPROFILE%\propose-replies.log. See scripts/propose-replies.ts.
$ErrorActionPreference = "Continue"
$log = Join-Path $env:USERPROFILE "propose-replies.log"
Set-Location "C:\kelowna-specials"
"=== $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Out-File -FilePath $log -Append -Encoding utf8
npx tsx --env-file=.env.local scripts/propose-replies.ts --run 2>&1 | Out-File -FilePath $log -Append -Encoding utf8

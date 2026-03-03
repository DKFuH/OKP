param(
  [string]$Root = (Join-Path $PSScriptRoot '..'),
  [int]$PollSeconds = 10
)

$ErrorActionPreference = 'Stop'

$rootPath = (Resolve-Path $Root).Path
$sprintsDir = Join-Path $rootPath 'Docs\AGENT_SPRINTS'
$stateFile = Join-Path $rootPath '.agent-sprint-watch-state.json'
$queueDir = Join-Path $rootPath '.agent-sprint-queue'
$logFile = Join-Path $rootPath '.agent-sprint-watch.log'

New-Item -ItemType Directory -Force -Path $queueDir | Out-Null
if (-not (Test-Path $stateFile)) {
  '{}' | Out-File -FilePath $stateFile -Encoding utf8
}
if (-not (Test-Path $logFile)) {
  '' | Out-File -FilePath $logFile -Encoding utf8
}

function Write-Log([string]$msg) {
  $line = "$(Get-Date -Format o) $msg"
  Add-Content -Path $logFile -Value $line
}

function Load-State {
  try {
    $raw = Get-Content -Path $stateFile -Raw -Encoding UTF8
    if ([string]::IsNullOrWhiteSpace($raw)) { return @{} }
    $obj = $raw | ConvertFrom-Json -AsHashtable
    if ($null -eq $obj) { return @{} }
    return $obj
  } catch {
    Write-Log "WARN state parse failed, resetting: $($_.Exception.Message)"
    return @{}
  }
}

function Save-State([hashtable]$state) {
  ($state | ConvertTo-Json -Depth 6) | Out-File -FilePath $stateFile -Encoding utf8
}

Write-Log "Watcher started. Directory=$sprintsDir PollSeconds=$PollSeconds"

while ($true) {
  try {
    $state = Load-State
    $files = Get-ChildItem -Path $sprintsDir -Filter 'S*.md' -File | Where-Object { $_.Name -match '^S\d+-.+\.md$' }

    foreach ($f in $files) {
      $key = $f.FullName
      $stamp = $f.LastWriteTimeUtc.ToString('o')

      if (-not $state.ContainsKey($key) -or $state[$key] -ne $stamp) {
        $state[$key] = $stamp
        Save-State $state

        $taskName = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
        $queueItem = [ordered]@{
          created_at = (Get-Date).ToUniversalTime().ToString('o')
          sprint_file = $f.FullName
          sprint_name = $taskName
          instruction = "Run subagent for sprint file: $($f.FullName)"
        }

        $queuePath = Join-Path $queueDir ("$taskName-" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + '.json')
        ($queueItem | ConvertTo-Json -Depth 6) | Out-File -FilePath $queuePath -Encoding utf8
        Write-Log "ENQUEUE $($f.FullName) -> $queuePath"
      }
    }
  } catch {
    Write-Log "ERROR loop failed: $($_.Exception.Message)"
  }

  Start-Sleep -Seconds $PollSeconds
}

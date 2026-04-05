param(
  [string]$BaseUrl = "http://localhost:8080",
  [string]$FrontendUrl = "",
  [switch]$SkipFrontend,
  [switch]$IncludeDocs
)

$ErrorActionPreference = "Stop"

function Test-Endpoint {
  param(
    [string]$Name,
    [string]$Url
  )

  try {
    $response = Invoke-WebRequest -Uri $Url -Method Get -UseBasicParsing -TimeoutSec 20
    [PSCustomObject]@{
      Name = $Name
      Url = $Url
      Status = "PASS"
      Code = $response.StatusCode
      Detail = "OK"
    }
  } catch {
    $statusCode = "-"
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $statusCode = [int]$_.Exception.Response.StatusCode
    }

    [PSCustomObject]@{
      Name = $Name
      Url = $Url
      Status = "FAIL"
      Code = $statusCode
      Detail = $_.Exception.Message
    }
  }
}

$checks = @(
  @{ Name = "API Health"; Url = "$BaseUrl/actuator/health" }
  @{ Name = "API Liveness"; Url = "$BaseUrl/actuator/health/liveness" }
  @{ Name = "API Readiness"; Url = "$BaseUrl/actuator/health/readiness" }
)

if ($IncludeDocs) {
  $checks += @{ Name = "Swagger UI"; Url = "$BaseUrl/swagger-ui.html" }
}

if (-not $SkipFrontend -and $FrontendUrl) {
  $checks += @{ Name = "Frontend Root"; Url = $FrontendUrl }
}

$results = foreach ($check in $checks) {
  Test-Endpoint -Name $check.Name -Url $check.Url
}

$results | Format-Table -AutoSize

$failed = @($results | Where-Object { $_.Status -eq "FAIL" })
if ($failed.Count -gt 0) {
  Write-Host ""
  Write-Host "Smoke check failed." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "Smoke check passed." -ForegroundColor Green

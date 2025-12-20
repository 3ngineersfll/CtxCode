<#
.SYNOPSIS
    Real-time monitoring for Citrix black screen issues.

.DESCRIPTION
    Monitors VDA servers in real-time for black screen incidents and sends alerts.
    Unlike the historical report script, this watches for issues as they happen.

.PARAMETER ComputerName
    VDA computer names to monitor.

.PARAMETER CheckInterval
    How often to check for new events (in seconds). Default is 60 seconds.

.PARAMETER AlertEmail
    Email address to send alerts to when black screen detected.

.PARAMETER SmtpServer
    SMTP server for sending email alerts.

.EXAMPLE
    .\Watch-CitrixBlackScreen.ps1 -ComputerName "VDA-SERVER01","VDA-SERVER02" -CheckInterval 30

    Monitors two VDA servers, checking every 30 seconds.

.EXAMPLE
    Get-Content vda-servers.txt | .\Watch-CitrixBlackScreen.ps1 -AlertEmail "admin@company.com" -SmtpServer "smtp.company.com"

    Monitors all VDAs from file and sends email alerts.

.NOTES
    Requires PowerShell 5.1 or higher
    Press Ctrl+C to stop monitoring
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true, ValueFromPipeline=$true)]
    [string[]]$ComputerName,

    [Parameter(Mandatory=$false)]
    [int]$CheckInterval = 60,

    [Parameter(Mandatory=$false)]
    [string]$AlertEmail,

    [Parameter(Mandatory=$false)]
    [string]$SmtpServer
)

BEGIN {
    $LastCheck = Get-Date
    $MonitoredComputers = @()

    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "  Citrix Black Screen Real-Time Monitor" -ForegroundColor Cyan
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "Started: $(Get-Date)" -ForegroundColor Yellow
    Write-Host "Check Interval: $CheckInterval seconds" -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop monitoring" -ForegroundColor Yellow
    Write-Host ""

    function Send-Alert {
        param(
            [string]$Computer,
            [string]$Username,
            [datetime]$EventTime
        )

        $Subject = "ALERT: Citrix Black Screen Detected - $Username on $Computer"
        $Body = @"
Citrix Black Screen Alert

Computer: $Computer
User: $Username
Time: $EventTime
Issue: User reconnected to session and required explorer.exe restart (potential black screen)

This is an automated alert from the Citrix Black Screen Monitor.
"@

        Write-Host "  [ALERT] Black screen detected: $Username on $Computer at $EventTime" -ForegroundColor Red

        if ($AlertEmail -and $SmtpServer) {
            try {
                Send-MailMessage -To $AlertEmail `
                    -From "citrix-monitor@company.com" `
                    -Subject $Subject `
                    -Body $Body `
                    -SmtpServer $SmtpServer `
                    -Priority High
                Write-Host "  [+] Alert email sent to $AlertEmail" -ForegroundColor Green
            } catch {
                Write-Host "  [!] Failed to send email alert: $_" -ForegroundColor Red
            }
        }
    }
}

PROCESS {
    $MonitoredComputers += $ComputerName
}

END {
    Write-Host "Monitoring $($MonitoredComputers.Count) VDA servers..." -ForegroundColor Green
    Write-Host ""

    # Main monitoring loop
    while ($true) {
        $CurrentCheck = Get-Date

        foreach ($Computer in $MonitoredComputers) {
            try {
                # Check for explorer.exe crashes since last check
                $FilterXML = @"
<QueryList>
  <Query Id="0" Path="Application">
    <Select Path="Application">*[System[(EventID=1000 or EventID=1002) and TimeCreated[@SystemTime&gt;='$($LastCheck.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ'))']]] and *[EventData[Data='explorer.exe']]</Select>
  </Query>
</QueryList>
"@

                $NewEvents = Get-WinEvent -ComputerName $Computer -FilterXml $FilterXML -ErrorAction SilentlyContinue

                if ($NewEvents) {
                    foreach ($Event in $NewEvents) {
                        # Try to extract username
                        $Username = "Unknown"
                        if ($Event.Properties) {
                            foreach ($Prop in $Event.Properties) {
                                if ($Prop.Value -match '\\') {
                                    $Username = $Prop.Value
                                    break
                                }
                            }
                        }

                        Send-Alert -Computer $Computer -Username $Username -EventTime $Event.TimeCreated
                    }
                }

            } catch {
                Write-Host "[!] Error checking $Computer : $_" -ForegroundColor Red
            }
        }

        $LastCheck = $CurrentCheck

        # Wait for next check interval
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Next check in $CheckInterval seconds..." -ForegroundColor Gray
        Start-Sleep -Seconds $CheckInterval
    }
}

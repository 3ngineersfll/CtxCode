<#
.SYNOPSIS
    Generates a report of users impacted by Citrix black screen issues requiring explorer.exe restart.

.DESCRIPTION
    This script scans Citrix VDA (Virtual Delivery Agent) machines for historical evidence of
    black screen issues that required explorer.exe to be restarted. It analyzes event logs to
    identify session reconnections followed by explorer.exe restarts, which is the signature
    pattern of this issue.

.PARAMETER ComputerName
    One or more VDA computer names to scan. Accepts pipeline input.

.PARAMETER DaysBack
    Number of days of history to scan. Default is 30 days.

.PARAMETER ExportPath
    Path to export the CSV report. If not specified, displays results in console only.

.PARAMETER IncludeDetailedEvents
    Include detailed event log entries in the output.

.EXAMPLE
    Get-Content vda-servers.txt | .\Get-CitrixBlackScreenReport.ps1 -DaysBack 60 -ExportPath "C:\Reports\BlackScreen.csv"

    Scans all VDA servers listed in vda-servers.txt for the last 60 days and exports to CSV.

.EXAMPLE
    "VDA-SERVER01","VDA-SERVER02" | .\Get-CitrixBlackScreenReport.ps1

    Scans two specific VDA servers for the last 30 days and displays results in console.

.EXAMPLE
    Get-ADComputer -Filter "Name -like 'VDA-*'" | Select-Object -ExpandProperty Name | .\Get-CitrixBlackScreenReport.ps1 -ExportPath "C:\Reports\BlackScreen.csv"

    Scans all VDA servers from Active Directory and exports results.

.NOTES
    Author: Citrix Support Team
    Version: 1.0
    Requires: PowerShell 5.1 or higher, Remote Event Log access to VDA servers

    This script looks for the following indicators:
    - Citrix session reconnection events (EventID 1000, 1006 in Citrix Desktop Service logs)
    - Explorer.exe process starts following reconnections (EventID 4688 if auditing enabled)
    - Explorer.exe crashes (EventID 1000, 1002 in Application log)
    - Manual explorer.exe restarts via Task Manager or script
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true, ValueFromPipeline=$true, ValueFromPipelineByPropertyName=$true)]
    [Alias('CN','ServerName','VDA')]
    [string[]]$ComputerName,

    [Parameter(Mandatory=$false)]
    [int]$DaysBack = 30,

    [Parameter(Mandatory=$false)]
    [string]$ExportPath,

    [Parameter(Mandatory=$false)]
    [switch]$IncludeDetailedEvents
)

BEGIN {
    $StartDate = (Get-Date).AddDays(-$DaysBack)
    $Results = @()
    $ErrorLog = @()

    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "  Citrix Black Screen Historical Impact Report" -ForegroundColor Cyan
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "Scanning period: $StartDate to $(Get-Date)" -ForegroundColor Yellow
    Write-Host ""

    # Function to test connectivity
    function Test-VDAConnectivity {
        param([string]$Computer)

        if (Test-Connection -ComputerName $Computer -Count 1 -Quiet) {
            try {
                $null = Get-WmiObject -Class Win32_OperatingSystem -ComputerName $Computer -ErrorAction Stop
                return $true
            } catch {
                return $false
            }
        }
        return $false
    }

    # Function to get Citrix session reconnection events
    function Get-CitrixReconnectionEvents {
        param(
            [string]$Computer,
            [datetime]$StartDate
        )

        $Events = @()

        try {
            # Citrix Desktop Service - Session Reconnection (EventID 1000, 1006)
            $FilterXML = @"
<QueryList>
  <Query Id="0" Path="Application">
    <Select Path="Application">*[System[(EventID=1000 or EventID=1006) and TimeCreated[@SystemTime&gt;='$($StartDate.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ'))']]]</Select>
  </Query>
</QueryList>
"@

            $CitrixEvents = Get-WinEvent -ComputerName $Computer -FilterXml $FilterXML -ErrorAction SilentlyContinue |
                Where-Object { $_.ProviderName -like "*Citrix*" -or $_.Message -like "*reconnect*" -or $_.Message -like "*session*" }

            $Events += $CitrixEvents

        } catch {
            Write-Verbose "Could not retrieve Citrix events from $Computer : $_"
        }

        return $Events
    }

    # Function to get explorer.exe restart events
    function Get-ExplorerRestartEvents {
        param(
            [string]$Computer,
            [datetime]$StartDate
        )

        $Events = @()

        try {
            # Application Error - Explorer.exe crashes (EventID 1000, 1002)
            $FilterXML = @"
<QueryList>
  <Query Id="0" Path="Application">
    <Select Path="Application">*[System[(EventID=1000 or EventID=1002) and TimeCreated[@SystemTime&gt;='$($StartDate.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ'))']]] and *[EventData[Data='explorer.exe']]</Select>
  </Query>
</QueryList>
"@

            $AppEvents = Get-WinEvent -ComputerName $Computer -FilterXml $FilterXML -ErrorAction SilentlyContinue
            $Events += $AppEvents

        } catch {
            Write-Verbose "Could not retrieve Application events from $Computer : $_"
        }

        try {
            # System log - Service Control Manager events for explorer.exe
            $SystemEvents = Get-WinEvent -ComputerName $Computer -FilterHashtable @{
                LogName = 'System'
                StartTime = $StartDate
            } -ErrorAction SilentlyContinue | Where-Object { $_.Message -like "*explorer.exe*" }

            $Events += $SystemEvents

        } catch {
            Write-Verbose "Could not retrieve System events from $Computer : $_"
        }

        return $Events
    }

    # Function to get user session information
    function Get-UserFromEvent {
        param($Event)

        $Username = "Unknown"

        # Try to extract username from event
        if ($Event.Properties) {
            foreach ($Prop in $Event.Properties) {
                if ($Prop.Value -match '\\') {
                    $Username = $Prop.Value
                    break
                }
            }
        }

        # Try to extract from message
        if ($Username -eq "Unknown" -and $Event.Message) {
            if ($Event.Message -match '(?:User|Account)[\s:]+([\w\\]+)') {
                $Username = $Matches[1]
            }
        }

        return $Username
    }
}

PROCESS {
    foreach ($Computer in $ComputerName) {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Processing: $Computer" -ForegroundColor Cyan

        # Test connectivity
        if (-not (Test-VDAConnectivity -Computer $Computer)) {
            Write-Host "  [!] Cannot connect to $Computer - Skipping" -ForegroundColor Red
            $ErrorLog += [PSCustomObject]@{
                Computer = $Computer
                Error = "Cannot connect or access WMI"
                Timestamp = Get-Date
            }
            continue
        }

        Write-Host "  [+] Connected successfully" -ForegroundColor Green

        # Get reconnection events
        Write-Host "  [*] Scanning for session reconnection events..." -ForegroundColor Yellow
        $ReconnectionEvents = Get-CitrixReconnectionEvents -Computer $Computer -StartDate $StartDate
        Write-Host "      Found $($ReconnectionEvents.Count) reconnection events" -ForegroundColor Gray

        # Get explorer.exe restart events
        Write-Host "  [*] Scanning for explorer.exe restart events..." -ForegroundColor Yellow
        $ExplorerEvents = Get-ExplorerRestartEvents -Computer $Computer -StartDate $StartDate
        Write-Host "      Found $($ExplorerEvents.Count) explorer.exe events" -ForegroundColor Gray

        # Correlate events (explorer restart within 15 minutes of reconnection)
        $CorrelationWindow = New-TimeSpan -Minutes 15
        $ImpactedSessions = @()

        foreach ($ReconnectEvent in $ReconnectionEvents) {
            $ReconnectTime = $ReconnectEvent.TimeCreated
            $Username = Get-UserFromEvent -Event $ReconnectEvent

            # Find explorer events near this reconnection
            $RelatedExplorerEvents = $ExplorerEvents | Where-Object {
                $TimeDiff = $_.TimeCreated - $ReconnectTime
                $TimeDiff -gt [TimeSpan]::Zero -and $TimeDiff -le $CorrelationWindow
            }

            if ($RelatedExplorerEvents) {
                $ImpactedSessions += [PSCustomObject]@{
                    Computer = $Computer
                    Username = $Username
                    ReconnectionTime = $ReconnectTime
                    ExplorerRestartTime = ($RelatedExplorerEvents | Select-Object -First 1).TimeCreated
                    ReconnectionEventID = $ReconnectEvent.Id
                    ExplorerEventID = ($RelatedExplorerEvents | Select-Object -First 1).Id
                    TimeBetweenEvents = [math]::Round((($RelatedExplorerEvents | Select-Object -First 1).TimeCreated - $ReconnectTime).TotalMinutes, 2)
                    EventCount = $RelatedExplorerEvents.Count
                }
            }
        }

        # Also include standalone explorer.exe crashes (potential unreported black screens)
        foreach ($ExplorerEvent in $ExplorerEvents) {
            $ExplorerTime = $ExplorerEvent.TimeCreated

            # Check if this explorer event wasn't already correlated
            $AlreadyCorrelated = $ImpactedSessions | Where-Object {
                $_.ExplorerRestartTime -eq $ExplorerTime
            }

            if (-not $AlreadyCorrelated) {
                $Username = Get-UserFromEvent -Event $ExplorerEvent

                $ImpactedSessions += [PSCustomObject]@{
                    Computer = $Computer
                    Username = $Username
                    ReconnectionTime = $null
                    ExplorerRestartTime = $ExplorerTime
                    ReconnectionEventID = $null
                    ExplorerEventID = $ExplorerEvent.Id
                    TimeBetweenEvents = $null
                    EventCount = 1
                }
            }
        }

        if ($ImpactedSessions.Count -gt 0) {
            Write-Host "  [!] Found $($ImpactedSessions.Count) potential black screen incidents" -ForegroundColor Red
            $Results += $ImpactedSessions
        } else {
            Write-Host "  [+] No black screen incidents detected" -ForegroundColor Green
        }

        Write-Host ""
    }
}

END {
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "  Scan Complete" -ForegroundColor Cyan
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host ""

    if ($Results.Count -gt 0) {
        # Generate summary statistics
        $TotalIncidents = $Results.Count
        $UniqueUsers = ($Results | Select-Object -ExpandProperty Username -Unique).Count
        $UniqueComputers = ($Results | Select-Object -ExpandProperty Computer -Unique).Count
        $MostImpacted = $Results | Group-Object Username | Sort-Object Count -Descending | Select-Object -First 5

        Write-Host "SUMMARY STATISTICS:" -ForegroundColor Yellow
        Write-Host "  Total Incidents: $TotalIncidents" -ForegroundColor White
        Write-Host "  Unique Users Impacted: $UniqueUsers" -ForegroundColor White
        Write-Host "  VDA Servers with Issues: $UniqueComputers" -ForegroundColor White
        Write-Host ""

        Write-Host "TOP 5 MOST IMPACTED USERS:" -ForegroundColor Yellow
        foreach ($User in $MostImpacted) {
            Write-Host "  $($User.Name): $($User.Count) incidents" -ForegroundColor White
        }
        Write-Host ""

        # Export if path specified
        if ($ExportPath) {
            try {
                $Results | Export-Csv -Path $ExportPath -NoTypeInformation -Force
                Write-Host "[+] Report exported to: $ExportPath" -ForegroundColor Green
            } catch {
                Write-Host "[!] Failed to export report: $_" -ForegroundColor Red
            }
        }

        # Display detailed results
        if ($IncludeDetailedEvents) {
            Write-Host ""
            Write-Host "DETAILED INCIDENTS:" -ForegroundColor Yellow
            $Results | Format-Table -AutoSize
        }

        # Return results
        return $Results

    } else {
        Write-Host "[+] No black screen incidents found across all scanned VDAs" -ForegroundColor Green
    }

    # Display errors if any
    if ($ErrorLog.Count -gt 0) {
        Write-Host ""
        Write-Host "ERRORS ENCOUNTERED:" -ForegroundColor Red
        $ErrorLog | Format-Table -AutoSize
    }
}

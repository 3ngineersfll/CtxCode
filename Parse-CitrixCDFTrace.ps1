<#
.SYNOPSIS
    Parses Citrix CDF (Common Diagnostic Format) traces and identifies root causes of issues.

.DESCRIPTION
    This script analyzes Citrix CDF trace files to detect and diagnose common Citrix Virtual Apps
    and Desktops issues including:
    - Session connection/disconnection problems
    - Authentication failures
    - HDX/ICA protocol issues
    - Graphics and display problems
    - Network connectivity issues
    - Service failures and crashes
    - Performance bottlenecks
    - License server issues
    - Profile loading problems

.PARAMETER TracePath
    Path to the CDF trace file or directory containing CDF traces.
    Supports .txt, .log, and .etl files.

.PARAMETER OutputPath
    Optional path to save the analysis report. If not specified, outputs to console only.

.PARAMETER ExportFormat
    Format for the output report: 'Console', 'CSV', 'HTML', or 'JSON'.
    Default is 'Console'.

.PARAMETER SeverityFilter
    Filter results by severity: 'Critical', 'Error', 'Warning', 'Info', or 'All'.
    Default is 'All'.

.PARAMETER TopIssues
    Number of top issues to display in summary. Default is 10.

.PARAMETER IncludeTimeline
    Include a timeline view of events in the report.

.EXAMPLE
    .\Parse-CitrixCDFTrace.ps1 -TracePath "C:\Traces\session.log"

    Analyzes a single CDF trace file and displays results in console.

.EXAMPLE
    .\Parse-CitrixCDFTrace.ps1 -TracePath "C:\Traces\" -OutputPath "C:\Reports\analysis.html" -ExportFormat HTML

    Analyzes all trace files in a directory and exports an HTML report.

.EXAMPLE
    .\Parse-CitrixCDFTrace.ps1 -TracePath "C:\Traces\vda.log" -SeverityFilter Critical -TopIssues 5

    Analyzes traces showing only critical issues with top 5 problems.

.NOTES
    Author: Citrix Diagnostics Team
    Version: 1.0
    Requires: PowerShell 5.1 or later
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true, Position=0, ValueFromPipeline=$true)]
    [ValidateScript({Test-Path $_})]
    [string]$TracePath,

    [Parameter(Mandatory=$false)]
    [string]$OutputPath,

    [Parameter(Mandatory=$false)]
    [ValidateSet('Console', 'CSV', 'HTML', 'JSON')]
    [string]$ExportFormat = 'Console',

    [Parameter(Mandatory=$false)]
    [ValidateSet('Critical', 'Error', 'Warning', 'Info', 'All')]
    [string]$SeverityFilter = 'All',

    [Parameter(Mandatory=$false)]
    [int]$TopIssues = 10,

    [Parameter(Mandatory=$false)]
    [switch]$IncludeTimeline
)

# Issue detection patterns and signatures
$IssuePatterns = @{
    'SessionConnectionFailure' = @{
        Patterns = @(
            'Connection failed',
            'CGP.*Error.*failed to connect',
            'ICA.*Connection attempt failed',
            'Session.*failed to start',
            'Connection attempt.*failed'
        )
        Severity = 'Critical'
        Category = 'Session'
        RootCause = 'Session connection failure - Check network connectivity, firewall rules, and VDA registration'
    }

    'AuthenticationFailure' = @{
        Patterns = @(
            'Authentication failed',
            'Kerberos.*failed',
            'NTLM.*authentication.*error',
            'Credential.*invalid',
            'Logon.*failed',
            'Access denied.*authentication'
        )
        Severity = 'Critical'
        Category = 'Authentication'
        RootCause = 'Authentication failure - Verify user credentials, domain trust, and authentication protocols'
    }

    'HDXChannelFailure' = @{
        Patterns = @(
            'Virtual channel.*failed',
            'HDX.*channel.*error',
            'ICA.*channel.*disconnected',
            'Thinwire.*failed',
            'USB.*redirection.*failed'
        )
        Severity = 'Error'
        Category = 'HDX'
        RootCause = 'HDX channel failure - Check HDX policies, network bandwidth, and client version compatibility'
    }

    'GraphicsBlackScreen' = @{
        Patterns = @(
            'explorer\.exe.*crash',
            'Desktop.*black screen',
            'Graphics.*driver.*error',
            'Display.*initialization.*failed',
            'GPU.*error',
            'Thinwire.*crash'
        )
        Severity = 'Critical'
        Category = 'Graphics'
        RootCause = 'Graphics/Black Screen issue - Update graphics drivers, check GPU allocation, verify explorer.exe stability'
    }

    'NetworkDisconnection' = @{
        Patterns = @(
            'Network.*disconnected',
            'CGP.*connection lost',
            'EDT.*connection.*broken',
            'TCP.*connection.*reset',
            'Session.*disconnected.*network',
            'Reliable.*connection.*failed'
        )
        Severity = 'Error'
        Category = 'Network'
        RootCause = 'Network disconnection - Check network stability, MTU settings, QoS policies, and EDT/HDX Adaptive Transport'
    }

    'ServiceCrash' = @{
        Patterns = @(
            'Service.*terminated unexpectedly',
            'Citrix.*service.*crashed',
            'BrokerAgent.*stopped',
            'PortICA.*service.*failed',
            'Application\s+Error.*Citrix',
            'Exception.*unhandled'
        )
        Severity = 'Critical'
        Category = 'Service'
        RootCause = 'Service crash - Review event logs, update VDA/DDC software, check for DLL conflicts'
    }

    'LicenseIssue' = @{
        Patterns = @(
            'License.*not available',
            'License.*checkout failed',
            'License.*server.*unreachable',
            'No.*license.*available',
            'License.*grace period',
            'Licensing.*error'
        )
        Severity = 'Critical'
        Category = 'Licensing'
        RootCause = 'License issue - Verify license server connectivity, available licenses, and license allocation'
    }

    'ProfileLoadFailure' = @{
        Patterns = @(
            'Profile.*failed to load',
            'User profile.*error',
            'AppData.*access denied',
            'Roaming profile.*failed',
            'Profile.*corrupt',
            'FSLogix.*error'
        )
        Severity = 'Error'
        Category = 'Profile'
        RootCause = 'Profile load failure - Check profile path permissions, FSLogix configuration, and disk space'
    }

    'BrokerRegistrationFailure' = @{
        Patterns = @(
            'Registration.*failed',
            'Broker.*registration.*error',
            'VDA.*not registered',
            'Machine.*registration.*failed',
            'Delivery Controller.*unreachable'
        )
        Severity = 'Critical'
        Category = 'Registration'
        RootCause = 'VDA registration failure - Verify Delivery Controller connectivity, firewall rules, and ListOfDDCs registry'
    }

    'PerformanceDegradation' = @{
        Patterns = @(
            'High latency detected',
            'Performance.*degraded',
            'CPU.*high utilization',
            'Memory.*exhausted',
            'Disk.*slow response',
            'Frame rate.*dropped'
        )
        Severity = 'Warning'
        Category = 'Performance'
        RootCause = 'Performance degradation - Monitor resource usage, check for resource contention, optimize policies'
    }

    'PrinterRedirectionFailure' = @{
        Patterns = @(
            'Printer.*redirection.*failed',
            'Print.*spooler.*error',
            'Printer.*driver.*error',
            'Auto-created printer.*failed'
        )
        Severity = 'Warning'
        Category = 'Printing'
        RootCause = 'Printer redirection failure - Check printer drivers, universal print driver, and printing policies'
    }

    'SSLTLSError' = @{
        Patterns = @(
            'SSL.*handshake failed',
            'TLS.*error',
            'Certificate.*invalid',
            'Certificate.*expired',
            'SSL.*connection.*failed'
        )
        Severity = 'Error'
        Category = 'Security'
        RootCause = 'SSL/TLS error - Verify certificate validity, cipher suite compatibility, and TLS version support'
    }
}

# Global variables for analysis
$script:Issues = @()
$script:TimelineEvents = @()
$script:Statistics = @{
    TotalLines = 0
    TotalIssues = 0
    CriticalCount = 0
    ErrorCount = 0
    WarningCount = 0
    InfoCount = 0
    Categories = @{}
}

function Write-Log {
    param([string]$Message, [string]$Level = 'Info')

    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $color = switch ($Level) {
        'Error' { 'Red' }
        'Warning' { 'Yellow' }
        'Success' { 'Green' }
        default { 'White' }
    }

    Write-Host "[$timestamp] " -NoNewline -ForegroundColor Gray
    Write-Host $Message -ForegroundColor $color
}

function Get-TraceFiles {
    param([string]$Path)

    if (Test-Path $Path -PathType Leaf) {
        return @(Get-Item $Path)
    }
    else {
        return Get-ChildItem -Path $Path -Recurse -Include *.txt,*.log,*.etl -File
    }
}

function Parse-TraceLine {
    param(
        [string]$Line,
        [int]$LineNumber,
        [string]$FileName
    )

    $script:Statistics.TotalLines++

    # Try to extract timestamp from common CDF formats
    $timestamp = $null
    if ($Line -match '(\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2}(?:\.\d+)?)') {
        $timestamp = [datetime]::Parse($Matches[1])
    }
    elseif ($Line -match '(\d{2}/\d{2}/\d{4}\s+\d{2}:\d{2}:\d{2})') {
        $timestamp = [datetime]::Parse($Matches[1])
    }

    # Check each issue pattern
    foreach ($issueKey in $IssuePatterns.Keys) {
        $pattern = $IssuePatterns[$issueKey]

        foreach ($regex in $pattern.Patterns) {
            if ($Line -match $regex) {
                $issue = [PSCustomObject]@{
                    IssueType = $issueKey
                    Severity = $pattern.Severity
                    Category = $pattern.Category
                    RootCause = $pattern.RootCause
                    MatchedPattern = $regex
                    MatchedText = $Matches[0]
                    FileName = $FileName
                    LineNumber = $LineNumber
                    Timestamp = $timestamp
                    FullLine = $Line.Trim()
                }

                $script:Issues += $issue
                $script:Statistics.TotalIssues++

                # Update severity counts
                switch ($pattern.Severity) {
                    'Critical' { $script:Statistics.CriticalCount++ }
                    'Error' { $script:Statistics.ErrorCount++ }
                    'Warning' { $script:Statistics.WarningCount++ }
                    'Info' { $script:Statistics.InfoCount++ }
                }

                # Update category counts
                if (-not $script:Statistics.Categories.ContainsKey($pattern.Category)) {
                    $script:Statistics.Categories[$pattern.Category] = 0
                }
                $script:Statistics.Categories[$pattern.Category]++

                # Add to timeline if timestamp available
                if ($timestamp -and $IncludeTimeline) {
                    $script:TimelineEvents += [PSCustomObject]@{
                        Timestamp = $timestamp
                        Event = "$($pattern.Category): $($issue.MatchedText)"
                        Severity = $pattern.Severity
                    }
                }

                break  # Only match first pattern per line
            }
        }
    }
}

function Analyze-TraceFiles {
    param([array]$Files)

    $totalFiles = $Files.Count
    $currentFile = 0

    foreach ($file in $Files) {
        $currentFile++
        Write-Log "Processing file $currentFile of $totalFiles: $($file.Name)" -Level 'Info'

        try {
            $lineNumber = 0
            Get-Content -Path $file.FullName -ErrorAction Stop | ForEach-Object {
                $lineNumber++
                Parse-TraceLine -Line $_ -LineNumber $lineNumber -FileName $file.Name
            }
        }
        catch {
            Write-Log "Error processing file $($file.Name): $_" -Level 'Error'
        }
    }
}

function Get-FilteredIssues {
    param([array]$AllIssues)

    if ($SeverityFilter -eq 'All') {
        return $AllIssues
    }

    return $AllIssues | Where-Object { $_.Severity -eq $SeverityFilter }
}

function Format-ConsoleReport {
    param([array]$FilteredIssues)

    Write-Host "`n" + ("=" * 80) -ForegroundColor Cyan
    Write-Host "  CITRIX CDF TRACE ANALYSIS REPORT" -ForegroundColor Cyan
    Write-Host ("=" * 80) -ForegroundColor Cyan

    # Summary Statistics
    Write-Host "`nSUMMARY STATISTICS:" -ForegroundColor Yellow
    Write-Host "  Total Lines Analyzed: $($script:Statistics.TotalLines)"
    Write-Host "  Total Issues Found: $($script:Statistics.TotalIssues)"
    Write-Host "  Critical: " -NoNewline -ForegroundColor Red
    Write-Host $script:Statistics.CriticalCount
    Write-Host "  Errors: " -NoNewline -ForegroundColor Red
    Write-Host $script:Statistics.ErrorCount
    Write-Host "  Warnings: " -NoNewline -ForegroundColor Yellow
    Write-Host $script:Statistics.WarningCount
    Write-Host "  Info: " -NoNewline -ForegroundColor Gray
    Write-Host $script:Statistics.InfoCount

    # Category Breakdown
    Write-Host "`nISSUES BY CATEGORY:" -ForegroundColor Yellow
    $script:Statistics.Categories.GetEnumerator() |
        Sort-Object Value -Descending |
        ForEach-Object {
            Write-Host "  $($_.Key): " -NoNewline
            Write-Host $_.Value -ForegroundColor Cyan
        }

    # Top Issues
    Write-Host "`nTOP $TopIssues ROOT CAUSES:" -ForegroundColor Yellow
    $topIssuesList = $FilteredIssues |
        Group-Object RootCause |
        Sort-Object Count -Descending |
        Select-Object -First $TopIssues

    $rank = 1
    foreach ($group in $topIssuesList) {
        $severityColor = switch ($group.Group[0].Severity) {
            'Critical' { 'Red' }
            'Error' { 'Red' }
            'Warning' { 'Yellow' }
            default { 'White' }
        }

        Write-Host "`n  $rank. " -NoNewline -ForegroundColor Gray
        Write-Host "[$($group.Group[0].Severity)] " -NoNewline -ForegroundColor $severityColor
        Write-Host "$($group.Group[0].Category) - " -NoNewline -ForegroundColor Cyan
        Write-Host "Count: $($group.Count)" -ForegroundColor White
        Write-Host "     Root Cause: " -NoNewline -ForegroundColor Gray
        Write-Host $group.Name -ForegroundColor White

        # Show sample occurrences
        $samples = $group.Group | Select-Object -First 3
        Write-Host "     Sample occurrences:" -ForegroundColor Gray
        foreach ($sample in $samples) {
            Write-Host "       - $($sample.FileName):$($sample.LineNumber)" -ForegroundColor DarkGray
            Write-Host "         $($sample.MatchedText)" -ForegroundColor DarkGray
        }

        $rank++
    }

    # Timeline
    if ($IncludeTimeline -and $script:TimelineEvents.Count -gt 0) {
        Write-Host "`nEVENT TIMELINE:" -ForegroundColor Yellow
        $script:TimelineEvents |
            Sort-Object Timestamp |
            Select-Object -First 20 |
            ForEach-Object {
                $color = switch ($_.Severity) {
                    'Critical' { 'Red' }
                    'Error' { 'Red' }
                    'Warning' { 'Yellow' }
                    default { 'White' }
                }
                Write-Host "  $($_.Timestamp.ToString('yyyy-MM-dd HH:mm:ss')) - " -NoNewline -ForegroundColor Gray
                Write-Host $_.Event -ForegroundColor $color
            }

        if ($script:TimelineEvents.Count -gt 20) {
            Write-Host "  ... and $($script:TimelineEvents.Count - 20) more events" -ForegroundColor Gray
        }
    }

    Write-Host "`n" + ("=" * 80) -ForegroundColor Cyan
}

function Export-CSVReport {
    param([array]$FilteredIssues, [string]$Path)

    $FilteredIssues |
        Select-Object Timestamp, Severity, Category, IssueType, RootCause, FileName, LineNumber, MatchedText |
        Export-Csv -Path $Path -NoTypeInformation -Force

    Write-Log "CSV report exported to: $Path" -Level 'Success'
}

function Export-HTMLReport {
    param([array]$FilteredIssues, [string]$Path)

    $html = @"
<!DOCTYPE html>
<html>
<head>
    <title>Citrix CDF Trace Analysis Report</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; background-color: #f5f5f5; }
        h1 { color: #0078D4; border-bottom: 3px solid #0078D4; padding-bottom: 10px; }
        h2 { color: #333; margin-top: 30px; }
        .summary { background-color: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stat { display: inline-block; margin: 10px 20px; }
        .stat-label { font-weight: bold; color: #666; }
        .stat-value { font-size: 24px; color: #0078D4; }
        table { width: 100%; border-collapse: collapse; background-color: white; margin-top: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        th { background-color: #0078D4; color: white; padding: 12px; text-align: left; }
        td { padding: 10px; border-bottom: 1px solid #ddd; }
        tr:hover { background-color: #f0f0f0; }
        .critical { color: #D83B01; font-weight: bold; }
        .error { color: #E81123; }
        .warning { color: #FFB900; }
        .info { color: #107C10; }
        .category { background-color: #E1DFDD; padding: 3px 8px; border-radius: 3px; font-size: 0.9em; }
        .timestamp { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <h1>Citrix CDF Trace Analysis Report</h1>
    <p>Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')</p>

    <div class="summary">
        <h2>Summary Statistics</h2>
        <div class="stat">
            <div class="stat-label">Total Lines</div>
            <div class="stat-value">$($script:Statistics.TotalLines)</div>
        </div>
        <div class="stat">
            <div class="stat-label">Total Issues</div>
            <div class="stat-value">$($script:Statistics.TotalIssues)</div>
        </div>
        <div class="stat">
            <div class="stat-label">Critical</div>
            <div class="stat-value critical">$($script:Statistics.CriticalCount)</div>
        </div>
        <div class="stat">
            <div class="stat-label">Errors</div>
            <div class="stat-value error">$($script:Statistics.ErrorCount)</div>
        </div>
        <div class="stat">
            <div class="stat-label">Warnings</div>
            <div class="stat-value warning">$($script:Statistics.WarningCount)</div>
        </div>
    </div>

    <h2>Issues by Category</h2>
    <table>
        <tr><th>Category</th><th>Count</th></tr>
"@

    $script:Statistics.Categories.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object {
        $html += "<tr><td>$($_.Key)</td><td>$($_.Value)</td></tr>`n"
    }

    $html += @"
    </table>

    <h2>Detailed Issues</h2>
    <table>
        <tr>
            <th>Severity</th>
            <th>Category</th>
            <th>Root Cause</th>
            <th>File</th>
            <th>Line</th>
            <th>Timestamp</th>
        </tr>
"@

    $FilteredIssues | Select-Object -First 500 | ForEach-Object {
        $severityClass = $_.Severity.ToLower()
        $html += @"
        <tr>
            <td class="$severityClass">$($_.Severity)</td>
            <td><span class="category">$($_.Category)</span></td>
            <td>$($_.RootCause)</td>
            <td>$($_.FileName)</td>
            <td>$($_.LineNumber)</td>
            <td class="timestamp">$($_.Timestamp)</td>
        </tr>
"@
    }

    $html += @"
    </table>
</body>
</html>
"@

    $html | Out-File -FilePath $Path -Encoding UTF8 -Force
    Write-Log "HTML report exported to: $Path" -Level 'Success'
}

function Export-JSONReport {
    param([array]$FilteredIssues, [string]$Path)

    $report = @{
        GeneratedAt = (Get-Date -Format 'o')
        Statistics = $script:Statistics
        Issues = $FilteredIssues
    }

    $report | ConvertTo-Json -Depth 10 | Out-File -FilePath $Path -Encoding UTF8 -Force
    Write-Log "JSON report exported to: $Path" -Level 'Success'
}

# Main execution
try {
    Write-Log "Starting Citrix CDF Trace Analysis..." -Level 'Info'
    Write-Log "Trace Path: $TracePath" -Level 'Info'
    Write-Log "Severity Filter: $SeverityFilter" -Level 'Info'

    # Get trace files
    $traceFiles = Get-TraceFiles -Path $TracePath
    Write-Log "Found $($traceFiles.Count) trace file(s) to analyze" -Level 'Info'

    if ($traceFiles.Count -eq 0) {
        Write-Log "No trace files found at specified path" -Level 'Error'
        exit 1
    }

    # Analyze traces
    Analyze-TraceFiles -Files $traceFiles

    # Filter issues
    $filteredIssues = Get-FilteredIssues -AllIssues $script:Issues

    if ($filteredIssues.Count -eq 0) {
        Write-Log "No issues found matching the specified criteria" -Level 'Warning'
        exit 0
    }

    # Generate output
    switch ($ExportFormat) {
        'Console' {
            Format-ConsoleReport -FilteredIssues $filteredIssues
        }
        'CSV' {
            if (-not $OutputPath) {
                $OutputPath = Join-Path (Get-Location) "CitrixCDFAnalysis_$(Get-Date -Format 'yyyyMMdd_HHmmss').csv"
            }
            Export-CSVReport -FilteredIssues $filteredIssues -Path $OutputPath
        }
        'HTML' {
            if (-not $OutputPath) {
                $OutputPath = Join-Path (Get-Location) "CitrixCDFAnalysis_$(Get-Date -Format 'yyyyMMdd_HHmmss').html"
            }
            Export-HTMLReport -FilteredIssues $filteredIssues -Path $OutputPath
        }
        'JSON' {
            if (-not $OutputPath) {
                $OutputPath = Join-Path (Get-Location) "CitrixCDFAnalysis_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
            }
            Export-JSONReport -FilteredIssues $filteredIssues -Path $OutputPath
        }
    }

    Write-Log "Analysis complete!" -Level 'Success'
}
catch {
    Write-Log "Fatal error during analysis: $_" -Level 'Error'
    Write-Log $_.ScriptStackTrace -Level 'Error'
    exit 1
}

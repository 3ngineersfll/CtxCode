# Citrix Diagnostic Toolkit

PowerShell scripts for analyzing and diagnosing Citrix Virtual Apps and Desktops issues.

## Tools Included

1. **Parse-CitrixCDFTrace.ps1** - Parse CDF trace files and identify root causes
2. **Get-CitrixBlackScreenReport.ps1** - Historical analysis of black screen incidents
3. **Watch-CitrixBlackScreen.ps1** - Real-time monitoring for black screen events
4. **Get-VDAListFromDeliveryController.ps1** - Retrieve VDA server lists from Delivery Controllers

---

# Parse-CitrixCDFTrace.ps1

## Overview

Comprehensive parser for Citrix CDF (Common Diagnostic Format) trace files that automatically identifies root causes of common Citrix issues including session failures, authentication problems, HDX issues, graphics problems, and service crashes.

## Features

- **Automatic Issue Detection**: Identifies 12+ categories of common Citrix issues
- **Root Cause Analysis**: Provides actionable root cause explanations for each issue type
- **ETL File Support**: Automatically converts binary ETL traces to text format for analysis
- **Multiple Conversion Methods**: Uses tracerpt, Get-WinEvent, and netsh for ETL conversion
- **Multiple Export Formats**: Console, CSV, HTML, and JSON output
- **Timeline Analysis**: Optional event timeline reconstruction
- **Severity Filtering**: Filter by Critical, Error, Warning, or Info levels
- **Batch Processing**: Analyze multiple trace files or entire directories (mixed .txt, .log, .etl)

## Detected Issue Categories

| Category | Issue Types | Severity |
|----------|-------------|----------|
| Session | Connection failures, session start failures | Critical |
| Authentication | Kerberos/NTLM failures, credential issues | Critical |
| HDX | Virtual channel failures, USB redirection issues | Error |
| Graphics | Black screen, explorer.exe crashes, GPU errors | Critical |
| Network | Disconnections, EDT failures, high latency | Error |
| Service | Service crashes, unexpected terminations | Critical |
| Licensing | License unavailable, checkout failures | Critical |
| Profile | Profile load failures, FSLogix errors | Error |
| Registration | VDA registration failures, broker connectivity | Critical |
| Performance | High CPU/memory, latency, frame rate drops | Warning |
| Printing | Printer redirection failures, driver issues | Warning |
| Security | SSL/TLS errors, certificate problems | Error |

## Quick Start

### Basic Analysis (Console Output)

```powershell
.\Parse-CitrixCDFTrace.ps1 -TracePath "C:\Traces\session.log"
```

### Export to HTML Report

```powershell
.\Parse-CitrixCDFTrace.ps1 -TracePath "C:\Traces\" -ExportFormat HTML -OutputPath "C:\Reports\analysis.html"
```

### Filter Critical Issues Only

```powershell
.\Parse-CitrixCDFTrace.ps1 -TracePath "C:\Traces\vda.log" -SeverityFilter Critical
```

### Include Timeline and Export JSON

```powershell
.\Parse-CitrixCDFTrace.ps1 -TracePath "C:\Traces\" -ExportFormat JSON -IncludeTimeline -OutputPath "analysis.json"
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `TracePath` | String | Yes | - | Path to CDF trace file (.txt, .log, .etl) or directory |
| `OutputPath` | String | No | Auto-generated | Path to save analysis report |
| `ExportFormat` | String | No | Console | Output format: Console, CSV, HTML, JSON |
| `SeverityFilter` | String | No | All | Filter by: Critical, Error, Warning, Info, All |
| `TopIssues` | Int | No | 10 | Number of top issues to display in summary |
| `IncludeTimeline` | Switch | No | False | Include event timeline in report |
| `KeepConvertedFiles` | Switch | No | False | Preserve converted ETL files after analysis |
| `ConvertedFilesPath` | String | No | Temp dir | Custom directory for converted ETL files |

## ETL File Support

The script now supports **binary ETL (Event Trace Log) files** - the native format produced by Citrix CDF Control and other ETW-based tracing tools.

### How It Works

When the script encounters an `.etl` file, it automatically:
1. Detects the file is binary ETL format
2. Attempts conversion using multiple methods (in order):
   - **tracerpt.exe** - Windows built-in ETW viewer
   - **Get-WinEvent** - PowerShell cmdlet for event logs
   - **netsh trace convert** - For network-specific traces
3. Converts to human-readable text format
4. Analyzes the converted text for issues
5. Optionally cleans up or preserves converted files

### ETL Usage Examples

```powershell
# Analyze a single ETL file
.\Parse-CitrixCDFTrace.ps1 -TracePath "C:\CDF\session.etl"

# Analyze ETL and keep the converted text file
.\Parse-CitrixCDFTrace.ps1 -TracePath "C:\CDF\session.etl" -KeepConvertedFiles

# Process directory with mixed file types (.txt, .log, .etl)
.\Parse-CitrixCDFTrace.ps1 -TracePath "C:\CDF\" -ExportFormat HTML

# Specify where to save converted ETL files
.\Parse-CitrixCDFTrace.ps1 -TracePath "C:\CDF\" -ConvertedFilesPath "C:\ConvertedTraces" -KeepConvertedFiles
```

### Collecting CDF/ETL Traces

To collect Citrix CDF traces in ETL format:

```powershell
# Using Citrix CDF Control (CDFControl.exe)
# Start tracing
CDFControl.exe /start /maxsize:1024 /outputpath:"C:\CDF\"

# Reproduce the issue...

# Stop tracing
CDFControl.exe /stop
```

Alternatively, use the Citrix Scout diagnostics tool or the built-in CDF tracing in Citrix Studio.

### Requirements for ETL Conversion

- **Windows ETW subsystem** (built into Windows)
- **Administrative privileges** (recommended for best results)
- **Sufficient disk space** (converted files can be large)
- **PowerShell 5.1+**

### Troubleshooting ETL Conversion

If ETL conversion fails:
1. Ensure you're running PowerShell as Administrator
2. Verify the ETL file is not corrupted (try opening with Windows Performance Analyzer)
3. Use `-KeepConvertedFiles` to inspect partial conversions
4. Manually convert using: `tracerpt.exe trace.etl -o output.txt -of CSV`
5. For Citrix-specific traces, consider using Citrix CDF Analyzer tool

## Sample Output

### Console Output

```
================================================================================
  CITRIX CDF TRACE ANALYSIS REPORT
================================================================================

SUMMARY STATISTICS:
  Total Lines Analyzed: 15,432
  Total Issues Found: 47
  Critical: 12
  Errors: 23
  Warnings: 12
  Info: 0

ISSUES BY CATEGORY:
  Session: 8
  Authentication: 5
  Graphics: 4
  Network: 12
  HDX: 7
  Licensing: 3
  Profile: 6
  Service: 2

TOP 10 ROOT CAUSES:

  1. [Critical] Session - Count: 8
     Root Cause: Session connection failure - Check network connectivity,
                 firewall rules, and VDA registration
     Sample occurrences:
       - session.log:1245
         Connection failed: CGP Error
       - session.log:3456
         ICA Connection attempt failed

  2. [Error] Network - Count: 12
     Root Cause: Network disconnection - Check network stability, MTU settings,
                 QoS policies, and EDT/HDX Adaptive Transport
     Sample occurrences:
       - vda.log:892
         EDT connection broken: Packet loss exceeds threshold
       ...
```

### HTML Report

The HTML export creates a professional, styled report with:
- Summary statistics dashboard
- Category breakdown table
- Detailed issue listing with color-coded severity
- Timestamps and file references
- Responsive design for easy viewing

### CSV Export Columns

- Timestamp
- Severity
- Category
- IssueType
- RootCause
- FileName
- LineNumber
- MatchedText

## Common Use Cases

### Troubleshooting Session Launch Failures

```powershell
.\Parse-CitrixCDFTrace.ps1 -TracePath "C:\Traces\session_failure.log" -SeverityFilter Critical
```

Look for Session, Authentication, and Registration categories.

### Analyzing Black Screen Issues

```powershell
.\Parse-CitrixCDFTrace.ps1 -TracePath "C:\Traces\blackscreen.log" |
    Where-Object { $_.Category -eq 'Graphics' }
```

### Performance Investigation

```powershell
.\Parse-CitrixCDFTrace.ps1 -TracePath "C:\Traces\slow_performance.log" -SeverityFilter Warning -IncludeTimeline
```

Check Performance and Network categories for latency, bandwidth, or resource issues.

### Batch Analysis of Multiple Traces

```powershell
Get-ChildItem "C:\Traces\*.log" | ForEach-Object {
    .\Parse-CitrixCDFTrace.ps1 -TracePath $_.FullName -ExportFormat CSV -OutputPath "C:\Reports\$($_.BaseName)_analysis.csv"
}
```

## Integration Examples

### Email Critical Issues

```powershell
$analysis = .\Parse-CitrixCDFTrace.ps1 -TracePath "C:\Traces\" -ExportFormat JSON
$critical = ($analysis | ConvertFrom-Json).Issues | Where-Object { $_.Severity -eq 'Critical' }

if ($critical.Count -gt 0) {
    Send-MailMessage -To "citrix-admins@company.com" `
        -Subject "Critical Citrix Issues Detected - $($critical.Count) found" `
        -Body "Critical issues detected in traces. See attached report." `
        -SmtpServer "smtp.company.com"
}
```

### Splunk/SIEM Integration

```powershell
# Export as JSON for log aggregation
.\Parse-CitrixCDFTrace.ps1 -TracePath "C:\Traces\" -ExportFormat JSON -OutputPath "C:\Logs\citrix_analysis.json"

# Parse and send to Splunk HEC
$results = Get-Content "C:\Logs\citrix_analysis.json" | ConvertFrom-Json
$results.Issues | ForEach-Object {
    Invoke-RestMethod -Uri "https://splunk:8088/services/collector" `
        -Method POST `
        -Headers @{Authorization="Splunk <token>"} `
        -Body ($_ | ConvertTo-Json)
}
```

---

# Get-CitrixBlackScreenReport.ps1

## Overview

PowerShell script to identify and report on users historically impacted by Citrix black screen issues requiring explorer.exe restart.

## Problem Statement

Users reconnecting to Citrix sessions experience black screens. The only recovery method is restarting explorer.exe. This script helps identify:
- Which users have been impacted
- How frequently the issue occurs
- Which VDA servers are affected
- Historical patterns of the issue

## Where to Scan: VDA vs CWA

**Scan the VDA (Virtual Delivery Agent)** - NOT the CWA (Citrix Workspace App)

**Why VDA?**
- The black screen occurs on the VDA where the session runs
- Explorer.exe runs on the VDA, not the client
- Session reconnection events are logged on the VDA
- Event logs showing explorer.exe restarts are on the VDA

## Prerequisites

- PowerShell 5.1 or higher
- Remote Event Log access to VDA servers
- Appropriate permissions to query event logs on VDA machines
- Network connectivity to VDA servers

## Usage Examples

### Basic Usage - Single Server

```powershell
.\Get-CitrixBlackScreenReport.ps1 -ComputerName "VDA-SERVER01"
```

### Pipeline Input from Text File

```powershell
Get-Content vda-servers.txt | .\Get-CitrixBlackScreenReport.ps1 -DaysBack 60 -ExportPath "C:\Reports\BlackScreen.csv"
```

### Multiple Servers with Export

```powershell
"VDA-SERVER01","VDA-SERVER02","VDA-SERVER03" | .\Get-CitrixBlackScreenReport.ps1 -ExportPath "C:\Reports\BlackScreen.csv"
```

### Query Active Directory for All VDAs

```powershell
Get-ADComputer -Filter "Name -like 'VDA-*'" |
    Select-Object -ExpandProperty Name |
    .\Get-CitrixBlackScreenReport.ps1 -DaysBack 90 -ExportPath "C:\Reports\BlackScreen.csv"
```

### Detailed Output with All Events

```powershell
Get-Content vda-servers.txt |
    .\Get-CitrixBlackScreenReport.ps1 -IncludeDetailedEvents -ExportPath "C:\Reports\BlackScreen.csv"
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `ComputerName` | String[] | Yes | - | VDA server names (accepts pipeline input) |
| `DaysBack` | Int | No | 30 | Number of days of history to scan |
| `ExportPath` | String | No | - | Path to export CSV report |
| `IncludeDetailedEvents` | Switch | No | False | Include detailed event information |

## What the Script Detects

The script identifies black screen incidents by analyzing:

1. **Citrix Session Reconnection Events**
   - Event IDs: 1000, 1006 from Citrix services
   - Indicates user reconnecting to existing session

2. **Explorer.exe Crashes/Restarts**
   - Event IDs: 1000, 1002 from Application log
   - Explorer.exe process terminations and restarts

3. **Correlation Logic**
   - Matches explorer.exe restarts within 15 minutes of session reconnection
   - Flags as potential black screen incident

## Output Format

### Console Summary
```
================================================================
  Citrix Black Screen Historical Impact Report
================================================================

SUMMARY STATISTICS:
  Total Incidents: 47
  Unique Users Impacted: 12
  VDA Servers with Issues: 5

TOP 5 MOST IMPACTED USERS:
  DOMAIN\john.doe: 15 incidents
  DOMAIN\jane.smith: 8 incidents
  DOMAIN\bob.jones: 7 incidents
  ...
```

### CSV Export Columns

- **Computer**: VDA server name
- **Username**: Affected user account
- **ReconnectionTime**: When user reconnected
- **ExplorerRestartTime**: When explorer.exe was restarted
- **ReconnectionEventID**: Event ID for reconnection
- **ExplorerEventID**: Event ID for explorer restart
- **TimeBetweenEvents**: Minutes between reconnect and restart
- **EventCount**: Number of related events

## Troubleshooting

### Cannot Connect to VDA

**Error**: "Cannot connect to VDA-SERVER01 - Skipping"

**Solutions**:
- Verify network connectivity: `Test-Connection VDA-SERVER01`
- Check WMI access: `Get-WmiObject Win32_OperatingSystem -ComputerName VDA-SERVER01`
- Ensure Windows Remote Management is enabled
- Verify firewall allows remote event log access (TCP 135, dynamic RPC ports)

### No Events Found

**Possible Reasons**:
- Issue hasn't occurred in the scanned time period
- Event logs have been cleared or rotated
- Insufficient permissions to read event logs
- Citrix logging not configured properly

**Recommendations**:
- Increase `-DaysBack` parameter
- Check event log retention settings
- Verify account has Event Log Readers permissions
- Enable Citrix diagnostic logging if needed

### Permission Denied

**Error**: Access denied when querying event logs

**Solutions**:
- Run PowerShell as Administrator
- Ensure account is member of "Event Log Readers" group on VDAs
- Add account to local Administrators group on VDAs (if appropriate)

## Advanced Configuration

### Enable Process Auditing (Optional)

For more detailed tracking, enable process creation auditing on VDAs:

```powershell
# Run on each VDA server
auditpol /set /subcategory:"Process Creation" /success:enable /failure:enable
```

This provides Event ID 4688 when explorer.exe starts, giving more precise tracking.

### Scheduled Monitoring

Create a scheduled task to run weekly:

```powershell
$Action = New-ScheduledTaskAction -Execute "PowerShell.exe" `
    -Argument "-File C:\Scripts\Get-CitrixBlackScreenReport.ps1 -ComputerName (Get-Content C:\Scripts\vda-servers.txt) -ExportPath C:\Reports\BlackScreen_$(Get-Date -Format 'yyyy-MM-dd').csv"

$Trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 6am

Register-ScheduledTask -TaskName "Citrix Black Screen Report" -Action $Action -Trigger $Trigger
```

## Integration with Monitoring Tools

### Email Report

```powershell
$Report = Get-Content vda-servers.txt | .\Get-CitrixBlackScreenReport.ps1 -ExportPath "C:\Reports\BlackScreen.csv"

if ($Report) {
    Send-MailMessage -To "citrix-admins@company.com" `
        -From "monitoring@company.com" `
        -Subject "Citrix Black Screen Report - $(Get-Date -Format 'yyyy-MM-dd')" `
        -Body "Found $($Report.Count) incidents. See attachment." `
        -Attachments "C:\Reports\BlackScreen.csv" `
        -SmtpServer "smtp.company.com"
}
```

### Import to SIEM/Splunk

Export as JSON for import to SIEM systems:

```powershell
$Report = Get-Content vda-servers.txt | .\Get-CitrixBlackScreenReport.ps1
$Report | ConvertTo-Json | Out-File "C:\Reports\BlackScreen.json"
```

## Version History

- **1.0** (2025-12-20): Initial release

## Support

For issues or enhancements, please contact your Citrix support team.

## License

Internal use only.

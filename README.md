# Citrix Troubleshooting Toolkit

A collection of tools for diagnosing and resolving common Citrix environment issues, including black screen incidents on VDA servers and DPI scaling problems on macOS clients.

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

---

# Citrix DPI Matching Fix Tool for macOS

Bash script that detects, diagnoses, and fixes DPI scaling issues with Citrix Workspace app on macOS, especially on Retina/HiDPI displays.

## Problem Statement

macOS users with Retina or external HiDPI displays frequently experience:
- Blurry text in Citrix sessions
- Incorrect resolution scaling after connecting external monitors
- DPI mismatch when dragging sessions between displays
- Sessions not matching native display resolution

## Prerequisites

- macOS 11.0 (Big Sur) or later
- Citrix Workspace app installed (2112+ recommended)
- Terminal / shell access
- No administrator/sudo required for standard fixes

## Usage Examples

### Run Diagnostics (Default)

```bash
./Fix-CitrixDpiMac.sh
```

### Verbose Diagnostics

```bash
./Fix-CitrixDpiMac.sh --diagnose --verbose
```

### Apply All Fixes Automatically

```bash
./Fix-CitrixDpiMac.sh --fix-all
```

### Interactive Fix Mode

```bash
./Fix-CitrixDpiMac.sh --fix
```

### Backup Before Fixing

```bash
./Fix-CitrixDpiMac.sh --backup
./Fix-CitrixDpiMac.sh --fix-all
./Fix-CitrixDpiMac.sh --diagnose
```

### JSON Output for Automation

```bash
./Fix-CitrixDpiMac.sh --json
```

### Reset to Defaults

```bash
./Fix-CitrixDpiMac.sh --reset
```

## Parameters

| Option | Description |
|--------|-------------|
| `--diagnose` | Run diagnostics only (default) |
| `--fix` | Apply recommended fixes interactively |
| `--fix-all` | Apply all fixes without prompting |
| `--reset` | Reset all Citrix DPI settings to defaults |
| `--backup` | Backup current Citrix configuration |
| `--restore` | Restore configuration from backup |
| `--verbose` | Show detailed diagnostic output |
| `--json` | Output results in JSON format |

## What the Tool Detects and Fixes

### Client-Side Checks
1. **macOS version and architecture** — Verifies compatibility, detects Rosetta emulation
2. **Display configuration** — Enumerates all displays, detects Retina/HiDPI, identifies mixed-DPI setups
3. **Citrix Workspace version** — Checks minimum version for DPI matching support
4. **DPI preference audit** — Checks `DPIMatchingEnabled`, `HighDPI`, `UseHighDPI`, and other keys
5. **ICA configuration files** — Scans `module.ini` and `AppServerDefaults.ini` for hardcoded resolutions
6. **macOS display preferences** — Font smoothing, scaled resolution mode

### Fixes Applied
- Enables `DPIMatchingEnabled` in Citrix preferences
- Enables `HighDPI` and `UseHighDPI` modes
- Enables `DesktopApplianceDPIMatchingEnabled` for desktop sessions
- Removes hardcoded resolution overrides from ICA config files
- Writes DPI settings to `module.ini`
- Clears Citrix rendering cache
- Enables macOS font smoothing if disabled
- Restarts Citrix Workspace to apply changes

### Server-Side Policy Reminders
The tool also provides guidance on server-side Citrix policies that must be configured:
- **Display memory limit** — Should be adequate for HiDPI (e.g., 131072 KB)
- **DPI matching** — Must be enabled or set to allow client setting
- **Legacy graphics mode** — Must be disabled
- **Use video codec for compression** — Recommended for actively changing regions

## Troubleshooting

### Fixes Applied But Session Still Blurry

1. **Disconnect and reconnect** — Don't just resize; fully disconnect the session and reconnect
2. **Check server-side policies** — Client fixes alone are not sufficient if server policies block DPI matching
3. **Verify VDA version** — VDA must be 1912 LTSR CU3+ or 2103+ for best DPI support

### Mixed-DPI Multi-Monitor Issues

When using Retina + non-Retina displays simultaneously:
1. Run `./Fix-CitrixDpiMac.sh --fix-all` to ensure all client settings are correct
2. Ask your Citrix admin to enable the "DPI matching" policy
3. Consider using same-DPI displays for the best experience

### Need to Undo Changes

```bash
# Restore from backup
./Fix-CitrixDpiMac.sh --restore

# Or reset everything to defaults
./Fix-CitrixDpiMac.sh --reset
```

---

## Version History

- **1.0** (2025-12-20): Initial release — Black screen reporting tools
- **1.1** (2025-12-20): Added macOS DPI matching diagnostic and fix tool

## Support

For issues or enhancements, please contact your Citrix support team.

## License

Internal use only.

# Quick Start Guide

Get up and running with the Citrix Black Screen reporting tool in 5 minutes.

## Step 1: Prepare Your VDA Server List

Create a text file with your VDA server names (one per line):

```powershell
# Option A: Create manually
notepad vda-servers.txt
# Add your VDA server names, one per line

# Option B: Get from Active Directory
Get-ADComputer -Filter "Name -like 'VDA-*'" |
    Select-Object -ExpandProperty Name |
    Out-File vda-servers.txt

# Option C: Get from Delivery Controller
.\Get-VDAListFromDeliveryController.ps1 -DeliveryController "DDC01" |
    Out-File vda-servers.txt
```

## Step 2: Run the Historical Report

```powershell
# Basic scan (last 30 days)
Get-Content vda-servers.txt | .\Get-CitrixBlackScreenReport.ps1

# Scan last 90 days and export to CSV
Get-Content vda-servers.txt |
    .\Get-CitrixBlackScreenReport.ps1 -DaysBack 90 -ExportPath "C:\Reports\BlackScreen.csv"
```

## Step 3: Review the Results

The script will output:
- Total number of incidents
- Unique users impacted
- VDA servers affected
- Top 5 most impacted users

Example output:
```
SUMMARY STATISTICS:
  Total Incidents: 47
  Unique Users Impacted: 12
  VDA Servers with Issues: 5

TOP 5 MOST IMPACTED USERS:
  DOMAIN\john.doe: 15 incidents
  DOMAIN\jane.smith: 8 incidents
```

## Step 4: Open the CSV Report

```powershell
# Open in Excel
Invoke-Item "C:\Reports\BlackScreen.csv"

# Or import back to PowerShell for analysis
$Report = Import-Csv "C:\Reports\BlackScreen.csv"
$Report | Where-Object {$_.Username -eq "DOMAIN\john.doe"} | Format-Table
```

## Real-Time Monitoring (Optional)

Set up continuous monitoring:

```powershell
.\Watch-CitrixBlackScreen.ps1 -ComputerName (Get-Content vda-servers.txt) -CheckInterval 60
```

## Common Issues

### "Cannot connect to VDA"
- Check network connectivity
- Verify firewall allows remote event log access
- Ensure you have appropriate permissions

### "No events found"
- Increase the `-DaysBack` parameter
- Verify event logs haven't been cleared
- Check that Citrix logging is enabled

## Next Steps

1. **Schedule Regular Reports**: Set up a scheduled task (see README.md)
2. **Email Reports**: Configure email notifications (see README.md)
3. **Root Cause Analysis**: Use this data to identify patterns and work with Citrix support

## Support

See README.md for detailed documentation and troubleshooting.

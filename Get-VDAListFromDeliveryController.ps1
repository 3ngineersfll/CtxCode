<#
.SYNOPSIS
    Retrieves list of VDA servers from Citrix Delivery Controller.

.DESCRIPTION
    Helper script to get all VDA server names from the Citrix Delivery Controller,
    which can then be piped to Get-CitrixBlackScreenReport.ps1

.PARAMETER DeliveryController
    Name of the Citrix Delivery Controller server.

.PARAMETER DeliveryGroup
    Optional: Filter by specific Delivery Group name.

.PARAMETER OnlyRegistered
    Only return VDAs that are currently registered.

.EXAMPLE
    .\Get-VDAListFromDeliveryController.ps1 -DeliveryController "DDC01" | .\Get-CitrixBlackScreenReport.ps1 -ExportPath "C:\Reports\BlackScreen.csv"

    Gets all VDAs from DDC01 and scans them for black screen issues.

.EXAMPLE
    .\Get-VDAListFromDeliveryController.ps1 -DeliveryController "DDC01" -DeliveryGroup "Production-VDI" -OnlyRegistered

    Gets only registered VDAs from the Production-VDI delivery group.

.NOTES
    Requires Citrix PowerShell SDK (Citrix.Broker.Admin.V2 module)
    Run from a server with Citrix Studio installed or with SDK installed separately.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$DeliveryController,

    [Parameter(Mandatory=$false)]
    [string]$DeliveryGroup,

    [Parameter(Mandatory=$false)]
    [switch]$OnlyRegistered
)

# Check if Citrix PowerShell SDK is available
try {
    Import-Module Citrix.Broker.Admin.V2 -ErrorAction Stop
} catch {
    Write-Error "Citrix PowerShell SDK not found. Please install Citrix Studio or the PowerShell SDK."
    Write-Error "Download from: https://www.citrix.com/downloads/citrix-virtual-apps-and-desktops/"
    exit 1
}

Write-Host "Connecting to Delivery Controller: $DeliveryController" -ForegroundColor Cyan

try {
    # Build parameters for Get-BrokerMachine
    $Params = @{
        AdminAddress = $DeliveryController
        MaxRecordCount = 10000
    }

    if ($DeliveryGroup) {
        $Params['DesktopGroupName'] = $DeliveryGroup
    }

    if ($OnlyRegistered) {
        $Params['RegistrationState'] = 'Registered'
    }

    # Get VDA machines
    $Machines = Get-BrokerMachine @Params

    if (-not $Machines) {
        Write-Warning "No VDA machines found matching criteria."
        return
    }

    Write-Host "Found $($Machines.Count) VDA machines" -ForegroundColor Green

    # Extract DNS names or hostnames
    $VDANames = $Machines | ForEach-Object {
        if ($_.DNSName) {
            $_.DNSName
        } elseif ($_.HostedMachineName) {
            $_.HostedMachineName
        } else {
            $_.MachineName -replace '.*\\', ''  # Remove domain prefix
        }
    } | Select-Object -Unique | Sort-Object

    Write-Host "Returning $($VDANames.Count) unique VDA server names" -ForegroundColor Green
    Write-Host ""

    # Output to pipeline
    return $VDANames

} catch {
    Write-Error "Failed to retrieve VDA list from Delivery Controller: $_"
    exit 1
}

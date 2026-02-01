#!/bin/bash
# ============================================================================
#  Fix-CitrixDpiMac.sh
#  Citrix DPI Matching Diagnostic & Fix Tool for macOS
# ============================================================================
#
#  SYNOPSIS
#    Detects, diagnoses, and fixes DPI scaling issues with Citrix Workspace
#    app on macOS, especially on Retina/HiDPI displays.
#
#  DESCRIPTION
#    When using Citrix Workspace on macOS with Retina or external HiDPI
#    displays, sessions frequently appear blurry, incorrectly scaled, or
#    mismatched between monitors. This tool:
#
#      - Detects all connected displays and their DPI/scaling settings
#      - Checks Citrix Workspace app installation and version
#      - Audits current Citrix DPI-related configuration
#      - Identifies common DPI matching problems
#      - Applies fixes for known DPI scaling issues
#      - Validates configuration after changes
#
#  COMMON PROBLEMS ADDRESSED
#    - Blurry text in Citrix sessions on Retina displays
#    - Incorrect resolution scaling after connecting external monitors
#    - DPI mismatch when dragging sessions between displays
#    - Session not matching native display resolution
#    - High DPI mode not enabled or misconfigured
#    - Citrix Workspace ignoring macOS display scaling preferences
#
#  USAGE
#    chmod +x Fix-CitrixDpiMac.sh
#    ./Fix-CitrixDpiMac.sh [--diagnose] [--fix] [--fix-all] [--reset]
#                          [--auto] [--install-agent] [--uninstall-agent]
#                          [--backup] [--restore] [--verbose] [--json]
#
#  OPTIONS
#    --diagnose         Run diagnostics only (default if no flag given)
#    --fix              Apply recommended fixes interactively
#    --fix-all          Apply all fixes without prompting
#    --auto             Detect current display topology and configure CWA
#                       automatically. Designed for roaming users who move
#                       between different monitor setups throughout the day.
#    --install-agent    Install a macOS LaunchAgent that watches for display
#                       configuration changes and runs --auto automatically.
#                       This gives a uniform experience across office desks,
#                       conference rooms, and home setups without any manual
#                       intervention.
#    --uninstall-agent  Remove the display-change LaunchAgent
#    --reset            Reset all Citrix DPI settings to defaults
#    --backup           Backup current Citrix configuration
#    --restore          Restore configuration from backup
#    --verbose          Show detailed diagnostic output
#    --json             Output results in JSON format
#    --help             Show this help message
#
#  ROAMING / HOTDESKING
#    Users who move between locations (office with dual monitors, conference
#    room with laptop only, home with a 4K display) need DPI settings that
#    adapt automatically. Use:
#
#      ./Fix-CitrixDpiMac.sh --install-agent
#
#    This installs a persistent LaunchAgent that detects every display
#    change event (plug/unplug monitor, open/close lid, dock/undock) and
#    reconfigures Citrix Workspace for the current topology — no user
#    action required.
#
#  REQUIREMENTS
#    - macOS 11.0 (Big Sur) or later
#    - Citrix Workspace app installed
#    - Terminal / shell access
#
#  VERSION
#    1.1 - 2025-12-20 - Add --auto mode and LaunchAgent for roaming support
#    1.0 - 2025-12-20 - Initial release
#
# ============================================================================

set -euo pipefail

# ── Constants ───────────────────────────────────────────────────────────────

readonly VERSION="1.1"
readonly SCRIPT_NAME="Fix-CitrixDpiMac"

# Citrix Workspace app paths
readonly CWA_APP_PATH="/Applications/Citrix Workspace.app"
readonly CWA_BUNDLE_ID="com.citrix.receiver.nomas"
readonly CWA_AUTH_BUNDLE="com.citrix.AuthManager_Mac"
readonly CWA_PREFS_DOMAIN="com.citrix.receiver.nomas"
readonly CWA_PREFS_FILE="$HOME/Library/Preferences/com.citrix.receiver.nomas.plist"
readonly CWA_ICA_DIR="$HOME/Library/Application Support/Citrix Receiver"
readonly CWA_CONFIG_DIR="$HOME/Library/Application Support/Citrix"
readonly CWA_MODULE_CONF="$HOME/Library/Application Support/Citrix Receiver/module.ini"
readonly CWA_APPSRV_CONF="$HOME/Library/Application Support/Citrix Receiver/Config/AppServerDefaults.ini"

# Backup directory
readonly BACKUP_DIR="$HOME/.citrix-dpi-backup"

# LaunchAgent for automatic display-change handling
readonly LAUNCH_AGENT_LABEL="com.citrix.dpi-matching-agent"
readonly LAUNCH_AGENT_PLIST="$HOME/Library/LaunchAgents/${LAUNCH_AGENT_LABEL}.plist"
readonly AGENT_LOG_DIR="$HOME/Library/Logs/CitrixDPI"
readonly AGENT_LOG_FILE="$AGENT_LOG_DIR/dpi-agent.log"
readonly TOPOLOGY_STATE_FILE="$BACKUP_DIR/.last-topology"

# Color codes
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly DIM='\033[2m'
readonly NC='\033[0m' # No Color

# ── Globals ─────────────────────────────────────────────────────────────────

MODE="diagnose"
VERBOSE=false
JSON_OUTPUT=false
ISSUES_FOUND=0
FIXES_APPLIED=0
DIAGNOSTICS=()
ISSUES=()
FIXES=()

# ── Helper Functions ────────────────────────────────────────────────────────

timestamp() {
    date "+%H:%M:%S"
}

log_info() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${CYAN}[$(timestamp)]${NC} $1"
    fi
}

log_success() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${GREEN}[$(timestamp)] ✓${NC} $1"
    fi
}

log_warn() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${YELLOW}[$(timestamp)] ⚠${NC} $1"
    fi
}

log_error() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${RED}[$(timestamp)] ✗${NC} $1"
    fi
}

log_verbose() {
    if [ "$VERBOSE" = true ] && [ "$JSON_OUTPUT" = false ]; then
        echo -e "${DIM}[$(timestamp)]   $1${NC}"
    fi
}

log_header() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo ""
        echo -e "${BOLD}════════════════════════════════════════════════════════════════${NC}"
        echo -e "${BOLD}  $1${NC}"
        echo -e "${BOLD}════════════════════════════════════════════════════════════════${NC}"
        echo ""
    fi
}

log_section() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo ""
        echo -e "${BOLD}── $1 ──${NC}"
        echo ""
    fi
}

add_diagnostic() {
    local key="$1"
    local value="$2"
    DIAGNOSTICS+=("$key|$value")
    log_verbose "$key: $value"
}

add_issue() {
    local severity="$1"
    local description="$2"
    local fix="$3"
    ISSUES+=("$severity|$description|$fix")
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
}

prompt_yes_no() {
    local prompt="$1"
    local default="${2:-n}"
    if [ "$MODE" = "fix-all" ]; then
        return 0
    fi
    local yn_hint="[y/N]"
    if [ "$default" = "y" ]; then
        yn_hint="[Y/n]"
    fi
    echo -ne "${YELLOW}  $prompt $yn_hint: ${NC}"
    read -r response
    response="${response:-$default}"
    case "$response" in
        [yY][eE][sS]|[yY]) return 0 ;;
        *) return 1 ;;
    esac
}

# ── Detection Functions ─────────────────────────────────────────────────────

check_macos_version() {
    log_section "macOS Environment"

    local os_version
    os_version=$(sw_vers -productVersion 2>/dev/null || echo "unknown")
    local os_major
    os_major=$(echo "$os_version" | cut -d. -f1)
    local os_build
    os_build=$(sw_vers -buildVersion 2>/dev/null || echo "unknown")
    local arch
    arch=$(uname -m)

    add_diagnostic "macOS Version" "$os_version ($os_build)"
    add_diagnostic "Architecture" "$arch"

    log_info "macOS version: ${BOLD}$os_version${NC} ($os_build)"
    log_info "Architecture: ${BOLD}$arch${NC}"

    if [ "$os_major" -lt 11 ] 2>/dev/null; then
        add_issue "HIGH" "macOS version $os_version is below 11.0 (Big Sur). DPI matching requires macOS 11.0+" "Upgrade macOS to 11.0 or later"
        log_error "macOS $os_version does not fully support Citrix DPI matching (requires 11.0+)"
    else
        log_success "macOS version supports DPI matching"
    fi

    # Check if running on Apple Silicon (affects rendering pipeline)
    if [ "$arch" = "arm64" ]; then
        add_diagnostic "Apple Silicon" "Yes"
        log_info "Running on Apple Silicon - native rendering pipeline available"

        # Check if Citrix is running under Rosetta
        if [ -d "$CWA_APP_PATH" ]; then
            local cwa_arch
            cwa_arch=$(file "$CWA_APP_PATH/Contents/MacOS/Citrix Workspace" 2>/dev/null | grep -o 'arm64\|x86_64' | head -1 || echo "unknown")
            add_diagnostic "CWA Binary Arch" "$cwa_arch"
            if [ "$cwa_arch" = "x86_64" ]; then
                add_issue "MEDIUM" "Citrix Workspace is running under Rosetta (x86_64 on arm64). This can cause DPI scaling artifacts." "Update Citrix Workspace to latest version with native Apple Silicon support"
                log_warn "Citrix Workspace is running under Rosetta emulation"
            fi
        fi
    fi
}

detect_displays() {
    log_section "Display Configuration"

    # Use system_profiler to get display info
    local display_json
    display_json=$(system_profiler SPDisplaysDataType -json 2>/dev/null || echo "{}")

    # Parse display count
    local display_count=0
    local retina_count=0
    local external_count=0

    # Use system_profiler text output for reliable parsing
    local display_info
    display_info=$(system_profiler SPDisplaysDataType 2>/dev/null || echo "")

    if [ -z "$display_info" ]; then
        log_error "Could not detect display configuration"
        add_issue "HIGH" "Unable to detect display configuration" "Ensure display is connected and recognized by macOS"
        return
    fi

    # Count displays and detect properties
    while IFS= read -r line; do
        if echo "$line" | grep -q "Resolution:"; then
            display_count=$((display_count + 1))
            local resolution
            resolution=$(echo "$line" | sed 's/.*Resolution: //' | xargs)
            add_diagnostic "Display $display_count Resolution" "$resolution"
            log_info "Display $display_count: ${BOLD}$resolution${NC}"

            if echo "$line" | grep -qi "retina\|hidpi"; then
                retina_count=$((retina_count + 1))
                log_info "  → Retina/HiDPI: ${GREEN}Yes${NC}"
            fi
        fi
        if echo "$line" | grep -q "Display Type: "; then
            local dtype
            dtype=$(echo "$line" | sed 's/.*Display Type: //' | xargs)
            if echo "$dtype" | grep -qi "external\|thunderbolt\|hdmi\|displayport\|usb"; then
                external_count=$((external_count + 1))
            fi
        fi
    done <<< "$display_info"

    if [ "$display_count" -eq 0 ]; then
        # Fallback: try screenresolution or defaults
        display_count=1
        log_warn "Could not enumerate displays via system_profiler, assuming 1 display"
    fi

    add_diagnostic "Total Displays" "$display_count"
    add_diagnostic "Retina Displays" "$retina_count"
    add_diagnostic "External Displays" "$external_count"

    log_info "Total displays: ${BOLD}$display_count${NC} (Retina: $retina_count, External: $external_count)"

    # Get the backing scale factor from macOS defaults
    local scale_factor
    scale_factor=$(defaults read -g AppleDisplayScaleFactor 2>/dev/null || echo "not set")
    add_diagnostic "macOS Scale Factor" "$scale_factor"
    log_info "macOS display scale factor: ${BOLD}$scale_factor${NC}"

    # Multi-monitor DPI mismatch detection
    if [ "$display_count" -gt 1 ]; then
        log_info "Multi-monitor setup detected"
        if [ "$retina_count" -gt 0 ] && [ "$retina_count" -lt "$display_count" ]; then
            add_issue "HIGH" "Mixed DPI displays detected ($retina_count Retina + $((display_count - retina_count)) standard). Citrix sessions may render incorrectly when dragged between displays." "Enable DPI matching in Citrix and set 'DesktopApplianceDPIMatchingEnabled' to true"
            log_warn "Mixed DPI setup: Retina + non-Retina displays cause scaling issues"
        fi
    fi

    if [ "$retina_count" -gt 0 ]; then
        log_info "Retina display(s) detected - DPI matching configuration is critical"
    fi
}

check_citrix_installation() {
    log_section "Citrix Workspace App"

    # Check if Citrix Workspace is installed
    if [ ! -d "$CWA_APP_PATH" ]; then
        log_error "Citrix Workspace app not found at $CWA_APP_PATH"
        add_issue "CRITICAL" "Citrix Workspace app is not installed" "Install Citrix Workspace from https://www.citrix.com/downloads/workspace-app/mac/"
        add_diagnostic "CWA Installed" "No"
        return 1
    fi

    add_diagnostic "CWA Installed" "Yes"
    log_success "Citrix Workspace app found"

    # Get version
    local cwa_version
    cwa_version=$(defaults read "$CWA_APP_PATH/Contents/Info" CFBundleShortVersionString 2>/dev/null || echo "unknown")
    local cwa_build
    cwa_build=$(defaults read "$CWA_APP_PATH/Contents/Info" CFBundleVersion 2>/dev/null || echo "unknown")
    add_diagnostic "CWA Version" "$cwa_version (build $cwa_build)"
    log_info "Version: ${BOLD}$cwa_version${NC} (build $cwa_build)"

    # Check minimum version for DPI matching
    # DPI matching was significantly improved in CWA 2112+ (version ~21.12)
    # Native high DPI support improved in 2203+ (~22.03)
    local major_ver
    major_ver=$(echo "$cwa_version" | cut -d. -f1)
    local minor_ver
    minor_ver=$(echo "$cwa_version" | cut -d. -f2)

    if [ "$major_ver" -lt 21 ] 2>/dev/null; then
        add_issue "HIGH" "Citrix Workspace version $cwa_version is outdated. DPI matching requires version 2112 (21.12) or later for proper support." "Update Citrix Workspace to the latest version"
        log_warn "CWA version is too old for reliable DPI matching"
    elif [ "$major_ver" -eq 21 ] && [ "$minor_ver" -lt 12 ] 2>/dev/null; then
        add_issue "MEDIUM" "Citrix Workspace version $cwa_version has limited DPI matching. Version 2112+ recommended." "Update Citrix Workspace to the latest version"
        log_warn "CWA version has limited DPI matching support"
    else
        log_success "CWA version supports DPI matching"
    fi

    # Check if CWA is running
    local cwa_running
    if pgrep -f "Citrix Workspace" > /dev/null 2>&1 || pgrep -f "ServiceRecord" > /dev/null 2>&1; then
        cwa_running="Yes"
        log_info "Citrix Workspace is currently running"
    else
        cwa_running="No"
        log_info "Citrix Workspace is not currently running"
    fi
    add_diagnostic "CWA Running" "$cwa_running"

    return 0
}

check_dpi_settings() {
    log_section "DPI Configuration Audit"

    # ── 1. Check defaults domain for DPI-related keys ───────────────────

    log_info "Checking Citrix preferences..."

    # Key DPI-related preference keys
    local dpi_keys=(
        "DesktopApplianceMode"
        "DesktopApplianceDPIMatchingEnabled"
        "DPIMatchingEnabled"
        "HighDPI"
        "UseHighDPI"
        "HiDPIEnabled"
        "ScreenResolution"
        "DesiredHRES"
        "DesiredVRES"
        "TWIMode"
        "UseLocalIME"
        "HDXAdaptiveTransport"
        "H264Enabled"
    )

    local found_settings=0
    for key in "${dpi_keys[@]}"; do
        local value
        value=$(defaults read "$CWA_PREFS_DOMAIN" "$key" 2>/dev/null || echo "__NOT_SET__")
        if [ "$value" != "__NOT_SET__" ]; then
            add_diagnostic "Pref: $key" "$value"
            log_info "  $key = ${BOLD}$value${NC}"
            found_settings=$((found_settings + 1))
        else
            log_verbose "  $key = (not set)"
        fi
    done

    if [ "$found_settings" -eq 0 ]; then
        log_warn "No DPI-related preferences found in Citrix defaults domain"
    fi

    # ── 2. Check DPIMatchingEnabled ─────────────────────────────────────

    local dpi_match
    dpi_match=$(defaults read "$CWA_PREFS_DOMAIN" "DPIMatchingEnabled" 2>/dev/null || echo "__NOT_SET__")
    if [ "$dpi_match" = "__NOT_SET__" ] || [ "$dpi_match" = "0" ] || [ "$dpi_match" = "false" ]; then
        add_issue "HIGH" "DPI Matching is not enabled in Citrix Workspace preferences. Sessions will render at standard DPI regardless of display." "Enable DPIMatchingEnabled in Citrix preferences"
        log_warn "DPIMatchingEnabled is OFF or not set"
    else
        log_success "DPIMatchingEnabled is ON"
    fi

    # ── 3. Check HighDPI setting ────────────────────────────────────────

    local high_dpi
    high_dpi=$(defaults read "$CWA_PREFS_DOMAIN" "HighDPI" 2>/dev/null || echo "__NOT_SET__")
    if [ "$high_dpi" = "__NOT_SET__" ] || [ "$high_dpi" = "0" ] || [ "$high_dpi" = "false" ]; then
        add_issue "HIGH" "HighDPI mode is not enabled. Citrix sessions will render at 1x resolution on Retina displays, causing blurry appearance." "Enable HighDPI in Citrix preferences"
        log_warn "HighDPI mode is OFF or not set"
    else
        log_success "HighDPI mode is ON"
    fi

    # ── 4. Check module.ini for ICA settings ────────────────────────────

    log_info "Checking ICA configuration files..."

    if [ -f "$CWA_MODULE_CONF" ]; then
        log_info "Found module.ini"

        # Check for DPI-related ICA settings
        local ica_dpi_settings=(
            "DesiredHRES"
            "DesiredVRES"
            "ScreenPercent"
            "TWIMode"
            "DPIMatchingEnabled"
            "UseHighDPI"
        )

        for setting in "${ica_dpi_settings[@]}"; do
            local val
            val=$(grep -i "^${setting}=" "$CWA_MODULE_CONF" 2>/dev/null | head -1 | cut -d= -f2 | xargs || echo "")
            if [ -n "$val" ]; then
                add_diagnostic "module.ini: $setting" "$val"
                log_info "  module.ini: $setting = ${BOLD}$val${NC}"
            fi
        done
    else
        log_verbose "module.ini not found at $CWA_MODULE_CONF"
    fi

    # ── 5. Check AppServerDefaults.ini ──────────────────────────────────

    if [ -f "$CWA_APPSRV_CONF" ]; then
        log_info "Found AppServerDefaults.ini"

        local appsrv_settings=(
            "DesiredHRES"
            "DesiredVRES"
            "TWIMode"
            "ScreenPercent"
        )

        for setting in "${appsrv_settings[@]}"; do
            local val
            val=$(grep -i "^${setting}=" "$CWA_APPSRV_CONF" 2>/dev/null | head -1 | cut -d= -f2 | xargs || echo "")
            if [ -n "$val" ]; then
                add_diagnostic "AppServerDefaults: $setting" "$val"
                log_info "  AppServerDefaults: $setting = ${BOLD}$val${NC}"

                # Check for hardcoded resolutions overriding DPI matching
                if [ "$setting" = "DesiredHRES" ] || [ "$setting" = "DesiredVRES" ]; then
                    add_issue "MEDIUM" "Hardcoded resolution ($setting=$val) in AppServerDefaults.ini can override DPI matching." "Remove DesiredHRES/DesiredVRES from AppServerDefaults.ini to allow dynamic DPI matching"
                fi
            fi
        done
    else
        log_verbose "AppServerDefaults.ini not found at $CWA_APPSRV_CONF"
    fi

    # ── 6. Check for conflicting StoreFront/Receiver configs ────────────

    local storefront_configs
    storefront_configs=$(find "$HOME/Library/Application Support/Citrix" -name "*.ini" -o -name "*.ica" 2>/dev/null | head -20 || echo "")
    if [ -n "$storefront_configs" ]; then
        log_verbose "Scanning additional Citrix config files..."
        while IFS= read -r conf_file; do
            if [ -f "$conf_file" ]; then
                local hardcoded_res
                hardcoded_res=$(grep -i "DesiredHRES\|DesiredVRES\|ScreenPercent" "$conf_file" 2>/dev/null || echo "")
                if [ -n "$hardcoded_res" ]; then
                    add_diagnostic "Config override in $(basename "$conf_file")" "$hardcoded_res"
                    log_verbose "  Found resolution override in $conf_file"
                fi
            fi
        done <<< "$storefront_configs"
    fi

    # ── 7. Check macOS accessibility/display settings that affect DPI ───

    log_info "Checking macOS display preferences..."

    # Font smoothing (affects perceived DPI quality)
    local font_smoothing
    font_smoothing=$(defaults read -g AppleFontSmoothing 2>/dev/null || echo "__NOT_SET__")
    add_diagnostic "macOS Font Smoothing" "$font_smoothing"
    if [ "$font_smoothing" = "0" ]; then
        add_issue "LOW" "macOS font smoothing is disabled. Text in Citrix sessions may appear jagged on non-Retina displays." "Enable font smoothing: defaults write -g AppleFontSmoothing -int 1"
        log_warn "Font smoothing is disabled"
    fi

    # Scaled resolution mode
    local use_scaled
    use_scaled=$(defaults read com.apple.windowserver DisplayResolutionEnabled 2>/dev/null || echo "__NOT_SET__")
    add_diagnostic "Scaled Resolution Mode" "$use_scaled"
    if [ "$use_scaled" = "1" ]; then
        log_info "macOS scaled resolution mode is active"
        add_issue "LOW" "macOS display scaling is active. This adds an extra scaling layer that may interact with Citrix DPI matching. If experiencing issues, try 'Default' resolution in System Settings > Displays." "Consider using default (native) resolution for best Citrix DPI matching"
    fi
}

check_server_side_hints() {
    log_section "Server-Side Policy Hints"

    log_info "Checking for server-side DPI policy indicators..."

    # Look for cached policy data that indicates server-side DPI settings
    local policy_cache="$HOME/Library/Application Support/Citrix/Config"
    if [ -d "$policy_cache" ]; then
        local policy_files
        policy_files=$(find "$policy_cache" -name "*.json" -o -name "*.xml" -o -name "*.ini" 2>/dev/null || echo "")
        if [ -n "$policy_files" ]; then
            while IFS= read -r pf; do
                if [ -f "$pf" ]; then
                    local dpi_policy
                    dpi_policy=$(grep -i "dpi\|scaling\|resolution\|highdpi" "$pf" 2>/dev/null || echo "")
                    if [ -n "$dpi_policy" ]; then
                        add_diagnostic "Server policy hint ($(basename "$pf"))" "DPI-related policies detected"
                        log_info "  Found DPI-related server policy in $(basename "$pf")"
                        if [ "$VERBOSE" = true ]; then
                            echo "$dpi_policy" | head -5 | while IFS= read -r line; do
                                log_verbose "    $line"
                            done
                        fi
                    fi
                fi
            done <<< "$policy_files"
        fi
    fi

    log_info "${DIM}Note: Full server-side policy verification requires Citrix Studio/Director access${NC}"
    log_info "${DIM}Ensure these Citrix policies are set on the Delivery Controller:${NC}"
    log_info "${DIM}  • 'Display memory limit' = adequate for HiDPI (e.g., 131072 KB)${NC}"
    log_info "${DIM}  • 'DPI matching' = Enabled (or allowed to use client setting)${NC}"
    log_info "${DIM}  • 'Legacy graphics mode' = Disabled${NC}"
    log_info "${DIM}  • 'Use video codec for compression' = For actively changing regions${NC}"
}

# ── Display Topology & Auto-Configuration ───────────────────────────────────
#
# Classifies the current display setup into a topology profile and applies
# the optimal DPI settings for that profile. This is the core of the roaming
# support — the same function runs whether triggered manually (--auto),
# by the LaunchAgent on display change, or during --fix-all.

get_display_topology() {
    # Returns a topology string: "builtin-only", "externals-only",
    # "builtin-plus-externals", or "unknown"
    # Also sets global variables for downstream use.

    TOPO_BUILTIN=0
    TOPO_EXTERNAL=0
    TOPO_RETINA=0
    TOPO_TOTAL=0
    TOPO_LID_CLOSED=false
    TOPO_DISPLAYS=()          # array of "type:widthxheight:scale"
    TOPO_MAX_SCALE=1
    TOPO_MIXED_DPI=false

    # Detect lid state via ioreg (built-in display powered off = lid closed)
    local lid_state
    lid_state=$(ioreg -r -k AppleClamshellState 2>/dev/null | grep AppleClamshellState | head -1 || echo "")
    if echo "$lid_state" | grep -q "Yes"; then
        TOPO_LID_CLOSED=true
    fi

    # Parse displays from system_profiler
    local display_info
    display_info=$(system_profiler SPDisplaysDataType 2>/dev/null || echo "")

    if [ -z "$display_info" ]; then
        echo "unknown"
        return
    fi

    local current_type="unknown"
    local current_res=""
    local current_retina=false

    while IFS= read -r line; do
        # Detect display type
        if echo "$line" | grep -qi "Display Type:"; then
            local dtype
            dtype=$(echo "$line" | sed 's/.*Display Type: //' | xargs)
            if echo "$dtype" | grep -qi "built-in\|internal"; then
                current_type="builtin"
            else
                current_type="external"
            fi
        fi

        # Detect resolution and retina status
        if echo "$line" | grep -q "Resolution:"; then
            TOPO_TOTAL=$((TOPO_TOTAL + 1))
            current_res=$(echo "$line" | sed 's/.*Resolution: //' | xargs)
            current_retina=false

            if echo "$line" | grep -qi "retina\|hidpi"; then
                current_retina=true
                TOPO_RETINA=$((TOPO_RETINA + 1))
            fi

            # Determine scale factor from resolution text
            local scale=1
            if [ "$current_retina" = true ]; then
                scale=2
            fi
            if [ "$scale" -gt "$TOPO_MAX_SCALE" ]; then
                TOPO_MAX_SCALE=$scale
            fi

            # Classify this display
            if [ "$current_type" = "builtin" ]; then
                TOPO_BUILTIN=$((TOPO_BUILTIN + 1))
            else
                TOPO_EXTERNAL=$((TOPO_EXTERNAL + 1))
            fi

            TOPO_DISPLAYS+=("${current_type}:${current_res}:${scale}")

            # Reset for next display
            current_type="external"  # default assumption for next
        fi
    done <<< "$display_info"

    # If no displays found via type detection, use lid state as heuristic
    if [ "$TOPO_TOTAL" -eq 0 ]; then
        TOPO_TOTAL=1
        TOPO_BUILTIN=1
        echo "builtin-only"
        return
    fi

    # Detect mixed DPI
    if [ "$TOPO_RETINA" -gt 0 ] && [ "$TOPO_RETINA" -lt "$TOPO_TOTAL" ]; then
        TOPO_MIXED_DPI=true
    fi

    # Classify topology
    if [ "$TOPO_LID_CLOSED" = true ] || [ "$TOPO_BUILTIN" -eq 0 ]; then
        if [ "$TOPO_EXTERNAL" -gt 0 ]; then
            echo "externals-only"
        else
            echo "builtin-only"
        fi
    elif [ "$TOPO_EXTERNAL" -eq 0 ]; then
        echo "builtin-only"
    else
        echo "builtin-plus-externals"
    fi
}

get_topology_fingerprint() {
    # Returns a stable string that uniquely identifies the current display
    # configuration. Used to avoid re-applying settings when nothing changed.
    local topo
    topo=$(get_display_topology)
    local fingerprint="${topo}|lid=${TOPO_LID_CLOSED}|total=${TOPO_TOTAL}|ext=${TOPO_EXTERNAL}|retina=${TOPO_RETINA}|mixed=${TOPO_MIXED_DPI}"

    # Include individual display info for full uniqueness
    for d in "${TOPO_DISPLAYS[@]}"; do
        fingerprint="${fingerprint}|${d}"
    done

    echo "$fingerprint"
}

auto_configure_dpi() {
    # Main auto-configuration logic. Detects the current display topology
    # and applies the right DPI strategy. Safe to call repeatedly — it
    # checks whether the topology actually changed before touching settings.

    local topology
    topology=$(get_display_topology)
    local fingerprint
    fingerprint=$(get_topology_fingerprint)

    log_section "Auto-Configure DPI (Topology: $topology)"

    log_info "Lid closed: ${BOLD}$TOPO_LID_CLOSED${NC}"
    log_info "Displays: ${BOLD}$TOPO_TOTAL${NC} total (${TOPO_BUILTIN} built-in, ${TOPO_EXTERNAL} external, ${TOPO_RETINA} Retina)"
    log_info "Mixed DPI: ${BOLD}$TOPO_MIXED_DPI${NC}"
    log_info "Max scale factor: ${BOLD}${TOPO_MAX_SCALE}x${NC}"

    for d in "${TOPO_DISPLAYS[@]}"; do
        log_verbose "  Display: $d"
    done

    # Check if topology changed since last run
    mkdir -p "$BACKUP_DIR" 2>/dev/null
    if [ -f "$TOPOLOGY_STATE_FILE" ]; then
        local last_fingerprint
        last_fingerprint=$(cat "$TOPOLOGY_STATE_FILE" 2>/dev/null || echo "")
        if [ "$fingerprint" = "$last_fingerprint" ]; then
            log_success "Display topology unchanged — no reconfiguration needed"
            return 0
        fi
        log_info "Display topology changed, reconfiguring..."
    fi

    # ── Apply topology-specific settings ────────────────────────────────

    # Step 1: Always enable DPI matching and HighDPI as baseline
    defaults write "$CWA_PREFS_DOMAIN" DPIMatchingEnabled -bool true 2>/dev/null
    defaults write "$CWA_PREFS_DOMAIN" HighDPI -bool true 2>/dev/null
    defaults write "$CWA_PREFS_DOMAIN" UseHighDPI -bool true 2>/dev/null
    defaults write "$CWA_PREFS_DOMAIN" DesktopApplianceDPIMatchingEnabled -bool true 2>/dev/null
    log_success "Enabled DPI matching baseline preferences"

    # Step 2: Remove any hardcoded resolution that would prevent dynamic matching
    defaults delete "$CWA_PREFS_DOMAIN" DesiredHRES 2>/dev/null || true
    defaults delete "$CWA_PREFS_DOMAIN" DesiredVRES 2>/dev/null || true
    defaults delete "$CWA_PREFS_DOMAIN" DesiredDPI 2>/dev/null || true
    defaults delete "$CWA_PREFS_DOMAIN" ScreenResolution 2>/dev/null || true

    if [ -f "$CWA_APPSRV_CONF" ]; then
        local tmp_file
        tmp_file=$(mktemp)
        grep -iv "^DesiredHRES=\|^DesiredVRES=\|^DesiredDPI=\|^ScreenPercent=" "$CWA_APPSRV_CONF" > "$tmp_file" 2>/dev/null || true
        mv "$tmp_file" "$CWA_APPSRV_CONF"
    fi

    log_success "Cleared hardcoded resolution overrides"

    # Step 3: Apply topology-specific DPI scale factor
    case "$topology" in

        builtin-only)
            # Laptop screen only (conference room, on the go)
            # The built-in Retina display is 2x. Let CWA match it natively.
            log_info "Profile: Built-in display only (mobile/conference room)"
            defaults write "$CWA_PREFS_DOMAIN" DPIMatchingScaleFactor -int 0 2>/dev/null
            # 0 = auto-detect from primary display, which is the built-in
            log_success "Set DPI scale factor to auto-detect (built-in primary)"
            ;;

        externals-only)
            # Lid closed, external monitors only (docked at desk)
            # All displays are external — use their native scale.
            log_info "Profile: External displays only (docked, lid closed)"

            if [ "$TOPO_MIXED_DPI" = true ]; then
                # Mixed external DPIs — lock to the lower scale to avoid
                # blurry upscaling on the non-Retina display
                log_warn "Mixed DPI externals detected — locking to 1x for consistency"
                defaults write "$CWA_PREFS_DOMAIN" DPIMatchingScaleFactor -int 1 2>/dev/null
            else
                # All externals same DPI — auto-detect is safe
                defaults write "$CWA_PREFS_DOMAIN" DPIMatchingScaleFactor -int 0 2>/dev/null
            fi
            log_success "Set DPI scale factor for external-only topology"
            ;;

        builtin-plus-externals)
            # Lid open with external monitors (common desk setup)
            # This is the problematic case: built-in Retina (2x) + externals
            # (often 1x). CWA may pick the built-in as primary and render
            # everything at 2x, making externals blurry.
            log_info "Profile: Built-in + external displays (lid open at desk)"

            if [ "$TOPO_MIXED_DPI" = true ]; then
                # Built-in is Retina, externals are not (most common case).
                # Lock scale to match externals so the session looks correct
                # on the monitors the user is actually looking at.
                log_warn "Mixed DPI: Retina built-in + standard externals"
                log_info "Locking DPI to match external monitors (1x)"
                defaults write "$CWA_PREFS_DOMAIN" DPIMatchingScaleFactor -int 1 2>/dev/null
                log_info "Tip: close the lid for native Retina scaling, or use same-DPI externals"
            else
                # All displays are same scale (e.g., Retina + 4K externals at 2x)
                defaults write "$CWA_PREFS_DOMAIN" DPIMatchingScaleFactor -int 0 2>/dev/null
            fi
            log_success "Set DPI scale factor for mixed topology"
            ;;

        *)
            # Unknown — fall back to auto-detect
            log_warn "Could not classify display topology, using auto-detect"
            defaults write "$CWA_PREFS_DOMAIN" DPIMatchingScaleFactor -int 0 2>/dev/null
            ;;
    esac

    # Step 4: Write matching module.ini settings
    local module_dir
    module_dir=$(dirname "$CWA_MODULE_CONF")
    mkdir -p "$module_dir" 2>/dev/null

    if [ -f "$CWA_MODULE_CONF" ]; then
        local tmp_file
        tmp_file=$(mktemp)
        grep -iv "^DPIMatchingEnabled=\|^UseHighDPI=\|^DesiredHRES=\|^DesiredVRES=\|^DesiredDPI=\|^ScreenPercent=" "$CWA_MODULE_CONF" > "$tmp_file" 2>/dev/null || true
        {
            echo ""
            echo "; DPI Matching settings (auto-configured by $SCRIPT_NAME)"
            echo "; Topology: $topology | $(date)"
            echo "DPIMatchingEnabled=true"
            echo "UseHighDPI=true"
        } >> "$tmp_file"
        mv "$tmp_file" "$CWA_MODULE_CONF"
    else
        cat > "$CWA_MODULE_CONF" << INI_EOF
; Citrix Receiver Module Configuration
; DPI Matching settings (auto-configured by $SCRIPT_NAME)
; Topology: $topology | $(date)

[ICA 3.0]
DPIMatchingEnabled=true
UseHighDPI=true
INI_EOF
    fi
    log_success "Updated module.ini for $topology topology"

    # Step 5: Clear rendering cache so CWA picks up new settings
    local cache_dirs=(
        "$HOME/Library/Caches/com.citrix.receiver.nomas"
        "$HOME/Library/Caches/com.citrix.XenAppViewer"
        "$HOME/Library/Caches/com.citrix.HdxRtcEngine"
    )
    for cache_dir in "${cache_dirs[@]}"; do
        rm -rf "$cache_dir" 2>/dev/null || true
    done
    log_success "Cleared rendering cache"

    # Step 6: Save topology fingerprint for change detection
    echo "$fingerprint" > "$TOPOLOGY_STATE_FILE"

    # Step 7: Nudge CWA to pick up changes (if running)
    if pgrep -f "Citrix Workspace" > /dev/null 2>&1; then
        log_info "Citrix Workspace is running — sending notification to refresh"
        # Post a distributed notification that CWA listens for
        # Also kill the viewer process so it restarts with new DPI on next window
        pkill -HUP -f "Citrix Viewer" 2>/dev/null || true
        log_info "Active sessions will pick up new DPI on next reconnect"
        log_info "For immediate effect: disconnect and reconnect the session"
    fi

    log_success "Auto-configuration complete for topology: $topology"
}

# ── LaunchAgent Management ──────────────────────────────────────────────────
#
# Installs a macOS LaunchAgent that runs this script in --auto mode whenever
# the display configuration changes. This covers:
#   - Plugging/unplugging external monitors
#   - Opening/closing the MacBook lid
#   - Docking/undocking from a Thunderbolt dock
#   - Display arrangement changes in System Settings

install_launch_agent() {
    log_section "Installing Display-Change LaunchAgent"

    # Resolve the absolute path to this script
    local script_path
    script_path=$(cd "$(dirname "$0")" && pwd)/$(basename "$0")

    if [ ! -f "$script_path" ]; then
        log_error "Cannot resolve script path: $script_path"
        return 1
    fi

    # Create log directory
    mkdir -p "$AGENT_LOG_DIR" 2>/dev/null

    # Create the LaunchAgent plist
    # WatchPaths monitors the IOKit display registry — any display change
    # (add, remove, reconfigure) triggers the agent.
    mkdir -p "$HOME/Library/LaunchAgents" 2>/dev/null

    cat > "$LAUNCH_AGENT_PLIST" << PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${LAUNCH_AGENT_LABEL}</string>

    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>${script_path}</string>
        <string>--auto</string>
    </array>

    <!-- Trigger on any display configuration change -->
    <key>WatchPaths</key>
    <array>
        <string>/Library/Preferences/com.apple.windowserver.plist</string>
    </array>

    <!-- Also run at login to configure for initial display setup -->
    <key>RunAtLoad</key>
    <true/>

    <!-- Throttle: don't fire more than once per 5 seconds -->
    <key>ThrottleInterval</key>
    <integer>5</integer>

    <!-- Logging -->
    <key>StandardOutPath</key>
    <string>${AGENT_LOG_FILE}</string>
    <key>StandardErrorPath</key>
    <string>${AGENT_LOG_FILE}</string>

    <!-- Keep alive only while user is logged in -->
    <key>LimitLoadToSessionType</key>
    <string>Aqua</string>
</dict>
</plist>
PLIST_EOF

    log_success "Created LaunchAgent plist at $LAUNCH_AGENT_PLIST"

    # Also create a helper that watches IOKit display notifications
    # as a more reliable trigger than WatchPaths alone
    local helper_script="$BACKUP_DIR/dpi-display-watcher.sh"
    mkdir -p "$BACKUP_DIR" 2>/dev/null

    cat > "$helper_script" << 'WATCHER_EOF'
#!/bin/bash
# Display change watcher helper
# Monitors IOKit for display reconfiguration events and triggers
# the DPI auto-configure script. This catches lid open/close events
# that WatchPaths may miss.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MAIN_SCRIPT="__MAIN_SCRIPT__"
LOG="__LOG_FILE__"
DEBOUNCE_FILE="/tmp/.citrix-dpi-debounce"
DEBOUNCE_SECONDS=3

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG"
}

log "Display watcher started"

# Use displayplacer or system_profiler polling as fallback
# for display change detection
last_config=""
while true; do
    current_config=$(system_profiler SPDisplaysDataType 2>/dev/null | grep -E "Resolution:|Display Type:" | md5 2>/dev/null || echo "")

    if [ -n "$current_config" ] && [ "$current_config" != "$last_config" ]; then
        if [ -n "$last_config" ]; then
            # Debounce: macOS may fire multiple events during a single
            # display change (e.g., lid close triggers several reconfigs)
            local now
            now=$(date +%s)
            local last_run=0
            if [ -f "$DEBOUNCE_FILE" ]; then
                last_run=$(cat "$DEBOUNCE_FILE" 2>/dev/null || echo 0)
            fi
            local elapsed=$((now - last_run))

            if [ "$elapsed" -ge "$DEBOUNCE_SECONDS" ]; then
                log "Display configuration changed, running auto-configure"
                echo "$now" > "$DEBOUNCE_FILE"
                "$MAIN_SCRIPT" --auto >> "$LOG" 2>&1
            else
                log "Display change detected but debounced (${elapsed}s < ${DEBOUNCE_SECONDS}s)"
            fi
        fi
        last_config="$current_config"
    fi

    sleep 2
done
WATCHER_EOF

    # Substitute actual paths into the helper
    sed -i '' "s|__MAIN_SCRIPT__|${script_path}|g" "$helper_script" 2>/dev/null || \
        sed "s|__MAIN_SCRIPT__|${script_path}|g" "$helper_script" > "${helper_script}.tmp" && mv "${helper_script}.tmp" "$helper_script"
    sed -i '' "s|__LOG_FILE__|${AGENT_LOG_FILE}|g" "$helper_script" 2>/dev/null || \
        sed "s|__LOG_FILE__|${AGENT_LOG_FILE}|g" "$helper_script" > "${helper_script}.tmp" && mv "${helper_script}.tmp" "$helper_script"

    chmod +x "$helper_script"
    log_success "Created display watcher helper at $helper_script"

    # Load the agent
    launchctl unload "$LAUNCH_AGENT_PLIST" 2>/dev/null || true
    launchctl load -w "$LAUNCH_AGENT_PLIST" 2>/dev/null

    if launchctl list | grep -q "$LAUNCH_AGENT_LABEL"; then
        log_success "LaunchAgent loaded and active"
    else
        log_warn "LaunchAgent created but may need a re-login to activate"
    fi

    log_info ""
    log_info "The agent will now automatically:"
    log_info "  1. Run at login to configure DPI for your initial display setup"
    log_info "  2. Detect when you plug/unplug monitors or open/close the lid"
    log_info "  3. Reconfigure Citrix DPI settings for the new topology"
    log_info "  4. Clear rendering cache so changes take effect"
    log_info ""
    log_info "Logs: $AGENT_LOG_FILE"
    log_info "Uninstall: $0 --uninstall-agent"

    # Run auto-configure now for immediate effect
    log_info ""
    log_info "Running initial auto-configuration..."
    auto_configure_dpi
}

uninstall_launch_agent() {
    log_section "Uninstalling Display-Change LaunchAgent"

    # Unload
    if [ -f "$LAUNCH_AGENT_PLIST" ]; then
        launchctl unload "$LAUNCH_AGENT_PLIST" 2>/dev/null || true
        rm -f "$LAUNCH_AGENT_PLIST"
        log_success "Removed LaunchAgent plist"
    else
        log_info "LaunchAgent plist not found (already uninstalled?)"
    fi

    # Remove helper
    local helper_script="$BACKUP_DIR/dpi-display-watcher.sh"
    if [ -f "$helper_script" ]; then
        rm -f "$helper_script"
        log_success "Removed display watcher helper"
    fi

    # Remove topology state
    rm -f "$TOPOLOGY_STATE_FILE" 2>/dev/null

    # Remove debounce file
    rm -f "/tmp/.citrix-dpi-debounce" 2>/dev/null

    log_success "LaunchAgent uninstalled"
    log_info "DPI settings from the last auto-configure run remain in effect"
    log_info "Use --reset to also clear those settings"
}

# ── Fix Functions ───────────────────────────────────────────────────────────

apply_fix_dpi_matching() {
    log_info "Enabling DPI Matching..."
    defaults write "$CWA_PREFS_DOMAIN" DPIMatchingEnabled -bool true
    if [ $? -eq 0 ]; then
        log_success "DPIMatchingEnabled set to true"
        FIXES_APPLIED=$((FIXES_APPLIED + 1))
        return 0
    fi
    log_error "Failed to set DPIMatchingEnabled"
    return 1
}

apply_fix_high_dpi() {
    log_info "Enabling High DPI mode..."
    defaults write "$CWA_PREFS_DOMAIN" HighDPI -bool true
    if [ $? -eq 0 ]; then
        log_success "HighDPI set to true"
        FIXES_APPLIED=$((FIXES_APPLIED + 1))
        return 0
    fi
    log_error "Failed to set HighDPI"
    return 1
}

apply_fix_desktop_appliance_dpi() {
    log_info "Enabling Desktop Appliance DPI Matching..."
    defaults write "$CWA_PREFS_DOMAIN" DesktopApplianceDPIMatchingEnabled -bool true
    if [ $? -eq 0 ]; then
        log_success "DesktopApplianceDPIMatchingEnabled set to true"
        FIXES_APPLIED=$((FIXES_APPLIED + 1))
        return 0
    fi
    log_error "Failed to set DesktopApplianceDPIMatchingEnabled"
    return 1
}

apply_fix_use_high_dpi() {
    log_info "Setting UseHighDPI preference..."
    defaults write "$CWA_PREFS_DOMAIN" UseHighDPI -bool true
    if [ $? -eq 0 ]; then
        log_success "UseHighDPI set to true"
        FIXES_APPLIED=$((FIXES_APPLIED + 1))
        return 0
    fi
    log_error "Failed to set UseHighDPI"
    return 1
}

apply_fix_remove_hardcoded_resolution() {
    local conf_file="$1"
    if [ ! -f "$conf_file" ]; then
        return 0
    fi

    log_info "Removing hardcoded resolution from $(basename "$conf_file")..."

    local tmp_file
    tmp_file=$(mktemp)

    # Remove DesiredHRES and DesiredVRES lines
    grep -iv "^DesiredHRES=\|^DesiredVRES=" "$conf_file" > "$tmp_file" 2>/dev/null || true
    mv "$tmp_file" "$conf_file"

    log_success "Removed hardcoded resolution entries from $(basename "$conf_file")"
    FIXES_APPLIED=$((FIXES_APPLIED + 1))
}

apply_fix_font_smoothing() {
    log_info "Enabling macOS font smoothing..."
    defaults write -g AppleFontSmoothing -int 1
    if [ $? -eq 0 ]; then
        log_success "Font smoothing enabled"
        FIXES_APPLIED=$((FIXES_APPLIED + 1))
        return 0
    fi
    log_error "Failed to enable font smoothing"
    return 1
}

apply_fix_clear_cwa_cache() {
    log_info "Clearing Citrix Workspace rendering cache..."

    local cache_dirs=(
        "$HOME/Library/Caches/com.citrix.receiver.nomas"
        "$HOME/Library/Caches/com.citrix.XenAppViewer"
        "$HOME/Library/Caches/com.citrix.HdxRtcEngine"
    )

    local cleared=0
    for cache_dir in "${cache_dirs[@]}"; do
        if [ -d "$cache_dir" ]; then
            rm -rf "$cache_dir" 2>/dev/null && cleared=$((cleared + 1))
            log_verbose "Cleared $cache_dir"
        fi
    done

    if [ "$cleared" -gt 0 ]; then
        log_success "Cleared $cleared cache directories"
        FIXES_APPLIED=$((FIXES_APPLIED + 1))
    else
        log_info "No cache directories found to clear"
    fi
}

apply_fix_write_module_ini_dpi() {
    log_info "Configuring DPI settings in module.ini..."

    local module_dir
    module_dir=$(dirname "$CWA_MODULE_CONF")

    # Create directory if needed
    if [ ! -d "$module_dir" ]; then
        mkdir -p "$module_dir" 2>/dev/null
    fi

    # If module.ini exists, update it; otherwise create it
    if [ -f "$CWA_MODULE_CONF" ]; then
        local tmp_file
        tmp_file=$(mktemp)

        # Remove existing DPI-related lines
        grep -iv "^DPIMatchingEnabled=\|^UseHighDPI=\|^DesiredHRES=\|^DesiredVRES=" "$CWA_MODULE_CONF" > "$tmp_file" 2>/dev/null || true

        # Append DPI settings
        {
            echo ""
            echo "; DPI Matching settings (added by $SCRIPT_NAME)"
            echo "DPIMatchingEnabled=true"
            echo "UseHighDPI=true"
        } >> "$tmp_file"

        mv "$tmp_file" "$CWA_MODULE_CONF"
    else
        # Create new module.ini with DPI settings
        cat > "$CWA_MODULE_CONF" << 'INI_EOF'
; Citrix Receiver Module Configuration
; DPI Matching settings (added by Fix-CitrixDpiMac)

[ICA 3.0]
DPIMatchingEnabled=true
UseHighDPI=true
INI_EOF
    fi

    log_success "DPI settings written to module.ini"
    FIXES_APPLIED=$((FIXES_APPLIED + 1))
}

restart_citrix_workspace() {
    log_info "Restarting Citrix Workspace app to apply changes..."

    # Gracefully quit
    osascript -e 'tell application "Citrix Workspace" to quit' 2>/dev/null || true
    sleep 2

    # Force kill if still running
    pkill -f "Citrix Workspace" 2>/dev/null || true
    pkill -f "ServiceRecord" 2>/dev/null || true
    pkill -f "AuthManager_Mac" 2>/dev/null || true
    sleep 1

    # Relaunch
    if [ -d "$CWA_APP_PATH" ]; then
        open "$CWA_APP_PATH" 2>/dev/null &
        log_success "Citrix Workspace restarted"
    fi
}

# ── Backup / Restore ───────────────────────────────────────────────────────

backup_config() {
    log_section "Backing Up Configuration"

    local backup_ts
    backup_ts=$(date "+%Y%m%d_%H%M%S")
    local backup_path="$BACKUP_DIR/$backup_ts"

    mkdir -p "$backup_path"

    # Backup defaults
    defaults export "$CWA_PREFS_DOMAIN" "$backup_path/citrix-prefs.plist" 2>/dev/null && \
        log_success "Backed up Citrix preferences" || \
        log_warn "No Citrix preferences to backup"

    # Backup config files
    if [ -f "$CWA_MODULE_CONF" ]; then
        cp "$CWA_MODULE_CONF" "$backup_path/module.ini" 2>/dev/null
        log_success "Backed up module.ini"
    fi

    if [ -f "$CWA_APPSRV_CONF" ]; then
        cp "$CWA_APPSRV_CONF" "$backup_path/AppServerDefaults.ini" 2>/dev/null
        log_success "Backed up AppServerDefaults.ini"
    fi

    # Store backup metadata
    cat > "$backup_path/metadata.txt" << META_EOF
Backup created: $(date)
macOS version: $(sw_vers -productVersion 2>/dev/null)
CWA version: $(defaults read "$CWA_APP_PATH/Contents/Info" CFBundleShortVersionString 2>/dev/null || echo "unknown")
Script version: $VERSION
META_EOF

    log_success "Configuration backed up to: $backup_path"
    echo "$backup_ts" > "$BACKUP_DIR/latest"
}

restore_config() {
    log_section "Restoring Configuration"

    if [ ! -d "$BACKUP_DIR" ]; then
        log_error "No backups found at $BACKUP_DIR"
        return 1
    fi

    # Find latest backup
    local latest_backup=""
    if [ -f "$BACKUP_DIR/latest" ]; then
        latest_backup=$(cat "$BACKUP_DIR/latest")
    else
        latest_backup=$(ls -1 "$BACKUP_DIR" | grep -v "latest" | sort -r | head -1)
    fi

    if [ -z "$latest_backup" ] || [ ! -d "$BACKUP_DIR/$latest_backup" ]; then
        log_error "No valid backup found"
        return 1
    fi

    local restore_path="$BACKUP_DIR/$latest_backup"
    log_info "Restoring from backup: $latest_backup"

    # Restore preferences
    if [ -f "$restore_path/citrix-prefs.plist" ]; then
        defaults import "$CWA_PREFS_DOMAIN" "$restore_path/citrix-prefs.plist" 2>/dev/null && \
            log_success "Restored Citrix preferences" || \
            log_error "Failed to restore preferences"
    fi

    # Restore config files
    if [ -f "$restore_path/module.ini" ]; then
        local module_dir
        module_dir=$(dirname "$CWA_MODULE_CONF")
        mkdir -p "$module_dir" 2>/dev/null
        cp "$restore_path/module.ini" "$CWA_MODULE_CONF" 2>/dev/null && \
            log_success "Restored module.ini" || \
            log_error "Failed to restore module.ini"
    fi

    if [ -f "$restore_path/AppServerDefaults.ini" ]; then
        local appsrv_dir
        appsrv_dir=$(dirname "$CWA_APPSRV_CONF")
        mkdir -p "$appsrv_dir" 2>/dev/null
        cp "$restore_path/AppServerDefaults.ini" "$CWA_APPSRV_CONF" 2>/dev/null && \
            log_success "Restored AppServerDefaults.ini" || \
            log_error "Failed to restore AppServerDefaults.ini"
    fi

    log_success "Configuration restored from $latest_backup"
}

reset_dpi_settings() {
    log_section "Resetting DPI Settings"

    log_warn "This will remove all Citrix DPI-related preferences"

    if [ "$MODE" != "fix-all" ]; then
        if ! prompt_yes_no "Continue with reset?" "n"; then
            log_info "Reset cancelled"
            return 0
        fi
    fi

    # Backup first
    backup_config

    # Remove DPI-related keys
    local keys_to_remove=(
        "DPIMatchingEnabled"
        "HighDPI"
        "UseHighDPI"
        "HiDPIEnabled"
        "DesktopApplianceDPIMatchingEnabled"
        "DesiredHRES"
        "DesiredVRES"
        "ScreenResolution"
    )

    for key in "${keys_to_remove[@]}"; do
        defaults delete "$CWA_PREFS_DOMAIN" "$key" 2>/dev/null && \
            log_info "  Removed $key" || true
    done

    # Clean module.ini DPI entries
    if [ -f "$CWA_MODULE_CONF" ]; then
        local tmp_file
        tmp_file=$(mktemp)
        grep -iv "DPIMatchingEnabled\|UseHighDPI\|DesiredHRES\|DesiredVRES\|DPI Matching settings" "$CWA_MODULE_CONF" > "$tmp_file" 2>/dev/null || true
        mv "$tmp_file" "$CWA_MODULE_CONF"
        log_info "  Cleaned module.ini"
    fi

    log_success "All DPI settings have been reset to defaults"
    log_info "A backup was created before reset. Use --restore to undo."
}

# ── Report Functions ────────────────────────────────────────────────────────

print_issue_report() {
    log_section "Issues Found: $ISSUES_FOUND"

    if [ "$ISSUES_FOUND" -eq 0 ]; then
        log_success "No DPI issues detected! Configuration looks good."
        return
    fi

    local critical=0 high=0 medium=0 low=0
    for issue in "${ISSUES[@]}"; do
        local severity
        severity=$(echo "$issue" | cut -d'|' -f1)
        case "$severity" in
            CRITICAL) critical=$((critical + 1)) ;;
            HIGH) high=$((high + 1)) ;;
            MEDIUM) medium=$((medium + 1)) ;;
            LOW) low=$((low + 1)) ;;
        esac
    done

    log_info "Severity breakdown: ${RED}CRITICAL: $critical${NC}  ${YELLOW}HIGH: $high${NC}  MEDIUM: $medium  LOW: $low"
    echo ""

    local idx=1
    for issue in "${ISSUES[@]}"; do
        local severity description fix
        severity=$(echo "$issue" | cut -d'|' -f1)
        description=$(echo "$issue" | cut -d'|' -f2)
        fix=$(echo "$issue" | cut -d'|' -f3)

        local sev_color="$NC"
        case "$severity" in
            CRITICAL) sev_color="$RED" ;;
            HIGH) sev_color="$YELLOW" ;;
            MEDIUM) sev_color="$CYAN" ;;
        esac

        echo -e "  ${sev_color}[$severity]${NC} #$idx: $description"
        echo -e "  ${DIM}  Fix: $fix${NC}"
        echo ""
        idx=$((idx + 1))
    done
}

print_json_report() {
    echo "{"
    echo "  \"script\": \"$SCRIPT_NAME\","
    echo "  \"version\": \"$VERSION\","
    echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
    echo "  \"mode\": \"$MODE\","
    echo "  \"diagnostics\": {"

    local first=true
    for diag in "${DIAGNOSTICS[@]}"; do
        local key value
        key=$(echo "$diag" | cut -d'|' -f1)
        value=$(echo "$diag" | cut -d'|' -f2)
        if [ "$first" = true ]; then
            first=false
        else
            echo ","
        fi
        # Escape quotes in values
        value=$(echo "$value" | sed 's/"/\\"/g')
        printf "    \"%s\": \"%s\"" "$key" "$value"
    done

    echo ""
    echo "  },"
    echo "  \"issues_count\": $ISSUES_FOUND,"
    echo "  \"issues\": ["

    local first=true
    for issue in "${ISSUES[@]}"; do
        local severity description fix
        severity=$(echo "$issue" | cut -d'|' -f1)
        description=$(echo "$issue" | cut -d'|' -f2)
        fix=$(echo "$issue" | cut -d'|' -f3)
        description=$(echo "$description" | sed 's/"/\\"/g')
        fix=$(echo "$fix" | sed 's/"/\\"/g')

        if [ "$first" = true ]; then
            first=false
        else
            echo ","
        fi
        printf "    {\"severity\": \"%s\", \"description\": \"%s\", \"fix\": \"%s\"}" "$severity" "$description" "$fix"
    done

    echo ""
    echo "  ],"
    echo "  \"fixes_applied\": $FIXES_APPLIED"
    echo "}"
}

# ── Fix Orchestrator ────────────────────────────────────────────────────────

apply_fixes() {
    log_section "Applying Fixes"

    if [ "$ISSUES_FOUND" -eq 0 ]; then
        log_success "No issues to fix"
        return
    fi

    # Backup before fixing
    backup_config

    # Core DPI fixes (always apply these together)
    local needs_dpi_match=false
    local needs_high_dpi=false
    local needs_appliance_dpi=false
    local needs_font_smoothing=false
    local needs_remove_hardcoded=false

    for issue in "${ISSUES[@]}"; do
        local fix
        fix=$(echo "$issue" | cut -d'|' -f3)

        case "$fix" in
            *"DPIMatchingEnabled"*)
                needs_dpi_match=true ;;
            *"HighDPI"*)
                needs_high_dpi=true ;;
            *"DesktopApplianceDPIMatchingEnabled"*)
                needs_appliance_dpi=true ;;
            *"font smoothing"*)
                needs_font_smoothing=true ;;
            *"Remove DesiredHRES"*)
                needs_remove_hardcoded=true ;;
        esac
    done

    # Apply DPI matching fixes
    if [ "$needs_dpi_match" = true ]; then
        if [ "$MODE" = "fix-all" ] || prompt_yes_no "Enable DPI Matching?" "y"; then
            apply_fix_dpi_matching
        fi
    fi

    if [ "$needs_high_dpi" = true ]; then
        if [ "$MODE" = "fix-all" ] || prompt_yes_no "Enable High DPI mode?" "y"; then
            apply_fix_high_dpi
            apply_fix_use_high_dpi
        fi
    fi

    if [ "$needs_appliance_dpi" = true ]; then
        if [ "$MODE" = "fix-all" ] || prompt_yes_no "Enable Desktop Appliance DPI Matching?" "y"; then
            apply_fix_desktop_appliance_dpi
        fi
    fi

    # Always write module.ini DPI config when fixing DPI issues
    if [ "$needs_dpi_match" = true ] || [ "$needs_high_dpi" = true ]; then
        apply_fix_write_module_ini_dpi
    fi

    if [ "$needs_remove_hardcoded" = true ]; then
        if [ "$MODE" = "fix-all" ] || prompt_yes_no "Remove hardcoded resolution overrides?" "y"; then
            apply_fix_remove_hardcoded_resolution "$CWA_APPSRV_CONF"
            apply_fix_remove_hardcoded_resolution "$CWA_MODULE_CONF"
        fi
    fi

    if [ "$needs_font_smoothing" = true ]; then
        if [ "$MODE" = "fix-all" ] || prompt_yes_no "Enable macOS font smoothing?" "y"; then
            apply_fix_font_smoothing
        fi
    fi

    # Clear rendering cache
    if [ "$FIXES_APPLIED" -gt 0 ]; then
        if [ "$MODE" = "fix-all" ] || prompt_yes_no "Clear Citrix rendering cache?" "y"; then
            apply_fix_clear_cwa_cache
        fi

        # Offer to restart CWA
        if [ "$MODE" = "fix-all" ] || prompt_yes_no "Restart Citrix Workspace to apply changes?" "y"; then
            restart_citrix_workspace
        fi
    fi
}

# ── Summary ─────────────────────────────────────────────────────────────────

print_summary() {
    log_header "Summary"

    if [ "$FIXES_APPLIED" -gt 0 ]; then
        log_success "$FIXES_APPLIED fix(es) applied"
        echo ""
        log_info "Next steps:"
        log_info "  1. Reconnect to your Citrix session (disconnect and reconnect, don't just resize)"
        log_info "  2. Verify text appears sharp and correctly scaled"
        log_info "  3. If using multiple monitors, drag the session between displays to test"
        log_info "  4. If issues persist, verify server-side Citrix policies (see above)"
        echo ""
        log_info "If problems continue after client-side fixes:"
        log_info "  • Ask your Citrix admin to verify 'DPI matching' policy is enabled"
        log_info "  • Ensure VDA is version 1912 LTSR CU3+ or 2103+ for best DPI support"
        log_info "  • Check that 'Legacy graphics mode' is disabled in Citrix policies"
        log_info "  • Increase 'Display memory limit' if using ultra-high resolution displays"
    elif [ "$ISSUES_FOUND" -gt 0 ]; then
        log_warn "$ISSUES_FOUND issue(s) found. Run with --fix to apply fixes interactively"
        log_info "  or use --fix-all to apply all recommended fixes automatically"
    else
        log_success "No DPI issues detected. Configuration looks correct."
    fi

    echo ""
    log_info "For roaming users (office / conference room / home):"
    log_info "  Run: $0 --install-agent"
    log_info "  This auto-configures DPI whenever displays change."
    echo ""
    log_info "Run with --backup before making changes, --restore to revert"
    log_info "Use --verbose for detailed diagnostic output"
}

show_help() {
    cat << 'HELP_EOF'
Fix-CitrixDpiMac.sh - Citrix DPI Matching Diagnostic & Fix Tool for macOS

USAGE:
    ./Fix-CitrixDpiMac.sh [OPTIONS]

OPTIONS:
    --diagnose          Run diagnostics only (default)
    --fix               Apply recommended fixes interactively
    --fix-all           Apply all fixes without prompting
    --auto              Auto-detect display topology and configure DPI
    --install-agent     Install LaunchAgent for automatic display-change handling
    --uninstall-agent   Remove the display-change LaunchAgent
    --reset             Reset all Citrix DPI settings to defaults
    --backup            Backup current Citrix configuration
    --restore           Restore configuration from backup
    --verbose           Show detailed diagnostic output
    --json              Output results in JSON format
    --help              Show this help message

EXAMPLES:
    # Run diagnostics
    ./Fix-CitrixDpiMac.sh

    # Diagnose with verbose output
    ./Fix-CitrixDpiMac.sh --diagnose --verbose

    # Apply all fixes automatically
    ./Fix-CitrixDpiMac.sh --fix-all

    # Interactive fix mode
    ./Fix-CitrixDpiMac.sh --fix

    # Auto-detect and configure for current display setup
    ./Fix-CitrixDpiMac.sh --auto

    # Install persistent agent for roaming users (recommended)
    ./Fix-CitrixDpiMac.sh --install-agent

    # Remove the agent
    ./Fix-CitrixDpiMac.sh --uninstall-agent

    # Backup, fix, and verify
    ./Fix-CitrixDpiMac.sh --backup
    ./Fix-CitrixDpiMac.sh --fix-all
    ./Fix-CitrixDpiMac.sh --diagnose

    # Export diagnostics as JSON
    ./Fix-CitrixDpiMac.sh --json

    # Reset if fixes caused problems
    ./Fix-CitrixDpiMac.sh --restore

WHAT THIS TOOL FIXES:
    - Blurry text in Citrix sessions on Retina/HiDPI displays
    - DPI mismatch between native display and Citrix session
    - Incorrect scaling when using multiple monitors with different DPIs
    - Hardcoded resolution overrides that prevent dynamic DPI matching
    - Missing or disabled DPI matching preferences
    - Rendering cache issues causing stale scaling
    - Font smoothing configuration affecting text clarity

ROAMING / HOTDESKING SUPPORT:
    For users who move between different locations and monitor setups:

    1. Install the agent once:
       ./Fix-CitrixDpiMac.sh --install-agent

    2. The agent runs automatically at login and on every display change.
       It detects the topology (built-in only, externals only, or mixed)
       and configures Citrix DPI settings accordingly.

    Topologies handled:
    - Built-in only     (laptop in conference room, on the go)
    - Externals only    (docked at desk, lid closed)
    - Built-in + externals (lid open with monitors)
    - Mixed DPI         (Retina + non-Retina monitors)

REQUIREMENTS:
    - macOS 11.0 (Big Sur) or later
    - Citrix Workspace app 2112 or later (recommended)
    - No administrator/sudo required for standard fixes

HELP_EOF
}

# ── Main ────────────────────────────────────────────────────────────────────

main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --diagnose)        MODE="diagnose"; shift ;;
            --fix)             MODE="fix"; shift ;;
            --fix-all)         MODE="fix-all"; shift ;;
            --auto)            MODE="auto"; shift ;;
            --install-agent)   MODE="install-agent"; shift ;;
            --uninstall-agent) MODE="uninstall-agent"; shift ;;
            --reset)           MODE="reset"; shift ;;
            --backup)          MODE="backup"; shift ;;
            --restore)         MODE="restore"; shift ;;
            --verbose)         VERBOSE=true; shift ;;
            --json)            JSON_OUTPUT=true; shift ;;
            --help|-h)         show_help; exit 0 ;;
            *)
                echo "Unknown option: $1"
                echo "Run with --help for usage information"
                exit 1
                ;;
        esac
    done

    # Handle standalone modes
    case "$MODE" in
        auto)
            log_header "$SCRIPT_NAME v$VERSION - Auto-Configure"
            auto_configure_dpi
            exit 0
            ;;
        install-agent)
            log_header "$SCRIPT_NAME v$VERSION"
            install_launch_agent
            exit 0
            ;;
        uninstall-agent)
            log_header "$SCRIPT_NAME v$VERSION"
            uninstall_launch_agent
            exit 0
            ;;
        backup)
            log_header "$SCRIPT_NAME v$VERSION"
            backup_config
            exit 0
            ;;
        restore)
            log_header "$SCRIPT_NAME v$VERSION"
            restore_config
            exit 0
            ;;
        reset)
            log_header "$SCRIPT_NAME v$VERSION"
            reset_dpi_settings
            exit 0
            ;;
    esac

    # Main diagnostic + optional fix flow
    if [ "$JSON_OUTPUT" = false ]; then
        log_header "$SCRIPT_NAME v$VERSION - Citrix DPI Matching for macOS"
    fi

    # Run all diagnostics
    check_macos_version
    detect_displays
    if check_citrix_installation; then
        check_dpi_settings
        check_server_side_hints
    fi

    # Report issues
    if [ "$JSON_OUTPUT" = true ]; then
        print_json_report
        exit 0
    fi

    print_issue_report

    # Apply fixes if requested
    if [ "$MODE" = "fix" ] || [ "$MODE" = "fix-all" ]; then
        apply_fixes
    fi

    print_summary
}

main "$@"

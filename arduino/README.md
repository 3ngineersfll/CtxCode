# Arduino/ESP32 Water Flow Sensor Setup Guide

Complete guide for setting up IoT water flow sensors with the Water Conservation Game.

## Hardware Requirements

### Required Components

1. **ESP32 Development Board**
   - Any ESP32 dev board (ESP32-WROOM, NodeMCU-32S, etc.)
   - WiFi and Bluetooth support
   - Minimum 4MB flash memory
   - Price: ~$5-10

2. **YF-S201 Water Flow Sensor**
   - Hall effect flow sensor
   - Flow range: 1-30 L/min
   - Operating voltage: 5-18V DC
   - Output: Square wave pulse
   - Price: ~$5-8

3. **Power Supply**
   - 5V USB power supply for ESP32
   - Or battery pack (see battery-powered setup below)

### Optional Components

4. **Battery Monitoring** (for remote sensors)
   - Voltage divider resistors (10kΩ + 10kΩ)
   - Li-Ion battery (3.7V, 2000mAh+)
   - TP4056 charging module
   - Price: ~$3-5

5. **Enclosure**
   - Waterproof IP65/IP67 enclosure
   - Cable glands for sensor wires
   - Price: ~$5-10

## Hardware Connections

### Basic Setup (Mains Powered)

```
YF-S201 Flow Sensor Connections:
┌─────────────────────────────────┐
│ YF-S201 Water Flow Sensor       │
├─────────────┬───────────────────┤
│ RED Wire    │ → 5V (VIN on ESP32)│
│ BLACK Wire  │ → GND             │
│ YELLOW Wire │ → GPIO 4          │
└─────────────┴───────────────────┘

ESP32 Connections:
┌──────────────┬────────────────────┐
│ ESP32 Pin    │ Connection         │
├──────────────┼────────────────────┤
│ GPIO 4       │ Flow Sensor Signal │
│ GPIO 34 (ADC)│ Battery Monitor    │
│ 5V (VIN)     │ Flow Sensor VCC    │
│ GND          │ Flow Sensor GND    │
│ USB          │ Power Supply       │
└──────────────┴────────────────────┘
```

### Wiring Diagram (ASCII Art)

```
                   ESP32 Dev Board
                ┌──────────────────┐
                │                  │
   5V ─────────→│ VIN          GND │←───────── GND
                │                  │
Flow Sensor ───→│ GPIO 4       3V3 │
Signal          │                  │
                │             GPIO34│←──── Battery Monitor
                │                  │      (via voltage divider)
                │                  │
                │    USB Power     │
                └──────────────────┘
                         ↑
                    USB Cable to
                    5V Power Supply


    YF-S201 Flow Sensor          Battery Monitoring Circuit
   ┌─────────────────┐           ┌──────────────────────┐
   │                 │           │  Battery (+)         │
   │  Water Flow     │           │      │              │
   │  Sensor         │           │     10kΩ            │
   │                 │           │      │──────→ GPIO34│
   │  RED    → 5V    │           │     10kΩ            │
   │  BLACK  → GND   │           │      │              │
   │  YELLOW → GPIO4 │           │    GND              │
   └─────────────────┘           └──────────────────────┘
```

### Battery-Powered Setup

For remote sensors (e.g., outdoor garden irrigation):

```
Battery Circuit:
┌────────────────────────────────────────┐
│ Li-Ion Battery (3.7V)                  │
│         ↓                              │
│   TP4056 Charger                       │
│    (with protection)                   │
│         ↓                              │
│   Voltage Divider                      │
│   (10kΩ + 10kΩ)  → GPIO34 (ADC)       │
│         ↓                              │
│   ESP32 VIN Pin                        │
└────────────────────────────────────────┘
```

## Installation Location

### Indoor Locations
- **Kitchen Sink**: Monitor dishwashing water usage
- **Bathroom Sink**: Track hand-washing water
- **Shower**: Measure shower water consumption
- **Washing Machine**: Monitor laundry water

### Outdoor Locations
- **Garden Hose**: Track irrigation water
- **Pool Fill Line**: Monitor pool water usage
- **Outdoor Faucet**: General outdoor water tracking

### Installation Tips
1. Install sensor in-line with water flow (use correct directional arrow on sensor)
2. Ensure sensor is mounted securely to avoid vibration
3. Keep electronics away from direct water contact
4. Use cable glands for waterproof enclosures
5. Leave slack in wires for vibration absorption

## Software Setup

### Step 1: Install Arduino IDE

1. Download Arduino IDE from https://www.arduino.cc/en/software
2. Install version 2.0 or later

### Step 2: Install ESP32 Board Support

1. Open Arduino IDE
2. Go to **File** → **Preferences**
3. Add to **Additional Board Manager URLs**:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Go to **Tools** → **Board** → **Boards Manager**
5. Search for "esp32"
6. Install **esp32 by Espressif Systems**

### Step 3: Install Required Libraries

Go to **Tools** → **Manage Libraries**, search and install:

1. **PubSubClient** by Nick O'Leary (v2.8.0+)
2. **ArduinoJson** by Benoit Blanchon (v6.21.0+)

### Step 4: Select Board and Port

1. Connect ESP32 to computer via USB
2. **Tools** → **Board** → **ESP32 Arduino** → **ESP32 Dev Module**
3. **Tools** → **Port** → Select your ESP32 port (COM3, /dev/ttyUSB0, etc.)

### Step 5: Device Configuration

#### Option A: Quick Configuration (Automatic)

1. Open `ConfigureDevice/ConfigureDevice.ino`
2. Upload to ESP32
3. Open Serial Monitor (115200 baud)
4. Follow the prompts to:
   - Enter WiFi credentials
   - Enter server URL
   - Login to web app and get JWT token
   - Register device
5. Copy the generated DEVICE_ID and API_KEY

#### Option B: Manual Configuration

1. Open `WaterFlowSensor/WaterFlowSensor.ino`
2. Update these settings:

```cpp
// WiFi Settings
const char* WIFI_SSID = "Your_WiFi_Name";
const char* WIFI_PASSWORD = "Your_WiFi_Password";

// Server Settings (your computer's IP address)
const char* API_SERVER = "http://192.168.1.100:3000";
const char* MQTT_SERVER = "192.168.1.100";

// Get these from device registration
String DEVICE_ID = "your-device-id-here";
String API_KEY = "your-api-key-here";
```

3. To get DEVICE_ID and API_KEY:
   - Login to web app
   - Go to Devices page
   - Click "Register New Device"
   - Enter device details
   - Copy the API key shown (only shown once!)

### Step 6: Upload and Test

1. Click **Upload** button
2. Wait for "Done uploading" message
3. Open Serial Monitor (115200 baud)
4. Watch for connection messages

Expected output:
```
==============================
Water Flow Sensor Starting...
==============================
✅ SPIFFS initialized
📊 Total volume from memory: 0.00 L
📡 Connecting to WiFi: YourNetwork
.....
✅ WiFi connected! IP: 192.168.1.150
📶 Signal strength: -45 dBm
📡 Connecting to MQTT broker: 192.168.1.100:1883
✅ MQTT connected!
✅ Setup complete!
```

## Calibration

### Flow Sensor Calibration

The YF-S201 sensor has a calibration factor (pulses per liter):

```cpp
const float CALIBRATION_FACTOR = 7.5;  // Default for YF-S201
```

To calibrate:

1. Measure actual water volume (use a measuring jug)
2. Run water through sensor
3. Note the pulse count from Serial Monitor
4. Calculate: `CALIBRATION_FACTOR = pulseCount / actualVolume`
5. Update the value in code

### Battery Monitoring Calibration

For battery-powered sensors:

```cpp
// Adjust voltage divider calculation based on your resistors
float voltage = (rawValue / 4095.0) * 3.3 * 2.0;  // *2 for 10kΩ+10kΩ divider
```

## Advanced Features

### Deep Sleep Mode (Battery Saving)

For battery-powered sensors, enable deep sleep:

```cpp
const bool ENABLE_DEEP_SLEEP = true;              // Enable deep sleep
const unsigned long SLEEP_DURATION = 3600;        // Sleep 1 hour
```

This will:
- Put ESP32 in deep sleep when no water flow detected
- Wake up periodically to check for flow
- Extend battery life from hours to weeks/months

### Offline Buffering

The sensor automatically buffers data when offline:

- Stores up to 100 readings in flash memory
- Syncs automatically when connection restored
- Survives power cycles

### Adjusting Report Intervals

```cpp
const unsigned long REPORT_INTERVAL = 30000;      // Report every 30 sec
const unsigned long STATUS_INTERVAL = 300000;     // Status every 5 min
const unsigned long HEARTBEAT_INTERVAL = 60000;   // Heartbeat every 1 min
```

## Troubleshooting

### WiFi Won't Connect

**Symptoms**: `❌ WiFi connection failed`

**Solutions**:
1. Double-check SSID and password (case-sensitive!)
2. Ensure WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
3. Move ESP32 closer to router
4. Check WiFi router allows new devices

### MQTT Connection Failed

**Symptoms**: `❌ MQTT connection failed, rc=-2`

**Solutions**:
1. Verify MQTT_SERVER IP address
2. Ensure MQTT broker is running (`npm run dev` starts it)
3. Check firewall allows port 1883
4. Verify device has internet access

### No Flow Detected

**Symptoms**: Flow sensor doesn't register water

**Solutions**:
1. Check flow sensor wiring (especially signal wire)
2. Ensure water flows in correct direction (arrow on sensor)
3. Verify flow rate > 1 L/min (sensor minimum)
4. Test sensor separately with multimeter
5. Check interrupt pin (GPIO 4) is correct

### Device Registration Fails

**Symptoms**: `❌ Registration failed! HTTP Code: 401`

**Solutions**:
1. Verify JWT token is current (tokens expire)
2. Check server URL is correct
3. Ensure server is running
4. Re-login to get fresh token

### Battery Not Detected

**Symptoms**: Battery level shows 0% or incorrect

**Solutions**:
1. Check voltage divider wiring
2. Verify resistor values (10kΩ each)
3. Measure actual battery voltage with multimeter
4. Adjust voltage calculation formula

### Data Not Syncing

**Symptoms**: Water usage not appearing in dashboard

**Solutions**:
1. Check Serial Monitor for errors
2. Verify DEVICE_ID and API_KEY match registration
3. Ensure server is running and accessible
4. Check API endpoint URLs
5. Verify user_id matches in database

## MQTT Topics

The sensor uses these MQTT topics:

```
water/device/{DEVICE_ID}/usage      - Water usage reports
water/device/{DEVICE_ID}/status     - Device status updates
water/device/{DEVICE_ID}/reading    - Raw sensor readings
water/device/{DEVICE_ID}/heartbeat  - Heartbeat/keepalive
water/device/{DEVICE_ID}/config     - Configuration (subscribe)
```

## API Endpoints

Alternative to MQTT (HTTP fallback):

```http
POST /api/devices/api/report
Headers:
  Content-Type: application/json
  X-API-Key: YOUR_API_KEY

Body:
{
  "device_id": "device-id",
  "volume": 50.5,
  "activity_type": "shower",
  "battery_level": 85,
  "signal_strength": -45
}
```

## Security Notes

- **API Keys**: Store securely, never share publicly
- **WiFi Credentials**: Hardcoded in sketch (consider alternatives for production)
- **MQTT**: No authentication by default (add TLS for production)
- **Firmware Updates**: Support OTA (Over-The-Air) updates

## Performance Specs

### Accuracy
- Flow measurement: ±5% (after calibration)
- Battery level: ±10%
- Time sync: ±2 seconds

### Network Usage
- MQTT message: ~200 bytes
- Report interval: 30 seconds
- Bandwidth: ~50 KB/hour

### Power Consumption
- Active (WiFi on): ~160mA
- Deep sleep: ~10µA
- Battery life (2000mAh):
  - Always on: ~12 hours
  - With deep sleep: ~60 days (1 wake per hour)

## Bill of Materials (BOM)

| Component | Quantity | Price | Link |
|-----------|----------|-------|------|
| ESP32 Dev Board | 1 | $7 | Search "ESP32 WROOM" |
| YF-S201 Flow Sensor | 1 | $6 | Search "YF-S201" |
| USB Cable | 1 | $2 | Micro USB or USB-C |
| 5V Power Supply | 1 | $3 | USB charger |
| Jumper Wires | 5 | $2 | Male-to-female |
| **Total (Basic)** | | **$20** | |
| | | | |
| **Optional** | | | |
| Li-Ion Battery 3.7V | 1 | $5 | 18650 or similar |
| TP4056 Charger | 1 | $1 | Charging module |
| Resistors (10kΩ) | 2 | $0.10 | Voltage divider |
| Waterproof Enclosure | 1 | $8 | IP65 rated |
| **Total (Battery)** | | **$34** | |

## Next Steps

1. **Test Basic Flow**: Run water through sensor, verify readings
2. **Calibrate**: Measure known volume, adjust calibration factor
3. **Monitor Dashboard**: Check web app for data
4. **Add More Sensors**: Repeat process for other locations
5. **Optimize Settings**: Adjust report intervals for your needs

## Support

For issues:
- Check Serial Monitor output
- Review troubleshooting section
- Open GitHub issue with logs
- Join community forum

---

Happy water conservation! 💧🌍

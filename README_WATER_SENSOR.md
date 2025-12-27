# Smart Water Flow Faucet Sensor

A comprehensive IoT water conservation system combining Arduino-based flow sensing with an Android mobile application for real-time monitoring and historical usage tracking.

## 🌊 Features

### Arduino Sensor Module
- Real-time water flow rate measurement (L/min)
- Cumulative volume tracking (Liters)
- Bluetooth connectivity (HC-05 module)
- Low-power operation
- Easy calibration

### Android App Features
- **Real-time Monitoring**: Live water flow rate display
- **Usage Tracking**: Cumulative water consumption counter
- **Historical Data**: SQLite database stores all usage data
- **Visual Charts**: Bar chart visualization of daily usage (last 7 days)
- **Statistics Dashboard**: Today, 7-day, and 30-day usage summaries
- **Conservation Tips**: Educational water-saving recommendations
- **Bluetooth Control**: Easy pairing and connection with Arduino sensor
- **Data Management**: Reset counter and view detailed history

## 📦 Required Components

### Hardware Components
1. **Arduino Board**: Arduino Uno or Nano (Qty: 1)
2. **Water Flow Sensor**: YF-S201 or similar Hall-effect flow sensor (Qty: 1)
   - Flow Range: 1-30 L/min
   - Voltage: 5V DC
   - Output: Square wave pulse
3. **Bluetooth Module**: HC-05 or HC-06 (Qty: 1)
4. **Resistors**: 1kΩ and 2kΩ for voltage divider (Qty: 2)
5. **Breadboard** (optional for prototyping)
6. **Jumper Wires**
7. **Power Supply**: 5V USB or battery pack
8. **PVC Pipe Fittings**: To mount the flow sensor (1/2" or 3/4")

### Software Requirements
1. **Arduino IDE** (1.8.x or later)
2. **Android Studio** (for app development)
3. **Android Device** with:
   - Android 6.0 (API 23) or higher
   - Bluetooth capability

## 🔌 Circuit Connections

### Flow Sensor Connections
```
YF-S201 Flow Sensor:
├── RED Wire    → Arduino 5V
├── BLACK Wire  → Arduino GND
└── YELLOW Wire → Arduino Pin 2 (Interrupt)
```

### HC-05 Bluetooth Module Connections
```
HC-05 Module:
├── VCC → Arduino 5V
├── GND → Arduino GND
├── TXD → Arduino Pin 10 (RX)
└── RXD → Voltage Divider → Arduino Pin 11 (TX)

Voltage Divider for RXD:
Arduino Pin 11 → 1kΩ Resistor → HC-05 RXD
                                      ↓
                                   2kΩ Resistor
                                      ↓
                                    GND

This reduces 5V from Arduino to 3.3V for HC-05
```

### Complete Wiring Diagram
```
┌─────────────────┐
│   Arduino Uno   │
│                 │
│  Pin 2 ←────────┼───── YELLOW (Flow Sensor Signal)
│  Pin 10 ←───────┼───── TX (HC-05)
│  Pin 11 ────────┼────→ RX (HC-05) via voltage divider
│                 │
│  5V ────────────┼───── RED (Flow Sensor VCC)
│  5V ────────────┼───── VCC (HC-05)
│  GND ───────────┼───── BLACK (Flow Sensor GND)
│  GND ───────────┼───── GND (HC-05)
└─────────────────┘
```

## 🚀 Installation & Setup

### Arduino Setup

1. **Install Arduino IDE**
   ```bash
   Download from: https://www.arduino.cc/en/software
   ```

2. **Upload the Code**
   - Open `arduino_water_sensor/water_flow_sensor.ino` in Arduino IDE
   - Select your board: Tools → Board → Arduino Uno (or your model)
   - Select the port: Tools → Port → COM# (Windows) or /dev/ttyUSB# (Linux)
   - Click Upload button

3. **Configure HC-05 (First-time setup)**
   - Default settings should work (9600 baud rate)
   - Pair with your phone: Default PIN is usually "1234" or "0000"

4. **Calibrate Flow Sensor** (Optional)
   - The default calibration factor is 4.5 for YF-S201
   - Adjust `CALIBRATION_FACTOR` in the code if needed
   - Test with known water volumes to fine-tune

### Android App Setup

#### Option 1: Build from Source

1. **Install Android Studio**
   ```bash
   Download from: https://developer.android.com/studio
   ```

2. **Open Project**
   - Open Android Studio
   - File → Open → Select `android_app` folder
   - Wait for Gradle sync to complete

3. **Build and Install**
   - Connect your Android device via USB
   - Enable Developer Options and USB Debugging on your phone
   - Click Run button (green triangle) in Android Studio
   - Select your device when prompted

#### Option 2: Install APK (After Building)

1. Build APK in Android Studio:
   - Build → Build Bundle(s) / APK(s) → Build APK(s)

2. Transfer APK to phone and install
   - Enable "Install from Unknown Sources" in phone settings
   - Open the APK file on your phone

## 📱 Using the App

### Initial Setup

1. **Enable Bluetooth** on your Android device

2. **Pair HC-05 Module**
   - Go to phone Settings → Bluetooth
   - Search for "HC-05" device
   - Pair using PIN: "1234" or "0000"

3. **Open Water Monitor App**

4. **Connect to Sensor**
   - Tap "Connect Bluetooth" button
   - Select your paired HC-05 device from the list
   - Wait for "Connected" status

### Main Screen Features

- **Status Indicator**: Shows connection status
- **Current Flow**: Real-time flow rate in L/min (updates every second)
- **Total Usage**: Cumulative water volume in Liters
- **View History**: Opens historical data and charts
- **Reset Counter**: Resets the cumulative volume counter
- **Conservation Tip**: Random water-saving tips

### History Screen

- **Statistics**: Today, 7-day, and 30-day usage totals
- **Bar Chart**: Visual representation of daily usage for the last 7 days
- Automatically updates when you open the screen

## 🔧 Troubleshooting

### Arduino Issues

**Problem**: Flow sensor not reading
- Check connections, especially the yellow signal wire
- Verify 5V power supply is stable
- Test with water flowing through the sensor

**Problem**: Bluetooth not connecting
- Check HC-05 power LED is blinking
- Verify voltage divider for RX pin
- Try re-pairing the device

**Problem**: Incorrect flow readings
- Adjust `CALIBRATION_FACTOR` in the code
- Ensure sensor is installed in correct direction
- Check for air bubbles in the pipe

### Android App Issues

**Problem**: Can't find Bluetooth device
- Ensure HC-05 is powered and paired in phone settings
- Grant Bluetooth permissions to the app
- Try restarting Bluetooth

**Problem**: Connection drops frequently
- Check power supply to Arduino
- Reduce distance between phone and sensor
- Avoid obstacles between devices

**Problem**: App crashes on startup
- Grant all required permissions (Bluetooth, Location)
- Check Android version compatibility (API 23+)

## 📊 Data Format

The Arduino sends data to the app in this format:
```
FLOW:<flowRate>|VOLUME:<totalVolume>|TIME:<millis>

Example:
FLOW:5.23|VOLUME:125.456|TIME:123456
```

### Supported Commands (App → Arduino)
- `RESET`: Reset total volume counter
- `STATUS`: Request current status
- `CALIBRATE:<value>`: Set calibration factor

## 🌱 Water Conservation Impact

### Average Household Water Usage
- Shower: 15-25 L/min
- Bathroom faucet: 6-8 L/min
- Kitchen faucet: 8-10 L/min
- Dishwasher: 20-40 L per cycle
- Washing machine: 50-80 L per load

### How This System Helps
1. **Awareness**: See exactly how much water you use in real-time
2. **Behavior Change**: Visualize daily usage to identify waste
3. **Goal Setting**: Track progress toward conservation goals
4. **Leak Detection**: Identify unexpected flow when taps are off
5. **Education**: Learn from conservation tips

## 🔮 Future Enhancements

Potential improvements for the project:
- [ ] WiFi connectivity (ESP8266/ESP32)
- [ ] Cloud data storage and web dashboard
- [ ] Multiple sensor support
- [ ] Water quality monitoring (TDS sensor)
- [ ] Push notifications for high usage alerts
- [ ] Monthly reports and goals
- [ ] Cost calculation based on water rates
- [ ] Integration with smart home systems

## 📄 License

This project is open source and available for educational and personal use.

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## 💡 Tips for Best Results

1. **Sensor Placement**: Install flow sensor on cold water line for accuracy
2. **Mounting**: Ensure sensor is horizontal and fully submerged in water
3. **Power**: Use stable 5V power supply for consistent readings
4. **Range**: Keep phone within 10 meters of Bluetooth module
5. **Calibration**: Test with measured volumes to verify accuracy
6. **Maintenance**: Clean sensor periodically to prevent debris buildup

## 📞 Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review the circuit connections
3. Test each component individually
4. Verify code upload was successful

## 🎯 Project Goals

This project aims to:
- Promote water conservation awareness
- Provide affordable water monitoring solution
- Enable data-driven usage decisions
- Educate users about sustainable practices
- Reduce household water waste

---

**Happy Water Saving! 💧🌍**

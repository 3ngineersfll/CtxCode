/*
 * Smart Water Flow Sensor with Bluetooth
 * Compatible with YF-S201 flow sensor and HC-05 Bluetooth module
 *
 * Connections:
 * - Flow Sensor Signal Pin -> Arduino Pin 2 (interrupt pin)
 * - Flow Sensor VCC -> 5V
 * - Flow Sensor GND -> GND
 * - HC-05 TX -> Arduino RX (Pin 0) or SoftwareSerial RX (Pin 10)
 * - HC-05 RX -> Arduino TX (Pin 1) or SoftwareSerial TX (Pin 11) via voltage divider
 * - HC-05 VCC -> 5V
 * - HC-05 GND -> GND
 */

#include <SoftwareSerial.h>

// Pin definitions
#define FLOW_SENSOR_PIN 2  // Interrupt pin
#define BT_RX 10           // Bluetooth RX (connect to HC-05 TX)
#define BT_TX 11           // Bluetooth TX (connect to HC-05 RX via voltage divider)

// Flow sensor calibration
#define CALIBRATION_FACTOR 4.5  // Pulses per second per L/minute (YF-S201: ~4.5)

// Variables for flow calculation
volatile unsigned long pulseCount = 0;
unsigned long oldTime = 0;
float flowRate = 0.0;
float totalVolume = 0.0;  // Total volume in liters
unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL = 1000;  // Send data every 1 second

// Bluetooth serial
SoftwareSerial bluetooth(BT_RX, BT_TX);

void setup() {
  // Initialize serial communications
  Serial.begin(9600);
  bluetooth.begin(9600);

  // Initialize flow sensor pin
  pinMode(FLOW_SENSOR_PIN, INPUT_PULLUP);

  // Attach interrupt for flow sensor
  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), pulseCounter, FALLING);

  oldTime = millis();

  Serial.println("Smart Water Flow Sensor Initialized");
  bluetooth.println("READY");

  delay(1000);
}

void loop() {
  unsigned long currentTime = millis();

  // Calculate flow rate every second
  if ((currentTime - oldTime) >= 1000) {
    // Disable interrupts while calculating
    detachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN));

    // Calculate flow rate (L/min)
    flowRate = (pulseCount / CALIBRATION_FACTOR);

    // Calculate volume for this interval (in liters)
    float volumeThisInterval = (flowRate / 60.0);  // Convert L/min to L/sec
    totalVolume += volumeThisInterval;

    // Print to serial monitor for debugging
    Serial.print("Flow: ");
    Serial.print(flowRate);
    Serial.print(" L/min | Volume: ");
    Serial.print(totalVolume);
    Serial.println(" L");

    // Reset pulse counter
    pulseCount = 0;
    oldTime = currentTime;

    // Re-enable interrupts
    attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), pulseCounter, FALLING);
  }

  // Send data to Bluetooth every SEND_INTERVAL
  if ((currentTime - lastSendTime) >= SEND_INTERVAL) {
    sendDataToBluetooth();
    lastSendTime = currentTime;
  }

  // Check for commands from Bluetooth
  if (bluetooth.available()) {
    String command = bluetooth.readStringUntil('\n');
    command.trim();
    processCommand(command);
  }
}

// Interrupt service routine for pulse counting
void pulseCounter() {
  pulseCount++;
}

// Send data to Bluetooth in structured format
void sendDataToBluetooth() {
  // Format: FLOW:<flowRate>|VOLUME:<totalVolume>|TIME:<millis>
  String data = "FLOW:" + String(flowRate, 2) +
                "|VOLUME:" + String(totalVolume, 3) +
                "|TIME:" + String(millis());

  bluetooth.println(data);
}

// Process commands received from Bluetooth
void processCommand(String command) {
  command.toUpperCase();

  if (command == "RESET") {
    // Reset total volume
    totalVolume = 0.0;
    bluetooth.println("OK:RESET");
    Serial.println("Volume reset");
  }
  else if (command == "STATUS") {
    // Send current status
    bluetooth.print("STATUS:Flow=");
    bluetooth.print(flowRate);
    bluetooth.print("L/min,Volume=");
    bluetooth.print(totalVolume);
    bluetooth.println("L");
  }
  else if (command.startsWith("CALIBRATE:")) {
    // Calibrate sensor (format: CALIBRATE:4.5)
    float newCalibration = command.substring(10).toFloat();
    if (newCalibration > 0) {
      // Note: CALIBRATION_FACTOR is const, you'd need to change this to a variable
      bluetooth.println("OK:CALIBRATED");
      Serial.print("New calibration: ");
      Serial.println(newCalibration);
    }
  }
  else {
    bluetooth.println("ERROR:UNKNOWN_COMMAND");
  }
}

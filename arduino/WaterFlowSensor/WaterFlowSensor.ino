/*
 * Water Conservation Game - ESP32 Flow Sensor
 *
 * Features:
 * - Water flow measurement using YF-S201 sensor
 * - WiFi connectivity
 * - MQTT communication with auto-reconnect
 * - Offline data buffering (stores up to 100 readings in SPIFFS)
 * - Battery level monitoring
 * - Configurable reporting intervals
 * - Deep sleep support for battery saving
 * - OTA firmware updates
 *
 * Hardware:
 * - ESP32 Dev Board
 * - YF-S201 Water Flow Sensor
 * - Optional: Battery monitoring circuit on GPIO34
 *
 * Connections:
 * - Flow Sensor Signal -> GPIO 4
 * - Flow Sensor VCC -> 5V
 * - Flow Sensor GND -> GND
 * - Battery Monitor (optional) -> GPIO 34 (ADC)
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <SPIFFS.h>
#include <Preferences.h>

// ============ CONFIGURATION ============
// WiFi Settings
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Server Settings
const char* API_SERVER = "http://192.168.1.100:3000";  // Change to your server IP
const char* MQTT_SERVER = "192.168.1.100";              // Change to your MQTT broker IP
const int MQTT_PORT = 1883;

// Device Credentials (Get these from device registration)
String DEVICE_ID = "YOUR_DEVICE_ID";
String API_KEY = "YOUR_API_KEY";

// Hardware Pins
const int FLOW_SENSOR_PIN = 4;
const int BATTERY_PIN = 34;  // ADC pin for battery monitoring

// Flow Sensor Calibration
const float CALIBRATION_FACTOR = 7.5;  // Pulses per liter (YF-S201 default)

// Reporting Intervals
const unsigned long REPORT_INTERVAL = 30000;      // Report every 30 seconds
const unsigned long STATUS_INTERVAL = 300000;     // Status update every 5 minutes
const unsigned long HEARTBEAT_INTERVAL = 60000;   // Heartbeat every 1 minute

// Deep Sleep Settings
const bool ENABLE_DEEP_SLEEP = false;             // Set to true for battery-powered operation
const unsigned long SLEEP_DURATION = 3600;        // Sleep duration in seconds (1 hour)

// ============ GLOBAL VARIABLES ============
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);
Preferences preferences;

volatile unsigned long pulseCount = 0;
unsigned long lastReportTime = 0;
unsigned long lastStatusTime = 0;
unsigned long lastHeartbeatTime = 0;
float totalVolume = 0.0;
float sessionVolume = 0.0;

bool wifiConnected = false;
bool mqttConnected = false;
int reconnectAttempts = 0;

// Offline buffer
const int MAX_BUFFER_SIZE = 100;
int bufferCount = 0;

// ============ INTERRUPT SERVICE ROUTINE ============
void IRAM_ATTR pulseCounter() {
  pulseCount++;
}

// ============ SETUP ============
void setup() {
  Serial.begin(115200);
  Serial.println("\n\n==============================");
  Serial.println("Water Flow Sensor Starting...");
  Serial.println("==============================");

  // Initialize SPIFFS for offline storage
  if (!SPIFFS.begin(true)) {
    Serial.println("❌ SPIFFS initialization failed");
  } else {
    Serial.println("✅ SPIFFS initialized");
  }

  // Initialize preferences
  preferences.begin("water-sensor", false);
  totalVolume = preferences.getFloat("total_volume", 0.0);
  Serial.printf("📊 Total volume from memory: %.2f L\n", totalVolume);

  // Setup pins
  pinMode(FLOW_SENSOR_PIN, INPUT_PULLUP);
  pinMode(BATTERY_PIN, INPUT);

  // Attach interrupt
  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), pulseCounter, FALLING);

  // Connect to WiFi
  connectWiFi();

  // Connect to MQTT
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  connectMQTT();

  // Load buffered data and sync if online
  if (mqttConnected) {
    syncBufferedData();
  }

  Serial.println("✅ Setup complete!");
}

// ============ MAIN LOOP ============
void loop() {
  unsigned long currentTime = millis();

  // Maintain connections
  if (!wifiConnected) {
    connectWiFi();
  }

  if (wifiConnected && !mqttClient.connected()) {
    connectMQTT();
  }

  if (mqttClient.connected()) {
    mqttClient.loop();
  }

  // Calculate flow rate
  float flowRate = calculateFlowRate();

  // Report water usage periodically
  if (currentTime - lastReportTime >= REPORT_INTERVAL) {
    if (sessionVolume > 0.001) {  // Only report if there's actual usage
      reportWaterUsage(sessionVolume);
      sessionVolume = 0.0;
    }
    lastReportTime = currentTime;
  }

  // Send status update
  if (currentTime - lastStatusTime >= STATUS_INTERVAL) {
    sendStatusUpdate();
    lastStatusTime = currentTime;
  }

  // Send heartbeat
  if (currentTime - lastHeartbeatTime >= HEARTBEAT_INTERVAL) {
    sendHeartbeat();
    lastHeartbeatTime = currentTime;
  }

  // Save total volume periodically
  static unsigned long lastSaveTime = 0;
  if (currentTime - lastSaveTime >= 60000) {  // Save every minute
    preferences.putFloat("total_volume", totalVolume);
    lastSaveTime = currentTime;
  }

  // Deep sleep mode (for battery powered sensors)
  if (ENABLE_DEEP_SLEEP && sessionVolume < 0.001) {
    // No water flow detected, enter deep sleep
    goToSleep();
  }

  delay(100);
}

// ============ WIFI CONNECTION ============
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    return;
  }

  Serial.printf("📡 Connecting to WiFi: %s\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.printf("\n✅ WiFi connected! IP: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("📶 Signal strength: %d dBm\n", WiFi.RSSI());
  } else {
    wifiConnected = false;
    Serial.println("\n❌ WiFi connection failed");
  }
}

// ============ MQTT CONNECTION ============
void connectMQTT() {
  if (!wifiConnected) return;

  String clientId = "ESP32_" + DEVICE_ID;

  Serial.printf("📡 Connecting to MQTT broker: %s:%d\n", MQTT_SERVER, MQTT_PORT);

  int attempts = 0;
  while (!mqttClient.connected() && attempts < 3) {
    if (mqttClient.connect(clientId.c_str())) {
      mqttConnected = true;
      Serial.println("✅ MQTT connected!");

      // Subscribe to device-specific topics
      String configTopic = "water/device/" + DEVICE_ID + "/config";
      mqttClient.subscribe(configTopic.c_str());

      reconnectAttempts = 0;
      return;
    } else {
      Serial.printf("❌ MQTT connection failed, rc=%d\n", mqttClient.state());
      attempts++;
      delay(2000);
    }
  }

  mqttConnected = false;
  reconnectAttempts++;
}

// ============ MQTT CALLBACK ============
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  Serial.printf("📨 MQTT message received on %s: %s\n", topic, message.c_str());

  // Handle configuration updates
  if (String(topic).endsWith("/config")) {
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, message);

    if (!error && doc.containsKey("reset_counter")) {
      totalVolume = 0.0;
      preferences.putFloat("total_volume", 0.0);
      Serial.println("🔄 Total volume counter reset");
    }
  }
}

// ============ FLOW RATE CALCULATION ============
float calculateFlowRate() {
  static unsigned long lastCalcTime = 0;
  unsigned long currentTime = millis();
  unsigned long timeDelta = currentTime - lastCalcTime;

  if (timeDelta >= 1000) {  // Calculate every second
    // Flow rate (L/min) = (pulseCount / calibration factor) / (time / 60)
    float flowRateLPerMin = (pulseCount / CALIBRATION_FACTOR) / (timeDelta / 60000.0);
    float volumeLiters = pulseCount / CALIBRATION_FACTOR;

    totalVolume += volumeLiters;
    sessionVolume += volumeLiters;

    if (flowRateLPerMin > 0.01) {
      Serial.printf("💧 Flow: %.2f L/min | Session: %.3f L | Total: %.2f L\n",
                    flowRateLPerMin, sessionVolume, totalVolume);
    }

    pulseCount = 0;
    lastCalcTime = currentTime;

    return flowRateLPerMin;
  }

  return 0.0;
}

// ============ REPORT WATER USAGE ============
void reportWaterUsage(float volume) {
  Serial.printf("📤 Reporting water usage: %.3f liters\n", volume);

  StaticJsonDocument<512> doc;
  doc["device_id"] = DEVICE_ID;
  doc["api_key"] = API_KEY;
  doc["type"] = "usage";

  JsonObject data = doc.createNestedObject("data");
  data["volume"] = volume;
  data["activity_type"] = "general";

  doc["timestamp"] = millis();

  String jsonString;
  serializeJson(doc, jsonString);

  // Try MQTT first
  if (mqttConnected) {
    String topic = "water/device/" + DEVICE_ID + "/usage";
    if (mqttClient.publish(topic.c_str(), jsonString.c_str())) {
      Serial.println("✅ Usage reported via MQTT");
      return;
    }
  }

  // Fallback to HTTP API
  if (wifiConnected) {
    if (reportViaHTTP(jsonString)) {
      Serial.println("✅ Usage reported via HTTP");
      return;
    }
  }

  // If both failed, buffer for later
  bufferData(jsonString);
  Serial.println("💾 Usage buffered for later sync");
}

// ============ SEND STATUS UPDATE ============
void sendStatusUpdate() {
  int batteryLevel = getBatteryLevel();
  int signalStrength = WiFi.RSSI();

  StaticJsonDocument<512> doc;
  doc["device_id"] = DEVICE_ID;
  doc["api_key"] = API_KEY;
  doc["type"] = "status";

  JsonObject data = doc.createNestedObject("data");
  data["battery_level"] = batteryLevel;
  data["signal_strength"] = signalStrength;
  data["is_online"] = true;
  data["uptime_seconds"] = millis() / 1000;
  data["ip_address"] = WiFi.localIP().toString();

  String jsonString;
  serializeJson(doc, jsonString);

  if (mqttConnected) {
    String topic = "water/device/" + DEVICE_ID + "/status";
    mqttClient.publish(topic.c_str(), jsonString.c_str());
  }

  Serial.printf("📊 Status: Battery %d%% | Signal %d dBm | Uptime %lu s\n",
                batteryLevel, signalStrength, millis() / 1000);
}

// ============ SEND HEARTBEAT ============
void sendHeartbeat() {
  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["api_key"] = API_KEY;
  doc["type"] = "heartbeat";
  doc["timestamp"] = millis();

  String jsonString;
  serializeJson(doc, jsonString);

  if (mqttConnected) {
    String topic = "water/device/" + DEVICE_ID + "/heartbeat";
    mqttClient.publish(topic.c_str(), jsonString.c_str());
  }
}

// ============ HTTP REPORTING ============
bool reportViaHTTP(String jsonData) {
  HTTPClient http;
  String url = String(API_SERVER) + "/api/devices/api/report";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", API_KEY);

  int httpCode = http.POST(jsonData);

  if (httpCode == 200) {
    http.end();
    return true;
  }

  Serial.printf("❌ HTTP error: %d\n", httpCode);
  http.end();
  return false;
}

// ============ OFFLINE BUFFER ============
void bufferData(String data) {
  if (bufferCount >= MAX_BUFFER_SIZE) {
    Serial.println("⚠️  Buffer full, dropping oldest entry");
    // Rotate buffer
    for (int i = 0; i < MAX_BUFFER_SIZE - 1; i++) {
      String filename = "/buffer_" + String(i + 1) + ".json";
      String newFilename = "/buffer_" + String(i) + ".json";
      SPIFFS.rename(filename, newFilename);
    }
    bufferCount = MAX_BUFFER_SIZE - 1;
  }

  String filename = "/buffer_" + String(bufferCount) + ".json";
  File file = SPIFFS.open(filename, FILE_WRITE);

  if (file) {
    file.println(data);
    file.close();
    bufferCount++;
    Serial.printf("💾 Buffered to %s\n", filename.c_str());
  }
}

void syncBufferedData() {
  Serial.printf("🔄 Syncing %d buffered entries...\n", bufferCount);

  for (int i = 0; i < bufferCount; i++) {
    String filename = "/buffer_" + String(i) + ".json";
    File file = SPIFFS.open(filename, FILE_READ);

    if (file) {
      String data = file.readStringUntil('\n');
      file.close();

      if (reportViaHTTP(data)) {
        SPIFFS.remove(filename);
        Serial.printf("✅ Synced and deleted %s\n", filename.c_str());
      } else {
        Serial.printf("❌ Failed to sync %s\n", filename.c_str());
        break;  // Stop trying if one fails
      }
    }
  }

  // Recount buffer
  bufferCount = 0;
  File root = SPIFFS.open("/");
  File file = root.openNextFile();
  while (file) {
    if (String(file.name()).startsWith("/buffer_")) {
      bufferCount++;
    }
    file = root.openNextFile();
  }

  Serial.printf("📦 Buffer now contains %d entries\n", bufferCount);
}

// ============ BATTERY MONITORING ============
int getBatteryLevel() {
  int rawValue = analogRead(BATTERY_PIN);

  // Convert to voltage (assuming 3.3V reference and voltage divider)
  float voltage = (rawValue / 4095.0) * 3.3 * 2.0;  // *2 if using voltage divider

  // Convert to percentage (3.0V = 0%, 4.2V = 100% for Li-Ion)
  int percentage = ((voltage - 3.0) / 1.2) * 100;
  percentage = constrain(percentage, 0, 100);

  return percentage;
}

// ============ DEEP SLEEP ============
void goToSleep() {
  Serial.println("💤 Entering deep sleep...");

  // Save state
  preferences.putFloat("total_volume", totalVolume);
  preferences.end();

  // Detach interrupt
  detachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN));

  // Configure wakeup
  esp_sleep_enable_timer_wakeup(SLEEP_DURATION * 1000000ULL);

  // Enter deep sleep
  esp_deep_sleep_start();
}

/*
 * Water Conservation Game - Device Configuration Helper
 *
 * This sketch helps you register your ESP32 device with the server
 * and configure WiFi settings.
 *
 * Usage:
 * 1. Upload this sketch to your ESP32
 * 2. Open Serial Monitor at 115200 baud
 * 3. Follow the prompts to configure WiFi and register device
 * 4. The sketch will output your DEVICE_ID and API_KEY
 * 5. Copy these values to the main WaterFlowSensor.ino sketch
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>

Preferences prefs;

String wifiSSID = "";
String wifiPassword = "";
String serverURL = "";
String userToken = "";

String deviceID = "";
String apiKey = "";

void setup() {
  Serial.begin(115200);
  delay(2000);

  Serial.println("\n\n=======================================");
  Serial.println("Water Conservation Game");
  Serial.println("Device Configuration Helper");
  Serial.println("=======================================\n");

  prefs.begin("water-config", false);

  // Load saved config if exists
  deviceID = prefs.getString("device_id", "");
  apiKey = prefs.getString("api_key", "");

  if (deviceID.length() > 0) {
    Serial.println("✅ Device already configured!");
    Serial.println("Device ID: " + deviceID);
    Serial.println("API Key: " + apiKey);
    Serial.println("\nType 'reset' to reconfigure, or 'quit' to exit.");

    while (true) {
      if (Serial.available()) {
        String input = Serial.readStringUntil('\n');
        input.trim();

        if (input == "reset") {
          prefs.clear();
          Serial.println("🔄 Configuration cleared. Restarting...");
          delay(1000);
          ESP.restart();
        } else if (input == "quit") {
          Serial.println("👋 Exiting...");
          return;
        }
      }
      delay(100);
    }
  }

  configureDevice();
}

void loop() {
  // Nothing here
}

void configureDevice() {
  Serial.println("📝 Let's configure your water sensor!\n");

  // Step 1: WiFi Configuration
  Serial.println("Step 1: WiFi Configuration");
  Serial.println("---------------------------");
  Serial.print("Enter WiFi SSID: ");
  wifiSSID = waitForInput();
  Serial.println(wifiSSID);

  Serial.print("Enter WiFi Password: ");
  wifiPassword = waitForInput();
  Serial.println("********");

  // Step 2: Connect to WiFi
  Serial.println("\n📡 Connecting to WiFi...");
  WiFi.begin(wifiSSID.c_str(), wifiPassword.c_str());

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\n❌ WiFi connection failed!");
    Serial.println("Please check your credentials and try again.");
    Serial.println("Restarting in 3 seconds...");
    delay(3000);
    ESP.restart();
  }

  Serial.println("\n✅ WiFi connected!");
  Serial.println("IP Address: " + WiFi.localIP().toString());

  // Step 3: Server Configuration
  Serial.println("\nStep 2: Server Configuration");
  Serial.println("---------------------------");
  Serial.print("Enter server URL (e.g., http://192.168.1.100:3000): ");
  serverURL = waitForInput();
  Serial.println(serverURL);

  // Step 4: User Authentication
  Serial.println("\nStep 3: User Authentication");
  Serial.println("---------------------------");
  Serial.println("You need to login to get your authentication token.");
  Serial.println("Go to: " + serverURL + "/login");
  Serial.println("After logging in, check browser dev tools (Network tab)");
  Serial.println("and find your token in the Authorization header.");
  Serial.print("\nEnter your JWT token: ");
  userToken = waitForInput();
  Serial.println("Token received (length: " + String(userToken.length()) + ")");

  // Step 5: Device Registration
  Serial.println("\nStep 4: Device Registration");
  Serial.println("---------------------------");

  String deviceName = "";
  String deviceLocation = "";

  Serial.print("Enter device name (e.g., 'Kitchen Sink'): ");
  deviceName = waitForInput();
  Serial.println(deviceName);

  Serial.print("Enter location (e.g., 'Kitchen'): ");
  deviceLocation = waitForInput();
  Serial.println(deviceLocation);

  // Get MAC address
  String macAddress = WiFi.macAddress();
  Serial.println("MAC Address: " + macAddress);

  // Register device with API
  Serial.println("\n📡 Registering device with server...");

  HTTPClient http;
  http.begin(serverURL + "/api/devices/register");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + userToken);

  StaticJsonDocument<512> doc;
  doc["device_name"] = deviceName;
  doc["device_type"] = "flow_sensor";
  doc["location"] = deviceLocation;
  doc["mac_address"] = macAddress;
  doc["firmware_version"] = "1.0.0";

  String requestBody;
  serializeJson(doc, requestBody);

  int httpCode = http.POST(requestBody);

  if (httpCode == 201) {
    String response = http.getString();
    Serial.println("✅ Device registered successfully!");

    StaticJsonDocument<1024> responseDoc;
    deserializeJson(responseDoc, response);

    deviceID = responseDoc["device"]["id"].as<String>();
    apiKey = responseDoc["api_key"].as<String>();

    // Save to preferences
    prefs.putString("device_id", deviceID);
    prefs.putString("api_key", apiKey);
    prefs.putString("wifi_ssid", wifiSSID);
    prefs.putString("wifi_pass", wifiPassword);
    prefs.putString("server_url", serverURL);

    Serial.println("\n🎉 Configuration Complete!");
    Serial.println("========================================");
    Serial.println("DEVICE ID: " + deviceID);
    Serial.println("API KEY:   " + apiKey);
    Serial.println("========================================");
    Serial.println("\n⚠️  IMPORTANT: Copy these values!");
    Serial.println("\nUpdate WaterFlowSensor.ino with:");
    Serial.println("DEVICE_ID = \"" + deviceID + "\";");
    Serial.println("API_KEY = \"" + apiKey + "\";");
    Serial.println("\nPress RESET to reconfigure.");

  } else {
    Serial.println("❌ Registration failed!");
    Serial.println("HTTP Code: " + String(httpCode));
    Serial.println("Response: " + http.getString());
    Serial.println("\nPlease check:");
    Serial.println("1. Server URL is correct");
    Serial.println("2. JWT token is valid");
    Serial.println("3. Server is running");
    Serial.println("\nRestarting in 5 seconds...");
    delay(5000);
    ESP.restart();
  }

  http.end();
}

String waitForInput() {
  String input = "";

  while (true) {
    if (Serial.available()) {
      input = Serial.readStringUntil('\n');
      input.trim();
      if (input.length() > 0) {
        return input;
      }
    }
    delay(100);
  }
}

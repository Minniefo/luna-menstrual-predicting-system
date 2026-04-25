#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <math.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ================= WIFI =================
//const char* ssid = "SLT-Fiber-CMM-2.4GHz";
//const char* password = "0717888871L";

const char* ssid = "Minnie's iPhone";
const char* password = "19081525";

// 🔥 Backend (PORT 5000)
const char* serverUrl = "http://192.168.1.9:5000/api/wearable/readings";

// ================= OLED =================
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 32
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// ================= GLOBALS =================
String predictionText = "Waiting";
float predictionProb = 0.0;

// ================= TEMP =================
float readMAX30205_C() {
  Wire.beginTransmission(0x48);
  Wire.write(0x00);
  if (Wire.endTransmission(false) != 0) return NAN;

  Wire.requestFrom(0x48, (uint8_t)2);
  if (Wire.available() < 2) return NAN;

  uint8_t msb = Wire.read();
  uint8_t lsb = Wire.read();
  int16_t raw = (msb << 8) | lsb;

  return raw / 256.0f;
}

// ================= MPU =================
bool readMPU(float &ax, float &ay, float &az) {
  Wire.beginTransmission(0x68);
  Wire.write(0x3B);
  if (Wire.endTransmission(false) != 0) return false;

  Wire.requestFrom(0x68, 6);
  if (Wire.available() < 6) return false;

  int16_t rawAx = (Wire.read() << 8) | Wire.read();
  int16_t rawAy = (Wire.read() << 8) | Wire.read();
  int16_t rawAz = (Wire.read() << 8) | Wire.read();

  ax = rawAx / 16384.0;
  ay = rawAy / 16384.0;
  az = rawAz / 16384.0;

  return true;
}

// ================= HELPER =================
String shortPrediction(String txt) {
  if (txt.indexOf("Period") >= 0) return "Period Soon";
  if (txt.indexOf("No") >= 0) return "Not Soon";
  return "Waiting";
}

// ================= WIFI RECONNECT =================
void ensureWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.println("Reconnecting WiFi...");
  WiFi.disconnect();
  WiFi.begin(ssid, password);

  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 10) {
    delay(500);
    Serial.print(".");
    retry++;
  }

  Serial.println(WiFi.status() == WL_CONNECTED ? "\nReconnected!" : "\nFailed reconnect");
}

// ================= SETUP =================
/*void setup() {
  Serial.begin(115200);

  WiFi.begin(ssid, password);
  Serial.print("Connecting");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nConnected!");
  Serial.println(WiFi.localIP());

  Wire.begin();

  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED FAILED");
    while (true);
  }

  display.clearDisplay();
}*/

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("STEP 1: Setup started");

  Serial.println("STEP 2: Starting WiFi");
  WiFi.begin(ssid, password);

  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 10) {
    delay(500);
    Serial.print(".");
    retry++;
  }

  Serial.println("\nSTEP 3: WiFi done");

  Serial.println("STEP 4: Init OLED");
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED FAILED");
    while (true);
  }

  Serial.println("STEP 5: OLED OK");
}

// ================= LOOP =================
void loop() {

  static unsigned long lastSend = 0;
  static unsigned long lastScreenSwitch = 0;
  static int screenIndex = 0;

  ensureWiFi();

  if (millis() - lastSend >= 3000) {
    lastSend = millis();

    float tempC = readMAX30205_C();

    float ax, ay, az;
    bool imuOK = readMPU(ax, ay, az);
    float aMag = imuOK ? sqrt(ax*ax + ay*ay + az*az) : 0;

    if (isnan(tempC)) tempC = 0;

    int sleepDisturbance = (aMag > 1.2) ? 1 : 0;

    // ===== SEND TO BACKEND =====
    if (WiFi.status() == WL_CONNECTED) {

      HTTPClient http;
      http.begin(serverUrl);
      http.addHeader("Content-Type", "application/json");

      String json = "{";
      json += "\"date\":\"2026-04-23\",";
      json += "\"heartRate\":75,";
      json += "\"temperature\":" + String(tempC, 2) + ",";
      json += "\"sleepDisturbances\":" + String(sleepDisturbance);
      json += "}";

      Serial.println("📤 Sending:");
      Serial.println(json);

      int response = http.POST(json);

      Serial.print("HTTP Status: ");
      Serial.println(response);

      if (response > 0) {
        String payload = http.getString();
        Serial.println("📥 Response:");
        Serial.println(payload);
      } else {
        Serial.println("❌ HTTP Error");
      }

      http.end();
    }

    // ===== SCREEN SWITCH =====
    if (millis() - lastScreenSwitch >= 5000) {
      screenIndex = (screenIndex + 1) % 3;
      lastScreenSwitch = millis();
    }

    // ===== OLED DISPLAY =====
    display.clearDisplay();
    display.setCursor(0, 0);
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);

    if (screenIndex == 0) {
      display.println("Temp & Motion");
      display.print("T:");
      display.print(tempC, 1);
      display.println("C");

      display.print("M:");
      display.println(aMag, 2);
    }
    else if (screenIndex == 1) {
      display.println("Vitals");
      display.println("HR: 75 bpm");

      display.print("Sleep:");
      display.println(sleepDisturbance);
    }
    else {
      display.println("Prediction");
      display.println(shortPrediction(predictionText));

      display.print("P:");
      display.println(predictionProb, 2);
    }

    display.display();
  }
}
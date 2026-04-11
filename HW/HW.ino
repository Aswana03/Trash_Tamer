#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <ESP32Servo.h>
#include <WiFiManager.h>
#include <WiFi.h>
#include <HTTPClient.h>


// ================= OLED CONFIG =================
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// ================= PIN CONFIG =================

// 🔹 MAIN ULTRASONIC
#define TRIG_PIN 5
#define ECHO_PIN 18

// 🔹 BIN ULTRASONICS
#define FOOD_BIN_TRIG 25
#define FOOD_BIN_ECHO 14

#define DRY_BIN_TRIG 32
#define DRY_BIN_ECHO 33  

// 🔹 CAMERA CONNECTION
#define CAM_TRIGGER 4
#define FOOD_INPUT 26
#define DRY_INPUT 27

// 🔹 SERVO PINS
#define FOOD_SERVO_PIN 13
#define DRY_SERVO_PIN 12

String BIN_ID = "bin_001";   // 🔥 unique for each device


Servo foodServo;
Servo dryServo;

// ================= VARIABLES =================
long duration;
float distance;

unsigned long lastSendTime = 0;

bool foodBinFull = false;
bool dryBinFull = false;

bool systemBusy = false;

float getDistance(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);

  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);

  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH, 30000);
  float dist = duration * 0.034 / 2;

  return dist;
}

void sendToFirebase(int bio, int nonBio) {

  if (WiFi.status() == WL_CONNECTED) {

    HTTPClient http;

    String url = "https://firestore.googleapis.com/v1/projects/smart-waste-app-f3fe7/databases/(default)/documents/bins/" + BIN_ID;

    http.begin(url);
    http.addHeader("Content-Type", "application/json");

    String payload = "{ \"fields\": { "
                     "\"bio\": {\"integerValue\": \"" + String(bio) + "\"}, "
                     "\"nonBio\": {\"integerValue\": \"" + String(nonBio) + "\"} "
                     "} }";

    int httpResponseCode = http.PATCH(payload);

    Serial.print("Firebase Response: ");
    Serial.println(httpResponseCode);

    http.end();
  }
}

void moveServoSmooth(Servo &servo, int startAngle, int endAngle, int stepDelay) {
  if (startAngle < endAngle) {
    for (int angle = startAngle; angle <= endAngle; angle++) {
      servo.write(angle);
      delay(stepDelay);
    }
  } else {
    for (int angle = startAngle; angle >= endAngle; angle--) {
      servo.write(angle);
      delay(stepDelay);
    }
  }
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);

  WiFiManager wm;

  // This creates hotspot if no WiFi saved
  bool res = wm.autoConnect("TrashTamer_Setup");

  if (!res) {
    Serial.println("❌ Failed to connect");
  } else {
    Serial.println("✅ Connected to WiFi");
  }

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  pinMode(CAM_TRIGGER, OUTPUT);

  foodServo.attach(FOOD_SERVO_PIN);
  dryServo.attach(DRY_SERVO_PIN);

  pinMode(FOOD_BIN_TRIG, OUTPUT);
  pinMode(FOOD_BIN_ECHO, INPUT);

  pinMode(DRY_BIN_TRIG, OUTPUT);
  pinMode(DRY_BIN_ECHO, INPUT);

  // Initial position (closed)
  foodServo.write(0);
  dryServo.write(0);

  // 🔥 IMPORTANT: prevent floating inputs
  pinMode(FOOD_INPUT, INPUT_PULLDOWN);
  pinMode(DRY_INPUT, INPUT_PULLDOWN);

  digitalWrite(CAM_TRIGGER, LOW);

  // OLED INIT
  Wire.begin(21, 22);

  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED not found");
    while (1);
  }

  display.clearDisplay();
  display.setTextSize(2);
  display.setTextColor(WHITE);

  display.setCursor(0, 0);
  display.println("System Started");
  display.display();

  delay(2000);
}

// ================= LOOP =================
void loop() {

  // -------- BUSY STATE --------
  if (systemBusy) {
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("System Busy...");
    display.display();
    delay(500);
    return;
  }

  // -------- ULTRASONIC --------
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);

  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);

  digitalWrite(TRIG_PIN, LOW);

  duration = pulseIn(ECHO_PIN, HIGH, 30000); // timeout added
  distance = duration * 0.034 / 2;

  Serial.print("Distance: ");
  Serial.println(distance);

  // OLED: Scanning
  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("Scanning..");
  display.setCursor(0, 40);
  display.print(distance);
  display.println(" cm");
  display.display();

  // 🔍 CONTINUOUS BIN MONITORING
  float foodLevel = getDistance(FOOD_BIN_TRIG, FOOD_BIN_ECHO);
  float dryLevel  = getDistance(DRY_BIN_TRIG, DRY_BIN_ECHO);

  int foodPercent = map(foodLevel, 30, 5, 0, 100);
  int dryPercent  = map(dryLevel, 30, 5, 0, 100);

  foodPercent = constrain(foodPercent, 0, 100);
  dryPercent  = constrain(dryPercent, 0, 100);

  if (millis() - lastSendTime > 5000) {
    sendToFirebase(foodPercent, dryPercent);
    lastSendTime = millis();
  }

  // Update status
  foodBinFull = (foodLevel < 5);
  dryBinFull  = (dryLevel < 5);

  // -------- DETECTION (DOUBLE CHECK) --------
  if (distance > 0 && distance < 10) {

    delay(100); // stability delay

    // re-check
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);

    long duration2 = pulseIn(ECHO_PIN, HIGH, 30000);
    float distance2 = duration2 * 0.034 / 2;

    if (distance2 > 0 && distance2 < 10) {

      Serial.println(">>> WASTE DETECTED <<<");

      systemBusy = true;

      // 🔴 TRIGGER CAMERA (NOW FIXED)
      digitalWrite(CAM_TRIGGER, HIGH);
      Serial.println("CAM TRIGGER HIGH");

      // OLED
      display.clearDisplay();
      display.setCursor(0, 0);
      display.println("Detecting...");
      display.display();

      delay(10000); // camera processing time

      digitalWrite(CAM_TRIGGER, LOW);
      Serial.println("CAM TRIGGER LOW");

      // -------- READ CAMERA OUTPUT --------
      bool isFood = digitalRead(FOOD_INPUT);
      bool isDry  = digitalRead(DRY_INPUT);

      display.clearDisplay();
      display.setCursor(0, 0);

      if (isFood) {
        Serial.println("FOOD WASTE DETECTED");
        display.println("FOOD WASTE");
      }
      else if (isDry) {
        Serial.println("DRY WASTE DETECTED");
        display.println("DRY WASTE");
      }
      else {
        Serial.println("UNKNOWN WASTE");
        display.println("UNKNOWN");
        display.display();

        delay(1500);

        // 🔴 RESET IMMEDIATELY
        systemBusy = false;
        return;
      }

      display.display();
      delay(1500);

      // -------- PROCESS --------
      Serial.println("Processing Waste...");
      display.clearDisplay();
      display.setCursor(0, 0);
      display.println("Processing...");
      display.display();

      // -------- WAIT BEFORE OPENING --------
      delay(2000);

      display.clearDisplay();
      display.setCursor(0, 0);

      // 🔴 FOOD CASE
      if (isFood) {

        if (foodBinFull) {
          Serial.println("FOOD BIN FULL");
          display.println("CANNOT OPEN");
          display.println("FOOD BIN FULL");
          display.display();

          delay(2000);
          systemBusy = false;
          return;
        }

        Serial.println("Opening Food Lid...");
        display.println("Opening Lid...");
        display.display();

        moveServoSmooth(foodServo, 0, 180, 10);
      }

      // 🔴 DRY CASE
      else if (isDry) {

        if (dryBinFull) {
          Serial.println("DRY BIN FULL");
          display.println("CANNOT OPEN");
          display.println("DRY BIN FULL");
          display.display();

          delay(2000);
          systemBusy = false;
          return;
        }

        Serial.println("Opening Dry Lid...");
        display.println("Opening Lid...");
        display.display();

        moveServoSmooth(dryServo, 0, 180, 10);
      }
      // Keep open for 5 seconds
      delay(5000);

      // -------- CLOSE LID --------
      Serial.println("Closing Lid...");
      display.clearDisplay();
      display.setCursor(0, 0);
      display.println("Closing Lid...");
      display.display();

      // 🔥 Return to closed position
      if (isFood) {
        moveServoSmooth(foodServo, 180, 0, 10);
      }
      else if (isDry) {
        moveServoSmooth(dryServo, 180, 0, 10);
      }

      delay(2000);

      Serial.println("Process Complete");

      display.clearDisplay();
      display.setCursor(0, 0);
      display.println("Done!");
      display.display();

      delay(1500);

      systemBusy = false;
    }
  }

  delay(200);
}
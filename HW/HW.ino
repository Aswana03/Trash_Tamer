#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ================= OLED CONFIG =================
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// ================= PIN CONFIG =================

// 🔹 MAIN ULTRASONIC
#define TRIG_PIN 5
#define ECHO_PIN 18

// 🔹 CAMERA CONNECTION
#define CAM_TRIGGER 4
#define FOOD_INPUT 26
#define DRY_INPUT 27

// ================= VARIABLES =================
long duration;
float distance;

bool systemBusy = false;

// ================= SETUP =================
void setup() {
  Serial.begin(115200);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  pinMode(CAM_TRIGGER, OUTPUT);

  pinMode(CAM_TRIGGER, OUTPUT);

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
      delay(2000);

      // Opening
      Serial.println("Opening Lid...");
      display.clearDisplay();
      display.setCursor(0, 0);
      display.println("Opening Lid...");
      display.display();
      delay(2000);

      // Closing
      Serial.println("Closing Lid...");
      display.clearDisplay();
      display.setCursor(0, 0);
      display.println("Closing Lid...");
      display.display();
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
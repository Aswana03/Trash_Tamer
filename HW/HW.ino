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

// ================= VARIABLES =================
long duration;
float distance;

bool systemBusy = false;

// ================= SETUP =================
void setup() {
  Serial.begin(115200);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  // OLED INIT
  Wire.begin(21, 22);

  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED not found");
    while (1);
  }

  display.clearDisplay();
  display.setTextSize(1);
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

    delay(1000);
    return;
  }

  // -------- ULTRASONIC --------
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);

  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);

  digitalWrite(TRIG_PIN, LOW);

  duration = pulseIn(ECHO_PIN, HIGH);
  distance = duration * 0.034 / 2;

  Serial.print("Distance: ");
  Serial.println(distance);

  // OLED: Scanning
  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("Scanning...");
  display.print("Dist: ");
  display.print(distance);
  display.println(" cm");
  display.display();

  // -------- DETECTION --------
  if (distance > 0 && distance < 10) {

    Serial.println(">>> WASTE DETECTED <<<");

    systemBusy = true;

    // OLED: Waste detected
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("WASTE DETECTED");
    display.display();

    delay(1500);

    // Processing
    Serial.println("Processing Waste...");
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("Processing...");
    display.display();
    delay(3000);

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

  delay(500);
}
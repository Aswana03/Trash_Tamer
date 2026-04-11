// ================= PIN CONFIG =================

// 🔹 MAIN ULTRASONIC
#define TRIG_PIN 5
#define ECHO_PIN 18

// ================= VARIABLES =================
long duration;
float distance;

bool systemBusy = false;  // 🔥 controls scanning

void setup() {
  Serial.begin(115200);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  Serial.println("Ultrasonic Test Started...");
}

void loop() {

  // -------- IF SYSTEM BUSY → STOP SCANNING --------
  if (systemBusy) {
    Serial.println("System Busy... Waiting");
    delay(1000);
    return;
  }

  // -------- TRIGGER PULSE --------
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);

  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);

  digitalWrite(TRIG_PIN, LOW);

  // -------- READ ECHO --------
  duration = pulseIn(ECHO_PIN, HIGH);

  // Convert to distance (cm)
  distance = duration * 0.034 / 2;

  // -------- PRINT --------
  Serial.print("Distance: ");
  Serial.print(distance);
  Serial.println(" cm");

  // -------- DETECTION --------
  if (distance > 0 && distance < 10) {

    Serial.println(">>> WASTE DETECTED <<<");

    // 🔴 STOP further scanning
    systemBusy = true;

    // -------- SIMULATE FULL PROCESS --------
    Serial.println("Processing Waste...");
    delay(3000);   // (camera + classification)

    Serial.println("Opening Lid...");
    delay(2000);   // (servo open)

    Serial.println("Closing Lid...");
    delay(2000);   // (servo close)

    Serial.println("Process Complete ✅");

    // 🔴 RESUME scanning
    systemBusy = false;
  }

  delay(500);
}
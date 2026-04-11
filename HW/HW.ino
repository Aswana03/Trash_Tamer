// ================= PIN CONFIG =================

// 🔹 MAIN ULTRASONIC
#define TRIG_PIN 5
#define ECHO_PIN 18

// ================= VARIABLES =================
long duration;
float distance;

void setup() {
  Serial.begin(115200);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  Serial.println("Ultrasonic Test Started...");
}

void loop() {

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
  }

  delay(500);
}
#include <Image_classification_inferencing.h>
#include "edge-impulse-sdk/dsp/image/image.hpp"
#include "esp_camera.h"

// Camera model
#define CAMERA_MODEL_AI_THINKER

#if defined(CAMERA_MODEL_AI_THINKER)
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27

#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22
#endif

#define EI_CAMERA_RAW_FRAME_BUFFER_COLS 160
#define EI_CAMERA_RAW_FRAME_BUFFER_ROWS 120
#define EI_CAMERA_FRAME_BYTE_SIZE 3

#define TRIGGER_PIN 12
#define FOOD_PIN 14
#define DRY_PIN 15

static bool debug_nn = false;
static bool is_initialised = false;
uint8_t *snapshot_buf = NULL;

bool processed = false;
bool lastTriggerState = LOW;

// Forward declaration ✅ FIX
static int ei_camera_get_data(size_t offset, size_t length, float *out_ptr);

// Camera config
static camera_config_t camera_config = {
    .pin_pwdn = PWDN_GPIO_NUM,
    .pin_reset = RESET_GPIO_NUM,
    .pin_xclk = XCLK_GPIO_NUM,
    .pin_sscb_sda = SIOD_GPIO_NUM,
    .pin_sscb_scl = SIOC_GPIO_NUM,

    .pin_d7 = Y9_GPIO_NUM,
    .pin_d6 = Y8_GPIO_NUM,
    .pin_d5 = Y7_GPIO_NUM,
    .pin_d4 = Y6_GPIO_NUM,
    .pin_d3 = Y5_GPIO_NUM,
    .pin_d2 = Y4_GPIO_NUM,
    .pin_d1 = Y3_GPIO_NUM,
    .pin_d0 = Y2_GPIO_NUM,
    .pin_vsync = VSYNC_GPIO_NUM,
    .pin_href = HREF_GPIO_NUM,
    .pin_pclk = PCLK_GPIO_NUM,

    .xclk_freq_hz = 20000000,
    .ledc_timer = LEDC_TIMER_0,
    .ledc_channel = LEDC_CHANNEL_0,

    .pixel_format = PIXFORMAT_JPEG,
    .frame_size = FRAMESIZE_QQVGA,
    .jpeg_quality = 15,
    .fb_count = 1,
    .fb_location = CAMERA_FB_IN_DRAM,
    .grab_mode = CAMERA_GRAB_WHEN_EMPTY,
};

// Function declarations
bool ei_camera_init(void);
bool ei_camera_capture(uint32_t, uint32_t, uint8_t*);

void setup()
{
    Serial.begin(115200);

    pinMode(TRIGGER_PIN, INPUT_PULLDOWN);
    pinMode(FOOD_PIN, OUTPUT);
    pinMode(DRY_PIN, OUTPUT);

    digitalWrite(FOOD_PIN, LOW);
    digitalWrite(DRY_PIN, LOW);

    if (!ei_camera_init()) {
        Serial.println("Camera init failed");
    } else {
        Serial.println("Camera initialized");
    }

    snapshot_buf = (uint8_t*)malloc(EI_CAMERA_RAW_FRAME_BUFFER_COLS *
                                   EI_CAMERA_RAW_FRAME_BUFFER_ROWS *
                                   EI_CAMERA_FRAME_BYTE_SIZE);

    if (!snapshot_buf) {
        Serial.println("Buffer allocation failed");
        while (1);
    }

    Serial.println("Waiting for trigger...");
}

void loop()
{
    bool currentState = digitalRead(TRIGGER_PIN);

    if (currentState == HIGH && lastTriggerState == LOW && !processed) {

        Serial.println("Trigger received → Starting scans");

        processed = true;

        float food_sum = 0;
        float paper_sum = 0;
        float plastic_sum = 0;

        int scan_count = 0;
        const int TOTAL_SCANS = 5;

        while (scan_count < TOTAL_SCANS) {

            delay(200);

            ei::signal_t signal;
            signal.total_length = EI_CLASSIFIER_INPUT_WIDTH * EI_CLASSIFIER_INPUT_HEIGHT;
            signal.get_data = &ei_camera_get_data;

            if (!ei_camera_capture(EI_CLASSIFIER_INPUT_WIDTH,
                                   EI_CLASSIFIER_INPUT_HEIGHT,
                                   snapshot_buf)) {
                continue;
            }

            ei_impulse_result_t result = { 0 };

            if (run_classifier(&signal, &result, debug_nn) != EI_IMPULSE_OK) {
                continue;
            }

            float food_val = 0;
            float paper_val = 0;
            float plastic_val = 0;

            for (uint16_t i = 0; i < EI_CLASSIFIER_LABEL_COUNT; i++) {
                String label = String(ei_classifier_inferencing_categories[i]);
                float value = result.classification[i].value;

                if (label == "Food_waste") food_val = value;
                else if (label == "Paper_waste") paper_val = value;
                else if (label == "Plastic_waste") plastic_val = value;
            }

            food_sum += food_val;
            paper_sum += paper_val;
            plastic_sum += plastic_val;

            scan_count++;
        }

        float food_avg = food_sum / TOTAL_SCANS;
        float paper_avg = paper_sum / TOTAL_SCANS;
        float plastic_avg = plastic_sum / TOTAL_SCANS;

        digitalWrite(FOOD_PIN, LOW);
        digitalWrite(DRY_PIN, LOW);

        if (food_avg > paper_avg && food_avg > plastic_avg) {
            digitalWrite(FOOD_PIN, HIGH);
        } else {
            digitalWrite(DRY_PIN, HIGH);
        }
    }

    if (currentState == LOW) {
        processed = false;
        digitalWrite(FOOD_PIN, LOW);
        digitalWrite(DRY_PIN, LOW);
    }

    lastTriggerState = currentState;
}

// CAMERA FUNCTIONS
bool ei_camera_init(void) {
    if (is_initialised) return true;
    if (esp_camera_init(&camera_config) != ESP_OK) return false;
    is_initialised = true;
    return true;
}

bool ei_camera_capture(uint32_t img_width, uint32_t img_height, uint8_t *out_buf) {
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) return false;

    bool converted = fmt2rgb888(fb->buf, fb->len, PIXFORMAT_JPEG, out_buf);
    esp_camera_fb_return(fb);
    return converted;
}

static int ei_camera_get_data(size_t offset, size_t length, float *out_ptr)
{
    size_t pixel_ix = offset * 3;

    for (size_t i = 0; i < length; i++) {
        out_ptr[i] =
            (snapshot_buf[pixel_ix + 2] << 16) |
            (snapshot_buf[pixel_ix + 1] << 8) |
            snapshot_buf[pixel_ix];
        pixel_ix += 3;
    }

    return 0;
}
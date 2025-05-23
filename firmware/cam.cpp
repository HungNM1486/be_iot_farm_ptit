#include "esp_camera.h"
#include <WiFi.h>
#include <WiFiClient.h>
#include <PubSubClient.h>

// =============== CẤU HÌNH WIFI =================
const char* ssid = "TEN_WIFI_CUA_BAN";     // Thay tên WiFi của bạn
const char* password = "MAT_KHAU_WIFI";    // Thay mật khẩu WiFi của bạn

// =============== CẤU HÌNH MQTT ================
const char* mqtt_server = "103.6.234.189";
const int mqtt_port = 1883;
const char* deviceId = "ESP32CAM_001";
char topicCapture[64];

// =============== CẤU HÌNH SERVER ĐÍCH ===============
const char* server = "192.168.1.17";       // Đổi thành IP server nhận ảnh (nếu upload về VPS thì dùng IP VPS)
const int port = 3000;                     // Port server nhận ảnh
const char* uploadPath = "/api/camera/upload";
const char* boundary = "----ESP32CamBoundary";

// =============== CẤU HÌNH GPIO ESP32-CAM =======
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

// LED Flash
#define FLASH_LED_PIN 4
bool flashLedState = false;

// Biến điều khiển tần suất chụp ảnh
unsigned long lastCapture = 0;
unsigned long captureInterval = 60000; // Mặc định 1 phút

WiFiClient espClient;
PubSubClient client(espClient);

// Hàm chụp và gửi ảnh lên server (giữ nguyên như các phiên bản trước)
void captureAndSend() {
  camera_fb_t * fb = NULL;
  fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("❌ Chụp ảnh thất bại (không lấy được frame buffer)");
    delay(1000);
    return;
  }
  Serial.printf("✅ Chụp ảnh thành công: Kích thước = %zu bytes\n", fb->len);

  WiFiClient clientUpload;
  Serial.printf("Đang kết nối tới server %s:%d...\n", server, port);
  int retries = 0;
  while (!clientUpload.connect(server, port) && retries < 3) {
    retries++;
    Serial.printf("Thử kết nối lần %d thất bại. Chờ 1 giây...\n", retries);
    delay(1000);
  }
  if (!clientUpload.connected()) {
    Serial.println("❌ Kết nối đến server thất bại sau 3 lần thử.");
    esp_camera_fb_return(fb);
    return;
  }
  Serial.println("✅ Kết nối server thành công. Đang gửi ảnh...");

  String head = "--" + String(boundary) + "\r\n";
  head += "Content-Disposition: form-data; name=\"image\"; filename=\"";
  head += String(deviceId) + "_" + String(millis()) + ".jpg\"\r\n";
  head += "Content-Type: image/jpeg\r\n\r\n";

  String deviceIdField = "\r\n--" + String(boundary) + "\r\n";
  deviceIdField += "Content-Disposition: form-data; name=\"deviceId\"\r\n\r\n";
  deviceIdField += String(deviceId);

  String tail = "\r\n--" + String(boundary) + "--\r\n";

  size_t imageLen = fb->len;
  size_t totalLen = head.length() + imageLen + deviceIdField.length() + tail.length();

  clientUpload.println("POST " + String(uploadPath) + " HTTP/1.1");
  clientUpload.println("Host: " + String(server));
  clientUpload.println("Content-Length: " + String(totalLen));
  clientUpload.println("Content-Type: multipart/form-data; boundary=" + String(boundary));
  clientUpload.println("Connection: close");
  clientUpload.println();

  clientUpload.print(head);
  clientUpload.write(fb->buf, imageLen);
  clientUpload.print(deviceIdField);
  clientUpload.print(tail);

  esp_camera_fb_return(fb);
  fb = NULL;

  Serial.println("✅ Đã gửi dữ liệu. Chờ phản hồi...");
  unsigned long timeout = millis();
  while (clientUpload.connected() && millis() - timeout < 10000) {
    if (clientUpload.available()) {
      String line = clientUpload.readStringUntil('\n');
      line.trim();
      Serial.println(line);
      timeout = millis();
    }
    delay(10);
  }
  clientUpload.stop();
  Serial.println("Kết nối đã đóng.");
}

// Hàm callback khi nhận lệnh MQTT
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  payload[length] = 0;
  String msg = String((char*)payload);
  if (msg == "capture") {
    Serial.println("Nhận lệnh MQTT: Chụp ảnh ngay!");
    captureAndSend();
    lastCapture = millis();
  } else if (msg.startsWith("interval:")) {
    unsigned long newInterval = msg.substring(9).toInt();
    if (newInterval >= 5000) {
      captureInterval = newInterval;
      Serial.printf("Đã cập nhật tần suất chụp: %lu ms\n", captureInterval);
    }
  }
}

void reconnectMQTT() {
  while (!client.connected()) {
    Serial.print("Đang kết nối MQTT...");
    if (client.connect(deviceId)) {
      client.subscribe(topicCapture);
      Serial.println("OK");
    } else {
      Serial.print("Thất bại, mã lỗi=");
      Serial.print(client.state());
      Serial.println(" thử lại sau 2s");
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(FLASH_LED_PIN, OUTPUT);
  digitalWrite(FLASH_LED_PIN, 0);

  // Cấu hình camera
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  if (psramFound()) {
    config.frame_size = FRAMESIZE_SVGA;
    config.jpeg_quality = 10;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_VGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("❌ Khởi tạo camera thất bại (error 0x%x)\n", err);
    delay(1000);
    ESP.restart();
  }
  Serial.println("✅ Khởi tạo camera thành công");

  // Kết nối WiFi
  WiFi.begin(ssid, password);
  Serial.print("Đang kết nối WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    flashLedState = !flashLedState;
    digitalWrite(FLASH_LED_PIN, flashLedState);
    delay(500);
    Serial.print(".");
  }
  digitalWrite(FLASH_LED_PIN, 0);
  Serial.println();
  Serial.println("✅ Đã kết nối WiFi");
  Serial.print("Địa chỉ IP: ");
  Serial.println(WiFi.localIP());
  Serial.println("Đợi mạng ổn định trong 3 giây...");
  delay(3000);

  // MQTT
  sprintf(topicCapture, "iot/camera/%s/capture", deviceId);
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);
}

void loop() {
  if (!client.connected()) reconnectMQTT();
  client.loop();

  // Chụp ảnh tự động theo tần suất
  if (millis() - lastCapture >= captureInterval) {
    lastCapture = millis();
    Serial.println("Tự động chụp ảnh theo chu kỳ");
    captureAndSend();
  }
  delay(50);
}
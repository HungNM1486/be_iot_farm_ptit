#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// =============== CẤU HÌNH WIFI =================
const char* ssid = "TEN_WIFI_CUA_BAN";     // Thay tên WiFi của bạn
const char* password = "MAT_KHAU_WIFI";    // Thay mật khẩu WiFi của bạn

// =============== CẤU HÌNH MQTT ================
const char* mqtt_server = "103.6.234.189";
const int mqtt_port = 1883;
const char* mqtt_user = "admin";           // Username MQTT
const char* mqtt_password = "admin";       // Password MQTT
const char* deviceId = "ESP32_SENSORS_001"; // ID thiết bị, đổi theo nhu cầu
const char* topic_data = "iot/sensors/data";
const char* topic_status = "iot/sensors/status";
const char* topic_config = "iot/sensors/config";

// =============== CẤU HÌNH CẢM BIẾN =============
#define DHTPIN 4          // Chân kết nối DHT11
#define DHTTYPE DHT11     // Loại cảm biến DHT (DHT11 hoặc DHT22)
#define MQ02_PIN 34       // Chân kết nối cảm biến khí gas MQ02
#define LIGHT_SENSOR_PIN 35 // Chân kết nối cảm biến ánh sáng

// =============== BIẾN TOÀN CỤC ================
WiFiClient espClient;
PubSubClient client(espClient);
DHT dht(DHTPIN, DHTTYPE);

unsigned long lastMsg = 0;
unsigned long sendInterval = 10000; // Mặc định gửi dữ liệu mỗi 10 giây

// Biến cho MQ02
float R0 = 10.0;  // Giá trị R0 ban đầu, sẽ được hiệu chỉnh trong quá trình khởi động
bool isCalibrated = false;

// Hàm kết nối lại MQTT
void reconnect() {
  int attempts = 0;
  while (!client.connected() && attempts < 3) { // Giới hạn số lần thử kết nối liên tiếp
    attempts++;
    Serial.print("Đang kết nối MQTT (lần thử ");
    Serial.print(attempts);
    Serial.print(")...");
    
    // Tạo client ID ngẫu nhiên
    String clientId = "ESP32Client-";
    clientId += String(random(0xffff), HEX);
    
    // Thử kết nối với thông tin xác thực
    if (client.connect(clientId.c_str(), mqtt_user, mqtt_password)) {
      Serial.println("đã kết nối!");
      
      // Đăng ký nhận lệnh cấu hình
      client.subscribe(topic_config);
      
      // Gửi thông báo trạng thái online
      StaticJsonDocument<200> statusDoc;
      statusDoc["status"] = "online";
      statusDoc["device_id"] = deviceId;
      statusDoc["ip"] = WiFi.localIP().toString();
      statusDoc["rssi"] = WiFi.RSSI(); // Thêm cường độ tín hiệu WiFi
      
      char statusBuffer[256];
      serializeJson(statusDoc, statusBuffer);
      client.publish(topic_status, statusBuffer);
    } else {
      Serial.print("thất bại, mã lỗi=");
      Serial.print(client.state());
      Serial.print(" (");
      
      // Giải thích mã lỗi
      switch(client.state()) {
        case -4: Serial.print("MQTT_CONNECTION_TIMEOUT"); break;
        case -3: Serial.print("MQTT_CONNECTION_LOST"); break;
        case -2: Serial.print("MQTT_CONNECT_FAILED"); break;
        case -1: Serial.print("MQTT_DISCONNECTED"); break;
        case 1: Serial.print("MQTT_CONNECT_BAD_PROTOCOL"); break;
        case 2: Serial.print("MQTT_CONNECT_BAD_CLIENT_ID"); break;
        case 3: Serial.print("MQTT_CONNECT_UNAVAILABLE"); break;
        case 4: Serial.print("MQTT_CONNECT_BAD_CREDENTIALS"); break;
        case 5: Serial.print("MQTT_CONNECT_UNAUTHORIZED"); break;
      }
      
      Serial.println(") thử lại sau 5 giây");
      delay(5000);
    }
  }
  
  if (!client.connected()) {
    Serial.println("Không thể kết nối MQTT sau nhiều lần thử. Sẽ thử lại sau.");
  }
}

// Hàm callback khi nhận lệnh MQTT
void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Nhận tin nhắn từ topic: ");
  Serial.println(topic);
  
  // Xử lý tin nhắn cấu hình
  if (String(topic) == topic_config) {
    payload[length] = '\0';
    String message = String((char*)payload);
    Serial.println("Nội dung: " + message);
    
    // Parse JSON
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, message);
    
    if (error) {
      Serial.print("deserializeJson() thất bại: ");
      Serial.println(error.c_str());
      return;
    }
    
    // Cập nhật tần suất gửi dữ liệu nếu có
    if (doc.containsKey("interval")) {
      unsigned long newInterval = doc["interval"];
      if (newInterval >= 5000 && newInterval <= 3600000) { // giới hạn từ 5s đến 1h
        sendInterval = newInterval;
        Serial.printf("Đã cập nhật tần suất gửi dữ liệu: %lu ms\n", sendInterval);
      }
    }
    
    // Hiệu chỉnh lại R0 nếu cần
    if (doc.containsKey("calibrate_mq02") && doc["calibrate_mq02"].as<bool>()) {
      calibrateMQ02();
    }
  }
}

// Hàm hiệu chỉnh cảm biến MQ02
void calibrateMQ02() {
  Serial.println("Bắt đầu hiệu chỉnh cảm biến MQ02...");
  Serial.println("Đảm bảo cảm biến đang ở môi trường không khí sạch.");
  
  // Làm nóng cảm biến
  Serial.println("Làm nóng cảm biến trong 20 giây...");
  delay(20000);
  
  // Đọc giá trị và tính R0
  float rs_air = 0;
  for (int i = 0; i < 10; i++) {
    rs_air += calculateRS(analogRead(MQ02_PIN));
    delay(100);
  }
  rs_air = rs_air / 10.0;
  
  // R0 ở không khí sạch là Rs/9.8 (theo datasheet MQ02)
  R0 = rs_air / 9.8;
  
  Serial.print("Hiệu chỉnh hoàn tất. R0 = ");
  Serial.println(R0);
  isCalibrated = true;
  
  // Thông báo kết quả hiệu chỉnh qua MQTT
  StaticJsonDocument<128> calibDoc;
  calibDoc["status"] = "calibrated";
  calibDoc["device_id"] = deviceId;
  calibDoc["R0"] = R0;
  
  char calibBuffer[128];
  serializeJson(calibDoc, calibBuffer);
  client.publish(topic_status, calibBuffer);
}

// Hàm tính Rs từ giá trị analog
float calculateRS(int analogValue) {
  float voltage = analogValue * (3.3 / 4095.0);
  // Rs = ((Vc/Vout) - 1) * RL
  // Với RL = 10kΩ (điện trở tải), Vc = 3.3V
  float rs = ((3.3 / voltage) - 1.0) * 10.0;
  return rs;
}

// Hàm đọc giá trị cảm biến khí gas MQ02
float readMQ02() {
  int sensorValue = analogRead(MQ02_PIN);
  float rs = calculateRS(sensorValue);
  
  // Nếu chưa hiệu chỉnh, thực hiện hiệu chỉnh
  if (!isCalibrated) {
    calibrateMQ02();
  }
  
  // Tính tỷ lệ Rs/R0
  float ratio = rs / R0;
  
  // Công thức chuyển đổi từ tỷ lệ Rs/R0 sang nồng độ khí (ppm)
  // Công thức: ppm = a * (Rs/R0)^b
  // Với a và b là hằng số từ đường cong đặc tính của cảm biến MQ02
  // Giá trị a=658.08 và b=-2.30 là giá trị gần đúng cho MQ02 đo LPG
  float ppm = 658.08 * pow(ratio, -2.30);
  
  return ppm;
}

// Hàm đọc giá trị cảm biến ánh sáng
float readLightSensor() {
  int sensorValue = analogRead(LIGHT_SENSOR_PIN);
  
  // Chuyển đổi giá trị analog sang cường độ ánh sáng (lux)
  // Công thức này cần được hiệu chỉnh theo cảm biến cụ thể của bạn
  float lightIntensity = map(sensorValue, 0, 4095, 10000, 0); // Đảo ngược vì quang trở giảm điện trở khi có ánh sáng
  
  return lightIntensity;
}

void setup() {
  Serial.begin(115200);
  
  // Khởi tạo các chân cảm biến
  pinMode(MQ02_PIN, INPUT);
  pinMode(LIGHT_SENSOR_PIN, INPUT);
  dht.begin();
  
  // Kết nối WiFi
  Serial.println();
  Serial.print("Đang kết nối tới WiFi ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("");
  Serial.println("WiFi đã kết nối");
  Serial.print("Địa chỉ IP: ");
  Serial.println(WiFi.localIP());
  
  // Cấu hình MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  
  Serial.println("Hệ thống đã sẵn sàng!");
  
  // Hiệu chỉnh cảm biến MQ02
  Serial.println("Đang hiệu chỉnh cảm biến MQ02...");
  calibrateMQ02();
}

void loop() {
  // Kiểm tra kết nối MQTT
  if (!client.connected()) {
    reconnect();
  }
  client.loop();
  
  // Gửi dữ liệu theo chu kỳ
  unsigned long now = millis();
  if (now - lastMsg > sendInterval) {
    lastMsg = now;
    
    // Đọc dữ liệu từ các cảm biến
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();
    float gasValue = readMQ02();
    float lightValue = readLightSensor();
    
    // Kiểm tra dữ liệu hợp lệ từ DHT
    if (isnan(humidity) || isnan(temperature)) {
      Serial.println("Lỗi đọc từ cảm biến DHT!");
      humidity = -1;
      temperature = -1;
    }
    
    // Tạo JSON document
    StaticJsonDocument<256> jsonDoc;
    jsonDoc["device_id"] = deviceId;
    jsonDoc["timestamp"] = now;
    
    if (humidity >= 0) jsonDoc["humidity"] = humidity;
    if (temperature >= 0) jsonDoc["temperature"] = temperature;
    jsonDoc["gas"] = gasValue;
    jsonDoc["light"] = lightValue;
    
    // Chuyển JSON thành chuỗi
    char buffer[256];
    serializeJson(jsonDoc, buffer);
    
    // Gửi dữ liệu lên MQTT broker
    Serial.println("Gửi dữ liệu cảm biến:");
    Serial.println(buffer);
    client.publish(topic_data, buffer);
  }
  
  delay(100);
} 
const mqtt = require("mqtt");

// Cấu hình kết nối
const options = {
  host: "103.6.234.189",
  port: 1883,
  username: "admin",
  password: "admin",
};

const topic = "iot/camera/ESP32CAM_001/capture";

// Kết nối tới MQTT broker
const client = mqtt.connect(options);

client.on("connect", () => {
  console.log("✅ Đã kết nối MQTT");

  // Gửi lệnh chụp ảnh
  client.publish(topic, "capture", {}, (err) => {
    if (!err) console.log("✅ Đã gửi lệnh chụp ảnh");
  });

  // Gửi lệnh thay đổi tần suất (ví dụ 45 giây = 45000 ms)
  client.publish(topic, "interval:60000", {}, (err) => {
    if (!err) console.log("✅ Đã gửi lệnh thay đổi tần suất");

    // Đóng kết nối sau khi gửi xong
    setTimeout(() => {
      client.end();
      console.log("🔌 Đã ngắt kết nối MQTT");
    }, 1000);
  });
});

client.on("error", (err) => {
  console.error("❌ Lỗi MQTT:", err.message);
});

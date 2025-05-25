import * as mqtt from "mqtt";
import dotenv from "dotenv";
import { getCurrentAlertSettings } from "../controllers/sensor.controller";
import Notification from "../models/notification.model";
import mongoose from "mongoose";

dotenv.config();

const MQTT_URL = process.env.MQTT_URL || "mqtt://103.6.234.189:1883";
const client = mqtt.connect(MQTT_URL, {
  username: "admin",
  password: "admin",
});

client.on("connect", () => {
  console.log("Kết nối thành công đến MQTT Broker:", MQTT_URL);
  // Subscribe tới topic cố định
  client.subscribe("iot/sensors/data");
  client.subscribe("iot/sensors/status");
});

client.on("message", async (topic, message) => {
  try {
    if (topic === "iot/sensors/data") {
      const data = JSON.parse(message.toString());
      console.log("Nhận dữ liệu cảm biến:", data);

      console.log("RAW MQTT message received:", topic, message.toString());

      // Kiểm tra ngưỡng cảnh báo
      await checkAlertThresholds(data);
    }
  } catch (error) {
    console.error("Lỗi khi xử lý dữ liệu MQTT:", error);
  }
});

async function checkAlertThresholds(data: any) {
  try {
    const settings = getCurrentAlertSettings();
    let alerts: string[] = [];

    // Kiểm tra nhiệt độ
    if (data.temperature !== undefined) {
      if (data.temperature < settings.temperature_min) {
        alerts.push(
          `Nhiệt độ quá thấp: ${data.temperature}°C (ngưỡng: ${settings.temperature_min}°C)`
        );
      } else if (data.temperature > settings.temperature_max) {
        alerts.push(
          `Nhiệt độ quá cao: ${data.temperature}°C (ngưỡng: ${settings.temperature_max}°C)`
        );
      }
    }

    // Kiểm tra độ ẩm không khí (từ DHT11)
    if (data.humidity !== undefined) {
      if (data.humidity < settings.humidity_min) {
        alerts.push(
          `Độ ẩm không khí quá thấp: ${data.humidity}% (ngưỡng: ${settings.humidity_min}%)`
        );
      } else if (data.humidity > settings.humidity_max) {
        alerts.push(
          `Độ ẩm không khí quá cao: ${data.humidity}% (ngưỡng: ${settings.humidity_max}%)`
        );
      }
    }

    // Kiểm tra ánh sáng
    if (data.light !== undefined) {
      if (data.light < settings.light_intensity_min) {
        alerts.push(
          `Ánh sáng quá thấp: ${data.light} lux (ngưỡng: ${settings.light_intensity_min} lux)`
        );
      } else if (data.light > settings.light_intensity_max) {
        alerts.push(
          `Ánh sáng quá cao: ${data.light} lux (ngưỡng: ${settings.light_intensity_max} lux)`
        );
      }
    }

    // Kiểm tra gas
    if (data.gas !== undefined) {
      if (data.gas < settings.gas_min) {
        alerts.push(
          `Khí gas quá thấp: ${data.gas} ppm (ngưỡng: ${settings.gas_min} ppm)`
        );
      } else if (data.gas > settings.gas_max) {
        alerts.push(
          `Khí gas quá cao: ${data.gas} ppm (ngưỡng: ${settings.gas_max} ppm)`
        );
      }
    }

    // In cảnh báo
    if (alerts.length > 0) {
      // Lưu vào database
      for (const alert of alerts) {
        // Xác định type từ nội dung alert
        let alertType = "sensor_alert";
        if (alert.includes("Nhiệt độ")) alertType = "temperature_alert";
        else if (alert.includes("Độ ẩm")) alertType = "humidity_alert";
        else if (alert.includes("Ánh sáng"))
          alertType = "light_intensity_alert";
        else if (alert.includes("gas")) alertType = "gas_alert";

        await Notification.create({
          type: alertType,
          message: alert,
          locationId: new mongoose.Types.ObjectId(), // Tạo ObjectId giả
          read: false,
          created_at: new Date(),
        });
      }
      console.log(`Đã lưu ${alerts.length} cảnh báo vào database`);
    }
  } catch (error) {
    console.error("Lỗi khi kiểm tra ngưỡng cảnh báo:", error);
  }
}

// Gửi config xuống ESP32
export function sendSensorConfig(locationCode: string, config: any) {
  const topic = `iot/sensors/config`;
  client.publish(topic, JSON.stringify(config));
  console.log(`Đã gửi config tới ${topic}:`, config);
}

export default client;

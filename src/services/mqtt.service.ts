import * as mqtt from "mqtt";
import dotenv from "dotenv";
import { checkAlertThresholds } from "./alert.service";
import AlertSettings from "../models/alertSetting.model";
import Location from "../models/location.model";

dotenv.config();

const MQTT_URL = process.env.MQTT_URL || "mqtt://localhost:1883";
const client = mqtt.connect(MQTT_URL);

client.on("connect", () => {
  console.log("Kết nối thành công đến MQTT Broker:", MQTT_URL);
  client.subscribe("iot/sensors/+/data");
  client.subscribe("iot/sensors/+/status");
  client.subscribe("iot/sensors/+/config");
});

client.on("message", async (topic, message) => {
  try {
    const topicParts = topic.split("/");
    // iot/sensors/{location_code}/data
    if (
      topicParts.length === 5 &&
      topicParts[0] === "iot" &&
      topicParts[1] === "sensors" &&
      topicParts[4] === "data"
    ) {
      const location_code = topicParts[2];
      const data = JSON.parse(message.toString());
      // Tìm locationId từ location_code
      const location = await Location.findOne({ location_code });
      if (!location) {
        console.warn(`Không tìm thấy location với code: ${location_code}`);
        return;
      }
      // Lấy ngưỡng cảnh báo
      const alertSettings = await AlertSettings.findOne({
        locationId: location._id,
      });
      if (alertSettings) {
        // Nhiệt độ
        if (data.temperature !== undefined) {
          const min = (alertSettings as any).temperature_min;
          const max = (alertSettings as any).temperature_max;
          if (
            (min !== undefined && data.temperature < min) ||
            (max !== undefined && data.temperature > max)
          ) {
            await checkAlertThresholds(
              String(location._id),
              "temperature",
              Number(data.temperature),
              undefined
            );
          }
        }
        // Độ ẩm
        if (data.humidity !== undefined) {
          const min = (alertSettings as any).humidity_min;
          const max = (alertSettings as any).humidity_max;
          if (
            (min !== undefined && data.humidity < min) ||
            (max !== undefined && data.humidity > max)
          ) {
            await checkAlertThresholds(
              String(location._id),
              "soil_moisture",
              Number(data.humidity),
              undefined
            );
          }
        }
        // Ánh sáng
        if (data.light !== undefined) {
          const min = (alertSettings as any).light_min;
          const max = (alertSettings as any).light_max;
          if (
            (min !== undefined && data.light < min) ||
            (max !== undefined && data.light > max)
          ) {
            await checkAlertThresholds(
              String(location._id),
              "light_intensity",
              Number(data.light),
              undefined
            );
          }
        }
        // Gas
        if (data.gas !== undefined) {
          const min = (alertSettings as any).gas_min;
          const max = (alertSettings as any).gas_max;
          if (
            (min !== undefined && data.gas < min) ||
            (max !== undefined && data.gas > max)
          ) {
            await checkAlertThresholds(
              String(location._id),
              "gas",
              Number(data.gas),
              undefined
            );
          }
        }
      }
      // Không lưu dữ liệu vào DB!
      console.log(
        `Đã kiểm tra ngưỡng cảnh báo cho location_code: ${location_code}`
      );
    }
    // Có thể xử lý thêm các topic status, config nếu cần
  } catch (error) {
    console.error("Lỗi khi xử lý dữ liệu MQTT:", error);
  }
});

// Hàm gửi config xuống ESP32 qua MQTT
type SensorConfig = { interval?: number; calibrate_mq02?: boolean };
export function sendSensorConfig(location_code: string, config: SensorConfig) {
  const topic = `iot/sensors/${location_code}/config`;
  client.publish(topic, JSON.stringify(config));
  console.log(`Đã gửi config tới ${topic}:`, config);
}

export default client;

import * as mqtt from "mqtt";
import dotenv from "dotenv";
import SensorData from "../models/sensorData.model";
import { checkAlertThresholds } from "./alert.service";
import deviceService from "./device.service";
import locationService from "./location.service";

dotenv.config();

const MQTT_URL = process.env.MQTT_URL || "mqtt://localhost:1883";
const MQTT_PREFIX = process.env.MQTT_PREFIX || "farmPTIT";
const client = mqtt.connect(MQTT_URL);

// Theo dõi trạng thái kết nối
let mqttConnected = false;
const messageQueue: { topic: string; message: any; qos?: number }[] = [];

// Xử lý sự kiện kết nối
client.on("connect", () => {
  console.log("Kết nối thành công đến MQTT Broker:", MQTT_URL);
  mqttConnected = true;

  // Đăng ký các chủ đề
  client.subscribe(`${MQTT_PREFIX}/device/+/data`);
  client.subscribe(`${MQTT_PREFIX}/device/+/status`);
  client.subscribe(`${MQTT_PREFIX}/location/+/+`);

  // Bắt đầu quy trình thử lại cấu hình
  startConfigRetryProcess();

  // Gửi các tin nhắn trong hàng đợi
  if (messageQueue.length > 0) {
    console.log(`Đang gửi ${messageQueue.length} tin nhắn từ hàng đợi`);

    for (const item of messageQueue) {
      client.publish(item.topic, JSON.stringify(item.message));
    }

    // Xóa hàng đợi sau khi gửi
    messageQueue.length = 0;
  }
});

// Xử lý sự kiện mất kết nối
client.on("disconnect", () => {
  console.log("Mất kết nối đến MQTT Broker");
  mqttConnected = false;
});

client.on("error", (error) => {
  console.error("Lỗi MQTT:", error);
});

client.on("reconnect", () => {
  console.log("Đang kết nối lại đến MQTT Broker...");
});

interface PendingConfig {
  deviceId: string;
  config: any;
  attempts: number;
  maxAttempts: number;
  nextAttempt: Date;
}

const pendingConfigs: Map<string, PendingConfig> = new Map();

// Thêm hàm xử lý thử lại
function startConfigRetryProcess() {
  setInterval(() => {
    const now = new Date();

    pendingConfigs.forEach((pendingConfig, deviceId) => {
      // Kiểm tra xem đã đến thời gian thử lại chưa
      if (now >= pendingConfig.nextAttempt) {
        // Kiểm tra xem thiết bị có online không
        deviceService
          .getDeviceById(deviceId)
          .then((device) => {
            if (device && device.status === "Hoạt động") {
              // Thiết bị online, đánh dấu cấu hình đã xử lý
              console.log(
                `Thiết bị ${deviceId} đã online, xóa khỏi hàng đợi cấu hình chờ`
              );
              pendingConfigs.delete(deviceId);
            } else if (pendingConfig.attempts < pendingConfig.maxAttempts) {
              // Thử lại
              console.log(
                `Thử lại gửi cấu hình lần ${pendingConfig.attempts + 1}/${
                  pendingConfig.maxAttempts
                } cho thiết bị ${deviceId}`
              );
              client.publish(
                `${MQTT_PREFIX}/device/${deviceId}/config`,
                JSON.stringify(pendingConfig.config)
              );

              // Tăng số lần thử và cập nhật thời gian thử lại tiếp theo (tăng gấp đôi thời gian)
              const nextDelay = Math.min(
                60000 * Math.pow(2, pendingConfig.attempts),
                24 * 60 * 60 * 1000
              ); // Tối đa 1 ngày
              pendingConfig.attempts += 1;
              pendingConfig.nextAttempt = new Date(Date.now() + nextDelay);
              pendingConfigs.set(deviceId, pendingConfig);
            } else {
              // Đã vượt quá số lần thử
              console.log(
                `Đã vượt quá số lần thử gửi cấu hình cho thiết bị ${deviceId}`
              );
              pendingConfigs.delete(deviceId);
            }
          })
          .catch((error) => {
            console.error(
              `Lỗi khi kiểm tra trạng thái thiết bị ${deviceId}:`,
              error
            );
          });
      }
    });
  }, 60000); // Kiểm tra mỗi phút
}

const SENSOR_VALID_RANGES = {
  temperature: { min: -10, max: 60 }, // Độ C
  soil_moisture: { min: 0, max: 100 }, // %
  light_intensity: { min: 0, max: 150000 }, // Lux
};

// Kiểm tra giá trị cảm biến có hợp lệ không
function isValidSensorData(type: string, value: number): boolean {
  if (typeof value !== "number" || isNaN(value)) {
    return false;
  }

  const range = SENSOR_VALID_RANGES[type];
  if (!range) return true; // Không có phạm vi xác định, coi là hợp lệ

  return value >= range.min && value <= range.max;
}

client.on("connect", () => {
  console.log("Kết nối thành công đến MQTT Broker");

  client.subscribe(`${MQTT_PREFIX}/device/+/data`);
  client.subscribe(`${MQTT_PREFIX}/device/+/status`);

  // Đăng ký nhận dữ liệu từ tất cả vị trí (để tương thích ngược)
  client.subscribe(`${MQTT_PREFIX}/location/+/+`);

  startConfigRetryProcess();
});

client.on("message", async (topic, message) => {
  try {
    console.log(`Nhận message MQTT: ${topic}`);
    const topicParts = topic.split("/");

    // Xử lý dữ liệu từ thiết bị
    if (topicParts[0] === MQTT_PREFIX && topicParts[1] === "device") {
      const deviceId = topicParts[2];
      const messageType = topicParts[3]; // data, status, etc.

      // Lấy thiết bị từ cơ sở dữ liệu
      const device = await deviceService.getDeviceById(deviceId);

      if (!device) {
        console.log(`Thiết bị không tìm thấy trong hệ thống: ${deviceId}`);
        // Có thể gửi thông báo cấu hình cho thiết bị mới
        return;
      }

      // Cập nhật trạng thái thiết bị
      if (messageType === "status") {
        const statusData = JSON.parse(message.toString());
        await deviceService.updateDeviceStatus(
          deviceId,
          statusData.status,
          statusData.battery_level
        );
        console.log(
          `Cập nhật trạng thái thiết bị ${deviceId}: ${statusData.status}`
        );
        return;
      }

      // Xử lý dữ liệu cảm biến
      if (messageType === "data") {
        // Nếu thiết bị chưa được gán cho location nào
        if (!device.locationId) {
          console.log(`Thiết bị ${deviceId} chưa được gán cho vị trí nào`);
          return;
        }

        const data = JSON.parse(message.toString());

        // Kiểm tra và lọc dữ liệu không hợp lệ
        let validData = true;
        const sanitizedData: any = {};

        if (data.temperature !== undefined) {
          if (isValidSensorData("temperature", data.temperature)) {
            sanitizedData.temperature = data.temperature;
          } else {
            console.warn(
              `Nhiệt độ không hợp lệ từ thiết bị ${deviceId}: ${data.temperature}`
            );
            validData = false;
          }
        }

        if (data.humidity !== undefined) {
          if (isValidSensorData("soil_moisture", data.humidity)) {
            sanitizedData.soil_moisture = data.humidity;
          } else {
            console.warn(
              `Độ ẩm không hợp lệ từ thiết bị ${deviceId}: ${data.humidity}`
            );
            validData = false;
          }
        }

        if (data.light !== undefined) {
          if (isValidSensorData("light_intensity", data.light)) {
            sanitizedData.light_intensity = data.light;
          } else {
            console.warn(
              `Cường độ ánh sáng không hợp lệ từ thiết bị ${deviceId}: ${data.light}`
            );
            validData = false;
          }
        }

        // Nếu có ít nhất một giá trị hợp lệ thì lưu vào DB
        if (Object.keys(sanitizedData).length > 0) {
          // Lưu dữ liệu vào cơ sở dữ liệu
          const sensorData = new SensorData({
            locationId: device.locationId,
            deviceId: deviceId,
            ...sanitizedData,
            recorded_at: new Date(),
            created_at: new Date(),
          });

          const savedData = await sensorData.save();

          // Lấy location để chuyển tiếp dữ liệu
          const location = await locationService.getLocationById(
            device.locationId
          );

          if (location && location.location_code) {
            // Chuyển tiếp dữ liệu đến topic vị trí
            const forwardData = {
              ...data,
              device_id: deviceId,
              timestamp: new Date().toISOString(),
              data_id: savedData._id.toString(),
            };

            client.publish(
              `${MQTT_PREFIX}/location/${location.location_code}/data`,
              JSON.stringify(forwardData)
            );
          }

          // Kiểm tra ngưỡng cảnh báo
          if (data.temperature !== undefined) {
            await checkAlertThresholds(
              String(device.locationId),
              "temperature",
              Number(data.temperature),
              savedData._id.toString()
            );
          }

          if (data.humidity !== undefined) {
            await checkAlertThresholds(
              String(device.locationId),
              "soil_moisture",
              Number(data.humidity),
              savedData._id.toString()
            );
          }

          if (data.light !== undefined) {
            await checkAlertThresholds(
              String(device.locationId),
              "light_intensity",
              Number(data.light),
              savedData._id.toString()
            );
          }

          console.log(
            `Đã lưu dữ liệu từ thiết bị ${deviceId} cho vị trí ${device.locationId}`
          );
          return;
        }
      }
    }

    // Xử lý cho định dạng topic cũ (để tương thích ngược)
    if (topicParts[0] === MQTT_PREFIX && topicParts[1] === "location") {
      const locationCode = topicParts[2];
      const sensorType = topicParts[3];

      console.log(`Nhận dữ liệu cũ: ${locationCode}/${sensorType}`);

      // TODO: Xử lý dữ liệu theo định dạng cũ nếu cần
    }
  } catch (error) {
    console.error("Lỗi khi xử lý dữ liệu MQTT:", error);
  }
});

// Thay đổi hàm sendDeviceConfig để hỗ trợ hàng đợi khi mất kết nối
export const sendDeviceConfig = async (
  deviceId: string,
  config: any,
  maxAttempts = 5
): Promise<boolean> => {
  try {
    const topic = `${MQTT_PREFIX}/device/${deviceId}/config`;

    if (mqttConnected) {
      client.publish(topic, JSON.stringify(config));
      console.log(`Đã gửi cấu hình đến thiết bị ${deviceId}`);
    } else {
      console.log(
        `MQTT không kết nối, đưa cấu hình cho thiết bị ${deviceId} vào hàng đợi`
      );
      messageQueue.push({
        topic,
        message: config,
        qos: 1, // Đảm bảo tin nhắn được gửi ít nhất một lần
      });
    }

    // Vẫn lưu vào danh sách chờ để theo dõi
    pendingConfigs.set(deviceId, {
      deviceId,
      config,
      attempts: 1,
      maxAttempts,
      nextAttempt: new Date(Date.now() + 60000),
    });

    return true;
  } catch (error) {
    console.error(`Lỗi khi gửi cấu hình đến thiết bị ${deviceId}:`, error);
    return false;
  }
};

export default client;

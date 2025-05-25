import { Request, Response } from "express";

// Cấu hình cứng cho 1 ESP32
const GLOBAL_LOCATION_CODE = "khu-a-285"; // Hardcode location code
let globalAlertSettings = {
  temperature_min: 15,
  temperature_max: 35,
  humidity_min: 30,
  humidity_max: 80,
  light_intensity_min: 300,
  light_intensity_max: 800,
  gas_min: 0,
  gas_max: 1000,
};

// Lấy cài đặt global
export const getGlobalAlertSettings = async (req: Request, res: Response) => {
  try {
    res.status(200).json({
      success: true,
      data: globalAlertSettings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Lỗi khi lấy cài đặt",
    });
  }
};

// Cập nhật cài đặt global
export const updateGlobalAlertSettings = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      temperature_min,
      temperature_max,
      humidity_min,
      humidity_max,
      light_intensity_min,
      light_intensity_max,
      gas_min,
      gas_max,
    } = req.body;

    // Cập nhật cài đặt
    globalAlertSettings = {
      temperature_min: temperature_min ?? globalAlertSettings.temperature_min,
      temperature_max: temperature_max ?? globalAlertSettings.temperature_max,
      humidity_min: humidity_min ?? globalAlertSettings.humidity_min,
      humidity_max: humidity_max ?? globalAlertSettings.humidity_max,
      light_intensity_min:
        light_intensity_min ?? globalAlertSettings.light_intensity_min,
      light_intensity_max:
        light_intensity_max ?? globalAlertSettings.light_intensity_max,
      gas_min: gas_min ?? globalAlertSettings.gas_min,
      gas_max: gas_max ?? globalAlertSettings.gas_max,
    };

    console.log("Updated global alert settings:", globalAlertSettings);

    res.status(200).json({
      success: true,
      data: globalAlertSettings,
      message: "Đã cập nhật cài đặt cảnh báo",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Lỗi khi cập nhật cài đặt",
    });
  }
};

// Gửi config xuống ESP32
export const sendConfigToEsp32 = async (req: Request, res: Response) => {
  try {
    const config = req.body;

    // Import MQTT service để gửi config
    const { sendSensorConfig } = await import("../services/mqtt.service");
    sendSensorConfig(GLOBAL_LOCATION_CODE, config);

    res.status(200).json({
      success: true,
      message: "Đã gửi config tới ESP32",
      config,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Lỗi khi gửi config",
    });
  }
};

// Export cài đặt để sử dụng trong MQTT service
export const getCurrentAlertSettings = () => globalAlertSettings;

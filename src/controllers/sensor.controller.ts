import { Request, Response } from "express";
import AlertSettings from "../models/alertSetting.model";
import { sendSensorConfig } from "../services/mqtt.service";

// Lấy ngưỡng cảnh báo của location
export const getAlertSettings = async (req: Request, res: Response) => {
  try {
    const { locationId } = req.params;
    const settings = await AlertSettings.findOne({ locationId });
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy ngưỡng cảnh báo cho vị trí này",
      });
    }
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Lỗi khi lấy ngưỡng cảnh báo",
    });
  }
};

// Cập nhật ngưỡng cảnh báo của location
export const updateAlertSettings = async (req: Request, res: Response) => {
  try {
    const { locationId } = req.params;
    const update = req.body;
    let settings = await AlertSettings.findOne({ locationId });
    if (!settings) {
      settings = new AlertSettings({ locationId, ...update });
    } else {
      Object.assign(settings, update);
    }
    await settings.save();
    res.status(200).json({
      success: true,
      data: settings,
      message: "Đã cập nhật ngưỡng cảnh báo",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Lỗi khi cập nhật ngưỡng cảnh báo",
    });
  }
};

// Gửi config xuống ESP32 qua MQTT
type SensorConfig = { interval?: number; calibrate_mq02?: boolean };
export const sendConfigToEsp32 = async (req: Request, res: Response) => {
  try {
    const { location_code } = req.params;
    const config: SensorConfig = req.body;
    sendSensorConfig(location_code, config);
    res
      .status(200)
      .json({ success: true, message: "Đã gửi config tới ESP32", config });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Lỗi khi gửi config",
    });
  }
};

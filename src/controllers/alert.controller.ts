// src/controllers/alert.controller.ts
import { Request, Response } from "express";
import AlertSettings from "../models/alertSetting.model";

// Lấy cài đặt cảnh báo của vị trí
export const getAlertSettings = async (req: Request, res: Response) => {
  try {
    const { locationId } = req.params;

    const settings = await AlertSettings.findOne({ locationId });

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cài đặt cảnh báo cho vị trí này",
      });
    }

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Lỗi khi lấy cài đặt cảnh báo",
    });
  }
};

// Cập nhật cài đặt cảnh báo
export const updateAlertSettings = async (req: Request, res: Response) => {
  try {
    const { locationId } = req.params;
    const {
      temperature_min,
      temperature_max,
      soil_moisture_min,
      soil_moisture_max,
      light_intensity_min,
      light_intensity_max,
    } = req.body;

    // Tìm và cập nhật cài đặt
    let settings = await AlertSettings.findOne({ locationId });

    if (!settings) {
      // Tạo mới nếu chưa có
      settings = new AlertSettings({
        locationId,
        temperature_min: temperature_min !== undefined ? temperature_min : 15,
        temperature_max: temperature_max !== undefined ? temperature_max : 35,
        soil_moisture_min:
          soil_moisture_min !== undefined ? soil_moisture_min : 30,
        soil_moisture_max:
          soil_moisture_max !== undefined ? soil_moisture_max : 80,
        light_intensity_min:
          light_intensity_min !== undefined ? light_intensity_min : 300,
        light_intensity_max:
          light_intensity_max !== undefined ? light_intensity_max : 800,
        updated_at: new Date(),
      });
    } else {
      // Cập nhật nếu đã tồn tại
      if (temperature_min !== undefined)
        settings.temperature_min = temperature_min;
      if (temperature_max !== undefined)
        settings.temperature_max = temperature_max;
      if (soil_moisture_min !== undefined)
        settings.soil_moisture_min = soil_moisture_min;
      if (soil_moisture_max !== undefined)
        settings.soil_moisture_max = soil_moisture_max;
      if (light_intensity_min !== undefined)
        settings.light_intensity_min = light_intensity_min;
      if (light_intensity_max !== undefined)
        settings.light_intensity_max = light_intensity_max;
      settings.updated_at = new Date();
    }

    await settings.save();

    res.status(200).json({
      success: true,
      data: settings,
      message: "Đã cập nhật cài đặt cảnh báo",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Lỗi khi cập nhật cài đặt cảnh báo",
    });
  }
};

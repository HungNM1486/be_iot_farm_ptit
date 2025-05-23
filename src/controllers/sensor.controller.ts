import { Request, Response } from "express";
import SensorData from "../models/sensorData.model";
import SensorSettings from "../models/sensorSetting.model";

// Lấy dữ liệu cảm biến của vị trí
export const getSensorData = async (req: Request, res: Response) => {
  try {
    const { locationId, from, to, limit } = req.query;

    if (!locationId) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp locationId",
      });
    }

    // Xây dựng query
    const query: any = { locationId };

    // Thêm điều kiện ngày nếu có
    if (from || to) {
      query.recorded_at = {};
      if (from) query.recorded_at.$gte = new Date(from as string);
      if (to) query.recorded_at.$lte = new Date(to as string);
    }

    // Lấy dữ liệu từ cơ sở dữ liệu
    const data = await SensorData.find(query)
      .sort({ recorded_at: -1 })
      .limit(limit ? parseInt(limit as string) : 100);

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Lỗi khi lấy dữ liệu cảm biến",
    });
  }
};

// Lấy cài đặt cảm biến của vị trí
export const getSensorSettings = async (req: Request, res: Response) => {
  try {
    const { locationId } = req.params;

    const settings = await SensorSettings.findOne({ locationId });

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cài đặt cảm biến cho vị trí này",
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
        error instanceof Error ? error.message : "Lỗi khi lấy cài đặt cảm biến",
    });
  }
};

// Cập nhật cài đặt cảm biến
export const updateSensorSettings = async (req: Request, res: Response) => {
  try {
    const { locationId } = req.params;
    const { frequency, is_active } = req.body;

    // Tìm và cập nhật cài đặt
    let settings = await SensorSettings.findOne({ locationId });

    if (!settings) {
      // Tạo mới nếu chưa có
      settings = new SensorSettings({
        locationId,
        frequency: frequency || 15,
        is_active: is_active !== undefined ? is_active : true,
        last_updated: new Date(),
        updated_at: new Date(),
      });
    } else {
      // Cập nhật nếu đã tồn tại
      if (frequency !== undefined) settings.frequency = frequency;
      if (is_active !== undefined) settings.is_active = is_active;
      settings.last_updated = new Date();
      settings.updated_at = new Date();
    }

    await settings.save();

    res.status(200).json({
      success: true,
      data: settings,
      message: "Đã cập nhật cài đặt cảm biến",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Lỗi khi cập nhật cài đặt cảm biến",
    });
  }
};

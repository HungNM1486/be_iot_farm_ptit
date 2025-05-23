// src/controllers/device.controller.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import deviceService from "../services/device.service";
import locationService from "../services/location.service";

export const registerDevice = async (req: Request, res: Response) => {
  try {
    const { name, type, deviceId, sensors, firmware_version } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!name || !deviceId || !sensors || !Array.isArray(sensors)) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp tên, ID thiết bị và danh sách cảm biến",
      });
    }

    const device = await deviceService.registerDevice({
      name,
      type: type || "Custom",
      deviceId,
      sensors,
      firmware_version,
      registeredBy: new mongoose.Types.ObjectId(userId),
    });

    return res.status(201).json({
      success: true,
      message: "Đăng ký thiết bị thành công",
      data: device,
    });
  } catch (error) {
    console.error("Error registering device:", error);
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Lỗi khi đăng ký thiết bị",
    });
  }
};

export const assignDevice = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.body;
    const { locationId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!deviceId || !mongoose.Types.ObjectId.isValid(locationId)) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp ID thiết bị và ID vị trí hợp lệ",
      });
    }

    // Kiểm tra location có thuộc season không
    const location = await locationService.getLocationById(
      new mongoose.Types.ObjectId(locationId)
    );
    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy vị trí",
      });
    }

    if (location.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền truy cập vị trí này",
      });
    }

    // Kiểm tra thiết bị
    const existingDevice = await deviceService.getDeviceById(deviceId);
    if (!existingDevice) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thiết bị",
      });
    }

    // Nếu thiết bị đã gán cho location khác, kiểm tra quyền
    if (existingDevice.locationId) {
      const existingLocation = await locationService.getLocationById(
        existingDevice.locationId
      );
      if (existingLocation) {
        if (existingLocation.userId.toString() !== userId) {
          return res.status(403).json({
            success: false,
            message: "Thiết bị đã được gán cho location của người dùng khác",
          });
        }
      }
    }

    // Gán thiết bị
    const device = await deviceService.assignDeviceToLocation(
      deviceId,
      new mongoose.Types.ObjectId(locationId)
    );

    return res.status(200).json({
      success: true,
      message: "Gán thiết bị vào vị trí thành công",
      data: device,
    });
  } catch (error) {
    console.error("Error assigning device:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Lỗi khi gán thiết bị",
    });
  }
};

export const removeDevice = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Kiểm tra thiết bị
    const existingDevice = await deviceService.getDeviceById(deviceId);
    if (!existingDevice) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thiết bị",
      });
    }

    // Kiểm tra quyền quản lý thiết bị
    if (existingDevice.locationId) {
      const location = await locationService.getLocationById(
        existingDevice.locationId
      );
      if (location) {
        if (location.userId.toString() !== userId) {
          return res.status(403).json({
            success: false,
            message: "Bạn không có quyền quản lý thiết bị này",
          });
        }
      }
    }

    // Gỡ thiết bị
    const device = await deviceService.removeDeviceFromLocation(deviceId);

    return res.status(200).json({
      success: true,
      message: "Gỡ thiết bị khỏi vị trí thành công",
      data: device,
    });
  } catch (error) {
    console.error("Error removing device:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Lỗi khi gỡ thiết bị",
    });
  }
};

export const getUserDevices = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const devices = await deviceService.getUserDevices(
      new mongoose.Types.ObjectId(userId)
    );

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách thiết bị thành công",
      data: devices,
    });
  } catch (error) {
    console.error("Error getting user devices:", error);
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Lỗi khi lấy danh sách thiết bị",
    });
  }
};

export const getLocationDevices = async (req: Request, res: Response) => {
  try {
    const { locationId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(locationId)) {
      return res.status(400).json({
        success: false,
        message: "ID vị trí không hợp lệ",
      });
    }

    // Kiểm tra location có thuộc season không
    const location = await locationService.getLocationById(
      new mongoose.Types.ObjectId(locationId)
    );
    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy vị trí",
      });
    }

    if (location.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền truy cập vị trí này",
      });
    }

    // Lấy danh sách thiết bị
    const devices = await deviceService.getDevicesByLocationId(
      new mongoose.Types.ObjectId(locationId)
    );

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách thiết bị thành công",
      data: devices,
    });
  } catch (error) {
    console.error("Error getting location devices:", error);
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Lỗi khi lấy danh sách thiết bị",
    });
  }
};

export const updateDeviceSettings = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const { settings } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Kiểm tra thiết bị
    const existingDevice = await deviceService.getDeviceById(deviceId);
    if (!existingDevice) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thiết bị",
      });
    }

    // Kiểm tra quyền quản lý thiết bị
    if (existingDevice.locationId) {
      const location = await locationService.getLocationById(
        existingDevice.locationId
      );
      if (location) {
        if (location.userId.toString() !== userId) {
          return res.status(403).json({
            success: false,
            message: "Bạn không có quyền quản lý thiết bị này",
          });
        }
      }
    }

    // Cập nhật cài đặt
    const device = await deviceService.updateDeviceSettings(deviceId, settings);

    return res.status(200).json({
      success: true,
      message: "Cập nhật cài đặt thiết bị thành công",
      data: device,
    });
  } catch (error) {
    console.error("Error updating device settings:", error);
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Lỗi khi cập nhật cài đặt thiết bị",
    });
  }
};

export const deleteDeviceById = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Kiểm tra thiết bị
    const existingDevice = await deviceService.getDeviceById(deviceId);
    if (!existingDevice) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thiết bị",
      });
    }

    // Kiểm tra quyền quản lý thiết bị
    if (existingDevice.locationId) {
      const location = await locationService.getLocationById(
        existingDevice.locationId
      );
      if (location) {
        if (location.userId.toString() !== userId) {
          return res.status(403).json({
            success: false,
            message: "Bạn không có quyền xóa thiết bị này",
          });
        }
      }
    }

    // Xóa thiết bị
    const result = await deviceService.deleteDevice(deviceId);

    return res.status(200).json({
      success: true,
      message: "Xóa thiết bị thành công",
    });
  } catch (error) {
    console.error("Error deleting device:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Lỗi khi xóa thiết bị",
    });
  }
};

export const generateDeviceQR = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Kiểm tra thiết bị
    const device = await deviceService.getDeviceById(deviceId);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thiết bị",
      });
    }

    // Tạo dữ liệu QR code
    const qrData = {
      deviceId: device.deviceId,
      mqttServer: process.env.MQTT_URL || "mqtt://localhost:1883",
      apiEndpoint: process.env.API_URL || "http://localhost:3000",
      timestamp: new Date().toISOString(),
    };

    // Tạo QR code dạng base64
    const QRCode = require("qrcode");
    const qrImageBase64 = await QRCode.toDataURL(JSON.stringify(qrData));

    return res.status(200).json({
      success: true,
      message: "Tạo QR code thành công",
      data: {
        qrCode: qrImageBase64,
        deviceInfo: device,
      },
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Lỗi khi tạo QR code",
    });
  }
};

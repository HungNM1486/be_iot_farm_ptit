import mongoose from "mongoose";
import Device, { IDevice } from "../models/device.model";
import Location from "../models/location.model";
import { sendDeviceConfig } from "./mqtt.service";

class DeviceService {
  async registerDevice(data: {
    name: string;
    type: string;
    deviceId: string;
    sensors: string[];
    firmware_version?: string;
    registeredBy: mongoose.Types.ObjectId; // Thêm parameter này
  }): Promise<IDevice> {
    try {
      // Kiểm tra xem thiết bị đã tồn tại chưa
      const existingDevice = await Device.findOne({ deviceId: data.deviceId });
      if (existingDevice) {
        throw new Error("Thiết bị với ID này đã tồn tại");
      }

      // Tạo thiết bị mới với registeredBy
      const device = new Device({
        name: data.name,
        type: data.type,
        deviceId: data.deviceId,
        sensors: data.sensors,
        firmware_version: data.firmware_version || "1.0.0",
        registeredBy: data.registeredBy, // Lưu userId
        created_at: new Date(),
        updated_at: new Date(),
      });

      return await device.save();
    } catch (error) {
      throw error;
    }
  }

  // Gỡ thiết bị khỏi location
  async removeDeviceFromLocation(deviceId: string): Promise<IDevice | null> {
    try {
      // Cập nhật thiết bị
      const device = await Device.findOneAndUpdate(
        { deviceId },
        {
          locationId: null,
          status: "Không hoạt động",
          updated_at: new Date(),
        },
        { new: true }
      );

      return device;
    } catch (error) {
      throw error;
    }
  }

  // Lấy tất cả thiết bị của người dùng
  async getUserDevices(userId: mongoose.Types.ObjectId): Promise<IDevice[]> {
    try {
      // Tìm tất cả locations của user
      const locations = await Location.find({ userId });
      const locationIds = locations.map((location) => location._id);

      // Tìm thiết bị user đã đăng ký HOẶC đã được gán cho locations của user
      return await Device.find({
        $or: [{ registeredBy: userId }, { locationId: { $in: locationIds } }],
      });
    } catch (error) {
      throw error;
    }
  }

  // Lấy thiết bị theo ID
  async getDeviceById(deviceId: string): Promise<IDevice | null> {
    try {
      return await Device.findOne({ deviceId });
    } catch (error) {
      throw error;
    }
  }

  // Lấy thiết bị theo location
  async getDevicesByLocationId(
    locationId: mongoose.Types.ObjectId
  ): Promise<IDevice[]> {
    try {
      return await Device.find({ locationId });
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật trạng thái thiết bị (online/offline/pin yếu)
  async updateDeviceStatus(
    deviceId: string,
    status: string,
    batteryLevel?: number
  ): Promise<IDevice | null> {
    try {
      const updateData: any = {
        status,
        last_active: new Date(),
        last_seen: new Date(),
        updated_at: new Date(),
      };

      if (batteryLevel !== undefined) {
        updateData.battery_level = batteryLevel;
      }

      return await Device.findOneAndUpdate({ deviceId }, updateData, {
        new: true,
      });
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật cài đặt thiết bị
  async updateDeviceSettings(
    deviceId: string,
    settings: any
  ): Promise<IDevice | null> {
    try {
      return await Device.findOneAndUpdate(
        { deviceId },
        {
          settings,
          updated_at: new Date(),
        },
        { new: true }
      );
    } catch (error) {
      throw error;
    }
  }

  // Xóa thiết bị
  async deleteDevice(deviceId: string): Promise<boolean> {
    try {
      const result = await Device.findOneAndDelete({ deviceId });
      return result !== null;
    } catch (error) {
      throw error;
    }
  }

  // Gán thiết bị vào vị trí
  async assignDeviceToLocation(
    deviceId: string,
    locationId: mongoose.Types.ObjectId
  ): Promise<IDevice | null> {
    try {
      // Kiểm tra location có tồn tại không
      const location = await Location.findById(locationId);
      if (!location) {
        throw new Error("Không tìm thấy vị trí");
      }

      // Cập nhật thiết bị
      const device = await Device.findOneAndUpdate(
        { deviceId },
        {
          locationId,
          status: "Hoạt động",
          updated_at: new Date(),
        },
        { new: true }
      );

      if (device) {
        // Gửi cấu hình đến thiết bị qua MQTT
        const config = {
          location_id: locationId.toString(),
          location_code: location.location_code,
          device_id: deviceId,
          update_time: new Date().toISOString(),
        };

        await sendDeviceConfig(deviceId, config);
      }

      return device;
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật thời gian thiết bị được nhìn thấy gần nhất
  async updateDeviceLastSeen(deviceId: string): Promise<IDevice | null> {
    try {
      return await Device.findOneAndUpdate(
        { deviceId },
        {
          last_seen: new Date(),
          updated_at: new Date(),
        },
        { new: true }
      );
    } catch (error) {
      throw error;
    }
  }
}

export default new DeviceService();

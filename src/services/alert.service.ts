// src/services/alert.service.ts
import AlertSettings from "../models/alertSetting.model";
import Notification from "../models/notification.model";
import mongoose from "mongoose";
import User from "../models/user.model";
import Location from "../models/location.model";

export async function checkAlertThresholds(
  locationId: string,
  sensorType: string,
  value: number,
  sensorDataId: mongoose.Types.ObjectId | string
) {
  try {
    // Tìm cài đặt cảnh báo cho vị trí
    const alertSettings = await AlertSettings.findOne({ locationId });

    if (!alertSettings) {
      console.log(`Không tìm thấy cài đặt cảnh báo cho vị trí ${locationId}`);
      return;
    }

    let isAlert = false;
    let alertMessage = "";

    // Kiểm tra dựa trên loại cảm biến
    switch (sensorType) {
      case "temperature": {
        const min = alertSettings.temperature_min;
        const max = alertSettings.temperature_max;
        if (min !== undefined && min !== null && value < min) {
          isAlert = true;
          alertMessage = `Nhiệt độ quá thấp: ${value}°C (ngưỡng: ${min}°C)`;
        } else if (max !== undefined && max !== null && value > max) {
          isAlert = true;
          alertMessage = `Nhiệt độ quá cao: ${value}°C (ngưỡng: ${max}°C)`;
        }
        break;
      }
      case "soil_moisture": {
        const min = alertSettings.soil_moisture_min;
        const max = alertSettings.soil_moisture_max;
        if (min !== undefined && min !== null && value < min) {
          isAlert = true;
          alertMessage = `Độ ẩm đất quá thấp: ${value}% (ngưỡng: ${min}%)`;
        } else if (max !== undefined && max !== null && value > max) {
          isAlert = true;
          alertMessage = `Độ ẩm đất quá cao: ${value}% (ngưỡng: ${max}%)`;
        }
        break;
      }
      case "light_intensity": {
        const min = alertSettings.light_intensity_min;
        const max = alertSettings.light_intensity_max;
        if (min !== undefined && min !== null && value < min) {
          isAlert = true;
          alertMessage = `Cường độ ánh sáng quá thấp: ${value} lux (ngưỡng: ${min} lux)`;
        } else if (max !== undefined && max !== null && value > max) {
          isAlert = true;
          alertMessage = `Cường độ ánh sáng quá cao: ${value} lux (ngưỡng: ${max} lux)`;
        }
        break;
      }
      case "gas": {
        const min = alertSettings.gas_min;
        const max = alertSettings.gas_max;
        if (min !== undefined && min !== null && value < min) {
          isAlert = true;
          alertMessage = `Nồng độ khí gas quá thấp: ${value} (ngưỡng: ${min})`;
        } else if (max !== undefined && max !== null && value > max) {
          isAlert = true;
          alertMessage = `Nồng độ khí gas quá cao: ${value} (ngưỡng: ${max})`;
        }
        break;
      }
    }

    // Tạo thông báo nếu vượt ngưỡng
    if (isAlert) {
      const notification = new Notification({
        type: `${sensorType}_alert`,
        message: alertMessage,
        locationId,
        sensorDataId,
        read: false,
        created_at: new Date(),
      });

      await notification.save();
      console.log(`Đã tạo cảnh báo: ${alertMessage}`);

      // Gửi thông báo (push notification, email)
      await sendAlert(alertMessage, locationId);
    }
  } catch (error) {
    console.error("Lỗi khi kiểm tra ngưỡng cảnh báo:", error);
  }
}

async function sendAlert(message: string, locationId: string) {
  try {
    // Tìm location để lấy thông tin user
    const location = await Location.findById(locationId);
    if (!location) {
      console.error(`Không tìm thấy vị trí ${locationId}`);
      return;
    }

    // Tìm user để lấy email (giả sử location có userId)
    const user = await User.findById(location.userId);
    if (!user) {
      console.error(`Không tìm thấy người dùng của vị trí ${locationId}`);
      return;
    }

    console.log(
      `Đã gửi cảnh báo "${message}" cho vị trí ${locationId} đến ${user.email}`
    );
  } catch (error) {
    console.error("Lỗi khi gửi cảnh báo:", error);
  }
}

/**
 * Lấy các thông báo chưa đọc
 */
export async function getUnreadNotifications(userId: string) {
  try {
    // Tìm tất cả thông báo chưa đọc, có thể thêm logic phân quyền nếu cần
    const notifications = await Notification.find({ read: false })
      .sort({ created_at: -1 })
      .limit(50); // Giới hạn số lượng
    return notifications;
  } catch (error) {
    console.error("Lỗi khi lấy thông báo chưa đọc:", error);
    throw error;
  }
}

// thông báo đã đọc
export async function markNotificationAsRead(notificationId: string) {
  try {
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      {
        read: true,
        read_at: new Date(),
      },
      { new: true }
    );

    return notification;
  } catch (error) {
    console.error("Lỗi khi đánh dấu thông báo đã đọc:", error);
    throw error;
  }
}

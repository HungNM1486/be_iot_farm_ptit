import { Request, Response } from "express";
import Notification from "../models/notification.model";
import {
  getUnreadNotifications,
  markNotificationAsRead,
} from "../services/alert.service";

// Lấy tất cả thông báo
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const { read, limit = 50, page = 1 } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Xây dựng query
    const query: any = {};
    if (read !== undefined) {
      query.read = read === "true";
    }

    // Lấy thông báo từ cơ sở dữ liệu
    const notifications = await Notification.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit as string))
      .populate("locationId", "name"); // Lấy tên vị trí

    // Đếm tổng số thông báo
    const total = await Notification.countDocuments(query);

    res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Lỗi khi lấy thông báo",
    });
  }
};

// Lấy thông báo chưa đọc
export const getUnread = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id; // Lấy từ middleware auth

    const notifications = await getUnreadNotifications(userId);

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Lỗi khi lấy thông báo chưa đọc",
    });
  }
};

// Đánh dấu thông báo đã đọc
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const notification = await markNotificationAsRead(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông báo",
      });
    }

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Lỗi khi đánh dấu thông báo đã đọc",
    });
  }
};

// Đánh dấu tất cả thông báo đã đọc
export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const result = await Notification.updateMany(
      { read: false },
      { read: true, read_at: new Date() }
    );

    res.status(200).json({
      success: true,
      message: `Đã đánh dấu ${result.modifiedCount} thông báo là đã đọc`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Lỗi khi đánh dấu tất cả thông báo đã đọc",
    });
  }
};

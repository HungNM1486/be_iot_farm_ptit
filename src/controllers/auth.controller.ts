import { Request, Response } from "express";
import authService from "../services/auth.service";
import User from "../models/user.model";
import fs from "fs";
import path from "path";

export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password, address, phone } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide username, email and password",
      });
    }
    const result = await authService.register({
      username,
      email,
      password,
      address,
      phone,
    });
    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Registration failed",
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Please provide email and password" });
    }
    const result = await authService.login(email, password);
    return res
      .status(200)
      .json({ success: true, message: "Login successful", data: result });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : "Authentication failed",
    });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    return res.status(200).json({ success: true, data: { user: req.user } });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    });
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { password } = req.body;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!password)
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp mật khẩu để xác nhận xóa tài khoản",
      });
    const result = await authService.deleteAccount(userId, password);
    return res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Lỗi khi xóa tài khoản",
    });
  }
};

export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Lấy thông tin từ request body
    const { username, email, address, phone, removeAvatar } = req.body;

    // Tạo object chứa các trường cần update
    const updateData: {
      username?: string;
      email?: string;
      address?: string;
      phone?: string;
      avatar?: string;
    } = {};

    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (address !== undefined) updateData.address = address;
    if (phone !== undefined) updateData.phone = phone;

    // Lấy thông tin user hiện tại
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // Xử lý avatar
    if (removeAvatar === "true" || removeAvatar === true) {
      // Xóa file avatar cũ nếu có
      if (user.avatar && user.avatar !== "") {
        try {
          const avatarPath = path.join(
            __dirname,
            "../../",
            user.avatar.substring(1)
          );
          if (fs.existsSync(avatarPath)) {
            fs.unlinkSync(avatarPath);
          }
        } catch (error) {
          console.error("Lỗi khi xóa file avatar:", error);
        }
      }
      updateData.avatar = "";
    } else if (req.file) {
      // Upload avatar mới
      const avatarPath = `/uploads/avatars/${req.file.filename}`;
      // Xóa avatar cũ nếu có
      if (user.avatar && user.avatar !== "") {
        try {
          const oldAvatarPath = path.join(
            __dirname,
            "../../",
            user.avatar.substring(1)
          );
          if (fs.existsSync(oldAvatarPath)) {
            fs.unlinkSync(oldAvatarPath);
          }
        } catch (error) {
          console.error("Lỗi khi xóa avatar cũ:", error);
        }
      }
      updateData.avatar = avatarPath;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Không có thông tin để cập nhật",
      });
    }

    const result = await authService.updateProfile(userId, updateData);

    res.status(200).json({
      success: true,
      message: "Cập nhật thông tin thành công",
      data: {
        user: result.user,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Lỗi khi cập nhật thông tin",
    });
  }
};

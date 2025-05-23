import User, { IUser } from "../models/user.model";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";

class AuthService {
  // Đăng ký người dùng mới
  async register(userData: {
    username: string;
    email: string;
    password: string;
    address?: string;
    phone?: string;
  }) {
    try {
      // Kiểm tra email đã tồn tại
      const existingEmail = await User.findOne({ email: userData.email });
      if (existingEmail) {
        throw new Error("Email already exists");
      }

      // Kiểm tra username đã tồn tại
      const existingUsername = await User.findOne({
        username: userData.username,
      });
      if (existingUsername) {
        throw new Error("Username already exists");
      }

      // Tạo người dùng mới
      const user = new User(userData);
      await user.save();

      // Tạo token
      const token = this.generateToken(user);

      return {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          address: user.address,
          phone: user.phone,
          avatar: user.avatar || "",
        },
        token,
      };
    } catch (error) {
      throw error;
    }
  }

  // Đăng nhập
  async login(email: string, password: string) {
    try {
      // Tìm user theo email
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error("Invalid credentials");
      }

      // Kiểm tra mật khẩu
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        throw new Error("Invalid credentials");
      }

      // Tạo token
      const token = this.generateToken(user);

      return {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          address: user.address,
          phone: user.phone,
          avatar: user.avatar || "",
        },
        token,
      };
    } catch (error) {
      throw error;
    }
  }

  // Tạo JWT token
  private generateToken(user: IUser) {
    return jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
  }

  // Xác minh token
  async verifyToken(token: string) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        id: string;
        email: string;
      };
      const user = await User.findById(decoded.id);

      if (!user) {
        throw new Error("User not found");
      }

      return {
        id: user._id,
        email: user.email,
        username: user.username,
        avatar: user.avatar || "",
      };
    } catch (error) {
      throw new Error("Invalid token");
    }
  }

  async deleteAccount(userId: string, password: string) {
    try {
      // Tìm user
      const user = await User.findById(userId);
      if (!user) throw new Error("Người dùng không tồn tại");
      // Kiểm tra mật khẩu để xác thực
      const isMatch = await user.comparePassword(password);
      if (!isMatch) throw new Error("Mật khẩu không đúng");
      // Xóa tất cả location, plant, sensor data, alert settings, notification của user
      const locations = await mongoose
        .model("Location")
        .find({ userId: new mongoose.Types.ObjectId(userId) });
      for (const location of locations) {
        await mongoose.model("Plant").deleteMany({ locationId: location._id });
        await mongoose
          .model("SensorData")
          .deleteMany({ locationId: location._id });
        await mongoose
          .model("AlertSettings")
          .deleteMany({ locationId: location._id });
        await mongoose
          .model("Notification")
          .deleteMany({ locationId: location._id });
      }
      await mongoose
        .model("Location")
        .deleteMany({ userId: new mongoose.Types.ObjectId(userId) });

      await User.findByIdAndDelete(userId);
      return { message: "Tài khoản đã được xóa thành công" };
    } catch (error) {
      throw error;
    }
  }

  async updateProfile(
    userId: string,
    updateData: {
      username?: string;
      email?: string;
      address?: string;
      phone?: string;
      avatar?: string;
    }
  ) {
    try {
      // Kiểm tra username và email mới có trùng với user khác không
      if (updateData.username) {
        const existingUsername = await User.findOne({
          username: updateData.username,
          _id: { $ne: userId },
        });
        if (existingUsername) {
          throw new Error("Username đã tồn tại");
        }
      }

      if (updateData.email) {
        const existingEmail = await User.findOne({
          email: updateData.email,
          _id: { $ne: userId },
        });
        if (existingEmail) {
          throw new Error("Email đã tồn tại");
        }
      }

      // Cập nhật thông tin user
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            ...updateData,
          },
        },
        { new: true }
      );

      if (!updatedUser) {
        throw new Error("Không tìm thấy người dùng");
      }

      return {
        message: "Cập nhật thông tin thành công",
        user: {
          id: updatedUser._id,
          username: updatedUser.username,
          email: updatedUser.email,
          address: updatedUser.address,
          phone: updatedUser.phone,
          avatar: updatedUser.avatar || "",
        },
      };
    } catch (error) {
      throw error;
    }
  }
}

export default new AuthService();

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/user.model";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "datcaigicungduoc";

// Extend Request interface để thêm user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string;
      };
    }
  }
}

// src/middleware/auth.middleware.ts
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Lấy token từ header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    // Log token để debug
    console.log("Auth Token:", token.substring(0, 15) + "...");

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
    };
    console.log("Decoded Token:", decoded);

    // Kiểm tra user có tồn tại
    const user = await User.findById(decoded.id);

    if (!user) {
      console.log("User not found with ID:", decoded.id);
      return res.status(401).json({
        success: false,
        message: "Invalid token or user not found",
      });
    }

    console.log("Found User:", user.username);
    console.log("User ID from DB:", user._id);
    console.log("User ID toString():", user._id.toString());

    // Thêm thông tin user vào request
    req.user = {
      id: user._id.toString(), // Đảm bảo chuyển đổi thành string
      email: user.email,
      username: user.username,
    };

    console.log("req.user set to:", req.user);

    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).json({
      success: false,
      message: "Token is not valid",
    });
  }
};

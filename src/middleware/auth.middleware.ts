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

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
    };

    const user = await User.findById(decoded.id);

    if (!user) {
      console.log("User not found with ID:", decoded.id);
      return res.status(401).json({
        success: false,
        message: "Invalid token or user not found",
      });
    }

    // Thêm thông tin user vào request
    req.user = {
      id: user._id.toString(), // Đảm bảo chuyển đổi thành string
      email: user.email,
      username: user.username,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token is not valid",
    });
  }
};

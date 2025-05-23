// src/routes/notification.routes.ts
import { Router } from "express";
import * as notificationController from "../controllers/notification.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Lấy tất cả thông báo
router.get("/", authenticate, notificationController.getNotifications);

// Lấy thông báo chưa đọc
router.get("/unread", authenticate, notificationController.getUnread);

// Đánh dấu thông báo đã đọc
router.patch("/:id/read", authenticate, notificationController.markAsRead);

// Đánh dấu tất cả thông báo đã đọc
router.patch("/read-all", authenticate, notificationController.markAllAsRead);

export default router;

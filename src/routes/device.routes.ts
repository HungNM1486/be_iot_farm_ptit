// src/routes/device.routes.ts
import { Router } from "express";
import * as deviceController from "../controllers/device.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Áp dụng middleware xác thực
router.use(authenticate);

// Đăng ký thiết bị mới
router.post("/register", deviceController.registerDevice);

// Lấy tất cả thiết bị của người dùng
router.get("/", deviceController.getUserDevices);

// Gán thiết bị vào location
router.post("/assign/:locationId", deviceController.assignDevice);

// Gỡ thiết bị khỏi location
router.delete("/remove/:deviceId", deviceController.removeDevice);

// Lấy thiết bị theo location
router.get("/location/:locationId", deviceController.getLocationDevices);

// Cập nhật cài đặt thiết bị
router.put("/settings/:deviceId", deviceController.updateDeviceSettings);

// Xóa thiết bị
router.delete("/:deviceId", deviceController.deleteDeviceById);

router.get("/qr/:deviceId", deviceController.generateDeviceQR);

export default router;

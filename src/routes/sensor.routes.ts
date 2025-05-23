// src/routes/sensor.routes.ts
import { Router } from "express";
import * as sensorController from "../controllers/sensor.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Lấy dữ liệu cảm biến
router.get("/data", authenticate, sensorController.getSensorData);

// Lấy và cập nhật cài đặt cảm biến
router.get(
  "/settings/:locationId",
  authenticate,
  sensorController.getSensorSettings
);

// Cập nhật cài đặt cảm biến
router.put(
  "/settings/:locationId",
  authenticate,
  sensorController.updateSensorSettings
);

export default router;

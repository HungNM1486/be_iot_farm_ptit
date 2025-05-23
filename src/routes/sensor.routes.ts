// src/routes/sensor.routes.ts
import { Router } from "express";
import * as sensorController from "../controllers/sensor.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Ngưỡng cảnh báo
router.get(
  "/alert-settings/:locationId",
  authenticate,
  sensorController.getAlertSettings
);
router.put(
  "/alert-settings/:locationId",
  authenticate,
  sensorController.updateAlertSettings
);

// Gửi config xuống ESP32
router.post(
  "/send-config/:location_code",
  authenticate,
  sensorController.sendConfigToEsp32
);

export default router;

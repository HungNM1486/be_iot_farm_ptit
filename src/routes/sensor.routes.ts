import { Router } from "express";
import * as sensorController from "../controllers/sensor.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Global alert settings (không cần authentication cho đơn giản)
router.get("/alert-settings/global", sensorController.getGlobalAlertSettings);
router.put(
  "/alert-settings/global",
  authenticate,
  sensorController.updateGlobalAlertSettings
);

// Gửi config xuống ESP32
router.post("/send-config", authenticate, sensorController.sendConfigToEsp32);

export default router;

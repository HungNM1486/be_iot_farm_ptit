import { Router } from "express";
import * as alertController from "../controllers/alert.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Lấy cài đặt cảnh báo
router.get("/:locationId", authenticate, alertController.getAlertSettings);

// Cập nhật cài đặt cảnh báo
router.put("/:locationId", authenticate, alertController.updateAlertSettings);

export default router;

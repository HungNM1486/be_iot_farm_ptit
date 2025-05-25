import { Router } from "express";
import * as careTaskController from "../controllers/careTask.controller";
import { authenticate } from "../middleware/auth.middleware";
import { CareTaskNotificationService } from "../services/careTaskNotification.service";

const router = Router();

router.use(authenticate);

// Lấy tất cả caretask của plant (truyền plantId qua query)
router.get("/", careTaskController.getCareTasks);

// Tạo mới caretask cho plant (truyền plantId qua body)
router.post("/", careTaskController.createCareTask);

// Lấy chi tiết caretask
router.get("/:taskId", careTaskController.getCareTask);

// Cập nhật caretask
router.put("/:taskId", careTaskController.updateCareTask);

// Xóa caretask
router.delete("/:taskId", careTaskController.deleteCareTask);

router.get("/check-reminders", authenticate, async (req, res) => {
  try {
    await CareTaskNotificationService.checkUpcomingTasks();
    res.json({ success: true, message: "Đã kiểm tra nhắc nhở" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

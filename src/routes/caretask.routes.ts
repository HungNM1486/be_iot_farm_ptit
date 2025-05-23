import { Router } from "express";
import * as careTaskController from "../controllers/careTask.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router({ mergeParams: true });

router.use(authenticate);

// Lấy tất cả caretask của plant
router.get("/", careTaskController.getCareTasks);

// Tạo mới caretask cho plant
router.post("/", careTaskController.createCareTask);

// Lấy chi tiết caretask
router.get("/:taskId", careTaskController.getCareTask);

// Cập nhật caretask
router.put("/:taskId", careTaskController.updateCareTask);

// Xóa caretask
router.delete("/:taskId", careTaskController.deleteCareTask);

export default router;

import { Router } from "express";
import * as locationController from "../controllers/location.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router({ mergeParams: true }); // mergeParams để có thể truy cập params từ router cha

// Áp dụng middleware xác thực cho tất cả routes
router.use(authenticate);

// Tạo location mới trong season
router.post("/", locationController.createLocation);

// Lấy tất cả locations trong season
router.get("/", locationController.getLocations);

// Lấy chi tiết location
router.get("/:locationId", locationController.getLocationById);

// Cập nhật location
router.put("/:locationId", locationController.updateLocation);

// Xóa location
router.delete("/:locationId", locationController.deleteLocation);

export default router;

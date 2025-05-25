import { Router } from "express";
import * as plantController from "../controllers/plant.controller";
import { authenticate } from "../middleware/auth.middleware";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// Đảm bảo thư mục lưu ảnh cây trồng tồn tại
const plantImagesDir = path.join(__dirname, "../../uploads/plants");
if (!fs.existsSync(plantImagesDir)) {
  fs.mkdirSync(plantImagesDir, { recursive: true });
}

// Đảm bảo thư mục ảnh mặc định tồn tại
const defaultPlantImagesDir = path.join(
  __dirname,
  "../../public/defaults/plants"
);
if (!fs.existsSync(defaultPlantImagesDir)) {
  fs.mkdirSync(defaultPlantImagesDir, { recursive: true });
}

// Cấu hình multer để upload ảnh cây trồng
const plantImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/plants/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `plant-${uniqueSuffix}${ext}`);
  },
});

const plantImageUpload = multer({
  storage: plantImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn 5MB
  fileFilter: (req, file, cb) => {
    // Chỉ cho phép upload ảnh
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ cho phép upload file ảnh") as any, false);
    }
  },
});

// Áp dụng middleware xác thực cho tất cả routes
router.use(authenticate);

// Lấy tất cả cây trồng của user (không phân biệt location) - ACTIVE plants only
router.get("/all", plantController.getPlantsByUser);

// Lấy tất cả cây đã thu hoạch của user
router.get("/harvested", plantController.getHarvestedPlantsByUser);

// Lấy cây đã thu hoạch theo location
router.get("/:locationId/harvested", plantController.getHarvestedPlantsByLocation);

// Lấy chi tiết cây trồng
router.get("/:plantId", plantController.getPlantById);

// Cập nhật cây trồng (bao gồm cập nhật ảnh)
router.put(
  "/:plantId",
  plantImageUpload.single("image"),
  plantController.updatePlant
);

// Xóa cây trồng
router.delete("/:plantId", plantController.deletePlant);

// Tạo cây trồng mới
router.post(
  "/:locationId",
  plantImageUpload.single("image"),
  plantController.createPlant
);

// Lấy cây trồng theo location (ACTIVE plants only)
router.get("/:locationId/plants", plantController.getPlantsByLocation);

export default router;
import multer from "multer";
import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";
import predictService from "../services/image_predict";
import IMG4Predict from "../models/img4predict.model";
import { io } from "../app";

const router = Router();

// Đảm bảo thư mục tồn tại
const ensureDir = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

ensureDir("temp");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "temp/");
  },
  filename: (req, file: Express.Multer.File, cb) => {
    const tempFilename = `temp_${Date.now()}_${Math.round(
      Math.random() * 1000000
    )}`;
    cb(null, tempFilename);
  },
});

const upload = multer({ storage });

const cleanupTempFiles = (directory: string, maxAgeHours = 24) => {
  try {
    const files = fs.readdirSync(directory);
    const now = Date.now();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

    for (const file of files) {
      // Bỏ qua các tệp .gitkeep
      if (file === ".gitkeep") continue;

      const filePath = path.join(directory, file);
      const stats = fs.statSync(filePath);

      // Kiểm tra xem tệp có cũ hơn maxAgeHours không
      if (now - stats.mtimeMs > maxAgeMs) {
        // Chỉ xóa tệp tạm bắt đầu bằng "temp_" hoặc có định dạng [uuid]_[number]
        if (file.startsWith("temp_") || /^[0-9a-f-]+_\d+$/.test(file)) {
          fs.unlinkSync(filePath);
          console.log(`Đã xóa tệp tạm cũ: ${filePath}`);
        }
      }
    }
  } catch (error) {
    console.error("Lỗi khi dọn dẹp tệp tạm:", error);
  }
};

// Lên lịch dọn dẹp tệp tạm tự động
const scheduleCleanup = () => {
  // Dọn dẹp ngay khi khởi động
  cleanupTempFiles("temp");

  // Lên lịch dọn dẹp hàng giờ
  setInterval(() => {
    cleanupTempFiles("temp");
  }, 1 * 60 * 60 * 1000); // 1 giờ
};

scheduleCleanup();

// Thêm endpoint để lấy kết quả dự đoán
router.get("/predictions/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const prediction = await predictService.getPredictionById(id);

    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: "Prediction not found",
      });
    }

    res.json({
      success: true,
      prediction,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Đảm bảo thư mục uploads/camera tồn tại
ensureDir("uploads/camera");

const cameraStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/camera"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  },
});
const cameraUpload = multer({ storage: cameraStorage });

// API nhận ảnh từ ESP32-CAM, lưu và dự đoán bệnh
router.post(
  "/camera/upload",
  cameraUpload.single("image"),
  async (req, res) => {
    try {
      if (!req.file)
        return res
          .status(400)
          .json({ success: false, message: "Không có file ảnh" });
      const imagePath = req.file.path;
      const imageUrl = `/uploads/camera/${req.file.filename}`;
      // Lưu ảnh vào DB
      const imgDoc = await IMG4Predict.create({ imgURL: imageUrl });
      // Gọi hàm dự đoán, truyền imageId để lưu prediction
      const result = await predictService.predict(
        imagePath,
        imgDoc._id.toString()
      );
      // Xác định predictionId trả về
      const predictionId =
        "predictionId" in result
          ? (result as any).predictionId
          : result.prediction;
      // Emit socket.io tới tất cả client
      io.emit("new_image", {
        imageUrl,
        imageId: imgDoc._id,
        disease: result.className,
        probability: result.confidence,
        predictionId,
      });
      res.json({
        success: true,
        imageUrl,
        imageId: imgDoc._id,
        disease: result.className,
        probability: result.confidence,
        predictionId,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Lỗi khi dự đoán bệnh" });
    }
  }
);

export default router;

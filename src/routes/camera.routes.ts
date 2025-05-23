import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import * as tf from "@tensorflow/tfjs-node";

const router = express.Router();

// Tạo thư mục uploads/camera nếu chưa có
const uploadDir = path.join(__dirname, "../../uploads/camera");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

// Load model tfjs (chỉ load 1 lần)
let model: tf.GraphModel | null = null;
(async () => {
  model = await tf.loadGraphModel("file://tfjs_model/model.json");
  console.log("Đã load model bệnh cây!");
})();

// Xử lý upload và dự đoán
router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "Không có file ảnh" });
    if (!model)
      return res
        .status(500)
        .json({ success: false, message: "Model chưa sẵn sàng" });

    // Đọc ảnh và chuyển thành tensor
    const imageBuffer = fs.readFileSync(req.file.path);
    let imageTensor = tf.node.decodeImage(imageBuffer, 3);
    // Resize nếu model yêu cầu (ví dụ 224x224)
    imageTensor = tf.image
      .resizeBilinear(imageTensor, [224, 224])
      .div(255.0)
      .expandDims(0);

    // Dự đoán
    const prediction = model.predict(imageTensor) as tf.Tensor;
    const predictionArr = await prediction.data();
    const probability = Math.max(...predictionArr);
    const classIdx = predictionArr.indexOf(probability);

    // Map index sang tên bệnh (bạn cần cung cấp mảng này)
    const diseaseLabels = ["Bệnh 1", "Bệnh 2", "Bệnh 3", "Bệnh 4"]; // <-- Sửa lại đúng label của bạn
    const disease = diseaseLabels[classIdx] || "Không xác định";

    // Trả về kết quả
    res.json({
      success: true,
      imageUrl: `/uploads/camera/${req.file.filename}`,
      disease,
      probability,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Lỗi khi dự đoán bệnh" });
  }
});

export default router;

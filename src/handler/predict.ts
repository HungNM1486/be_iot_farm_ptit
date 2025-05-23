import { Router, Request, Response } from "express";
import predictService from "../services/image_predict";

const router = Router();

// Endpoint để dự đoán ảnh đã tải lên
router.post("/predict/:imageId", async (req: Request, res: Response) => {
  try {
    const { imageId } = req.params;

    const prediction = await predictService.predictById(imageId);

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

export default router;

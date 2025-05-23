import * as tf from "@tensorflow/tfjs-node";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import IMG4Predict from "../models/img4predict.model";
import Prediction from "../models/prediction.model";
import mongoose from "mongoose";

const MODEL_PATH = "/home/hungnm/projects/iot/SMART-AGRICULTURE-IOT/tfjs_model";

const PLANT_DISEASE_CLASSES = [
  "Pepper_bell_healthy",
  "Pepper_bell_bacterial_spot",
  "Tomato_Early_blight",
  "Potato_Early_blight",
  "Potato_Late_blight",
  "Tomato_Bacterial_spot",
  "Tomato_Leaf_Mold",
  "Tomato_Septoria_leaf_spot",
  "Tomato_healthy",
  "Tomato_Late_blight",
  "Potato_healthy",
  "Tomato_Target_Spot",
  "Tomato_Spider_mites",
  "Tomato_Yellow_Leaf_Curl_Virus",
  "Tomato_mosaic_virus",
];

class ImagePredictionService {
  private model: any | null;
  private labels: string[] | null;
  private isLoaded: boolean;

  constructor() {
    this.model = null;
    this.labels = PLANT_DISEASE_CLASSES;
    this.isLoaded = false;
  }

  async loadModel() {
    try {
      console.log("Đang tải model...");
      const modelPath = path.resolve(MODEL_PATH, "model.json");
      console.log("Model path:", modelPath);

      if (!fs.existsSync(modelPath)) {
        throw new Error(`Không tìm thấy file model.json trong: ${modelPath}`);
      }

      // Tải mô hình dạng GraphModel
      this.model = await tf.loadGraphModel(`file://${modelPath}`);
      console.log("Đã tải model thành công!");

      // Tải labels nếu có
      if (fs.existsSync(path.join(MODEL_PATH, "labels.json"))) {
        this.labels = JSON.parse(
          fs.readFileSync(path.join(MODEL_PATH, "labels.json"), "utf8")
        );
      } else {
        this.labels = PLANT_DISEASE_CLASSES;
      }

      this.isLoaded = true;
    } catch (error) {
      console.error("Lỗi khi tải model:", error);
      throw new Error("Không thể tải model");
    }
  }

  async ensureModelLoaded() {
    if (!this.isLoaded) {
      await this.loadModel();
    }
  }

  async preprocessImage(imagePath) {
    try {
      const imageBuffer = await sharp(imagePath).resize(224, 224).toBuffer();
      const imageTensor = tf.node.decodeImage(imageBuffer, 3);
      const normalizedImage = imageTensor.div(255.0);
      const batchedImage = normalizedImage.expandDims(0);
      return batchedImage;
    } catch (error) {
      console.error("Lỗi khi tiền xử lý ảnh:", error);
      throw new Error("Không thể xử lý ảnh");
    }
  }

  async predict(imagePath: string, imageId?: string) {
    await this.ensureModelLoaded();

    try {
      const inputTensor = await this.preprocessImage(imagePath);

      // Chạy dự đoán với GraphModel
      // GraphModel yêu cầu input theo signature của SavedModel
      const predictions = this.model.execute(
        { input_image: inputTensor }, // Tên input khớp với signature
        "Identity" // Tên output node, lấy từ SavedModel
      );

      // Lấy dữ liệu từ tensor output
      const predictionData = (await predictions.data()) as Float32Array;
      const predictionArray = Array.from(predictionData);
      const maxProbability = Math.max(...predictionArray);
      const classIndex = predictionArray.indexOf(maxProbability);
      const className = this.labels[classIndex];

      const results = {
        prediction: classIndex,
        className,
        confidence: maxProbability,
      };

      tf.dispose(inputTensor);
      tf.dispose(predictions);

      if (imageId) {
        const prediction = new Prediction({
          disease_name: className,
          confidence: maxProbability,
          note: `Predicted with confidence: ${(maxProbability * 100).toFixed(
            2
          )}%`,
          predicted_at: new Date(),
          created_at: new Date(),
          IMG4PredictId: new mongoose.Types.ObjectId(imageId),
        });

        const savedPrediction = await prediction.save();
        results["predictionId"] = savedPrediction._id;
      }

      return results;
    } catch (error) {
      console.error("Lỗi khi dự đoán:", error);
      throw new Error("Không thể thực hiện dự đoán");
    }
  }

  async predictById(imageId: string) {
    try {
      const image = await IMG4Predict.findById(imageId);
      if (!image) {
        throw new Error("Image not found");
      }

      const imagePath = path.join(
        process.cwd(),
        image.imgURL.replace(/^\//, "")
      );

      if (!fs.existsSync(imagePath)) {
        throw new Error("Image file not found on server");
      }

      return await this.predict(imagePath, imageId);
    } catch (error) {
      console.error("Error during prediction by ID:", error);
      throw error;
    }
  }

  async getPredictionById(predictionId: string) {
    try {
      const prediction = await Prediction.findById(predictionId).populate(
        "IMG4PredictId"
      );

      if (!prediction) {
        throw new Error("Prediction not found");
      }

      return prediction;
    } catch (error) {
      console.error("Error fetching prediction:", error);
      throw error;
    }
  }
}

export default new ImagePredictionService();

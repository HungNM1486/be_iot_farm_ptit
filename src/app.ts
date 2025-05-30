import bodyParser from "body-parser";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import predictService from "./services/image_predict";
import fileUploadRouter from "./handler/file_upload";
import predictRouter from "./handler/predict";
import authRouter from "./routes/auth.routes";
import locationRouter from "./routes/location.routes";
import plantRouter from "./routes/plant.routes";
import connectDB from "./config/database";
import sensorRouter from "./routes/sensor.routes";
import notificationRouter from "./routes/notification.routes";
import careTaskRouter from "./routes/caretask.routes";
import http from "http";
import { Server } from "socket.io";
import cron from "node-cron";
import { CareTaskNotificationService } from "./services/careTaskNotification.service";

import "./services/mqtt.service";

// Load environment variables
dotenv.config();

// Initialize express app
export const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Chạy mỗi ngày lúc 8:00 sáng để kiểm tra task sắp đến hạn
cron.schedule("0 8 * * *", async () => {
  console.log("Kiểm tra care task sắp đến hạn lúc 8:00 AM...");
  try {
    await CareTaskNotificationService.checkUpcomingTasks();
    console.log("Đã hoàn thành kiểm tra care task reminders");
  } catch (error) {
    console.error("Lỗi khi kiểm tra care task reminders:", error);
  }
});

// Chạy thêm lúc 18:00 chiều để nhắc nhở lần nữa
cron.schedule("0 18 * * *", async () => {
  console.log("Kiểm tra care task sắp đến hạn lúc 6:00 PM...");
  try {
    await CareTaskNotificationService.checkUpcomingTasks();
    console.log("Đã hoàn thành kiểm tra care task reminders");
  } catch (error) {
    console.error("Lỗi khi kiểm tra care task reminders:", error);
  }
});

// Tạo HTTP server và tích hợp socket.io
const server = http.createServer(app);
export const io = new Server(server, { cors: { origin: "*" } });

// Connect to MongoDB Atlas
connectDB()
  .then(() => console.log("MongoDB Atlas connected successfully"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use(
  "/defaults",
  express.static(path.join(__dirname, "../public/defaults"))
);

app.use("/api", fileUploadRouter);
app.use("/", predictRouter);
app.use("/auth", authRouter);
app.use("/api/locations", locationRouter);
app.use("/api/plants", plantRouter);
app.use("/api/sensors", sensorRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/caretask", careTaskRouter);

// Root endpoint
app.get("/", (req, res) => {
  res.json({ message: "Smart Agriculture IoT API is running" });
});

// Initialize prediction model
const initModel = async () => {
  try {
    await predictService.loadModel();
    console.log("Prediction model loaded successfully");
  } catch (error) {
    console.error("Error initializing model:", error);
  }
};

// Start server
server.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
  console.log("Cron jobs initialized:");
  console.log("- Care task reminders: 8:00 AM and 6:00 PM daily");
  // Initialize model after server starts
  initModel();
});

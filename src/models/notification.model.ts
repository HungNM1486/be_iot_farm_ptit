// src/models/notification.model.ts
import mongoose, { Document, Schema } from "mongoose";

export interface INotification extends Document {
  type: string;
  message: string;
  locationId: mongoose.Types.ObjectId;
  sensorDataId?: mongoose.Types.ObjectId;
  read: boolean;
  created_at: Date;
  read_at?: Date;
}

const NotificationSchema: Schema = new Schema({
  type: { type: String, required: true },
  message: { type: String, required: true }, // Nội dung thông báo
  locationId: { type: Schema.Types.ObjectId, ref: "Location", required: true },
  sensorDataId: { type: Schema.Types.ObjectId, ref: "SensorData" }, // Liên kết với dữ liệu cảm biến gây ra cảnh báo
  read: { type: Boolean, default: false }, // Đã đọc hay chưa
  created_at: { type: Date, default: Date.now },
  read_at: { type: Date }, // Thời gian đã đọc
});

export default mongoose.model<INotification>(
  "Notification",
  NotificationSchema
);

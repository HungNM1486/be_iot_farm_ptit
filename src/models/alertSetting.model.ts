// Cập nhật src/models/alertSetting.model.ts

import mongoose, { Document, Schema } from "mongoose";

export interface IAlertSettings extends Document {
  temperature_min: number;
  temperature_max: number;
  soil_moisture_min: number;
  soil_moisture_max: number;
  light_intensity_min: number;
  light_intensity_max: number;
  created_at: Date;
  updated_at: Date;
  locationId: mongoose.Types.ObjectId;
  plantId?: mongoose.Types.ObjectId; // Thêm plantId (tùy chọn)
  notification_channels: string[]; // Thêm kênh thông báo
  alert_frequency: number; // Tần suất cảnh báo (phút)
  last_alert_time?: Record<string, Date>; // Thời gian cảnh báo cuối cùng cho mỗi loại
}

const AlertSettingsSchema: Schema = new Schema({
  temperature_min: { type: Number, default: 15 },
  temperature_max: { type: Number, default: 35 },
  soil_moisture_min: { type: Number, default: 30 },
  soil_moisture_max: { type: Number, default: 80 },
  light_intensity_min: { type: Number, default: 300 },
  light_intensity_max: { type: Number, default: 800 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  locationId: { type: Schema.Types.ObjectId, ref: "Location", required: true },
  plantId: { type: Schema.Types.ObjectId, ref: "Plant" }, // Tùy chọn
  notification_channels: [
    {
      type: String,
      enum: ["email", "sms", "push", "webhook"],
      default: ["email"],
    },
  ],
  alert_frequency: { type: Number, default: 60 }, // 60 phút
  last_alert_time: { type: Map, of: Date },
});

AlertSettingsSchema.index({ locationId: 1, plantId: 1 });

export default mongoose.model<IAlertSettings>(
  "AlertSettings",
  AlertSettingsSchema
);

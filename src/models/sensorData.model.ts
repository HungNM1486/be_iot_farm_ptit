import mongoose, { Document, Schema } from "mongoose";

export interface ISensorData extends Document {
  temperature?: number;
  soil_moisture?: number;
  light_intensity?: number;
  recorded_at: Date;
  created_at: Date;
  locationId: mongoose.Types.ObjectId;
  deviceId?: string; // Thêm trường deviceId
}

const SensorDataSchema: Schema = new Schema({
  temperature: { type: Number },
  soil_moisture: { type: Number },
  light_intensity: { type: Number },
  recorded_at: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now },
  locationId: { type: Schema.Types.ObjectId, ref: "Location", required: true },
  deviceId: { type: String }, // Lưu ID của thiết bị gửi dữ liệu
});

export default mongoose.model<ISensorData>("SensorData", SensorDataSchema);

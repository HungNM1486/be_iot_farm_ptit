import mongoose, { Document, Schema } from "mongoose";

export interface IDevice extends Document {
  name: string;
  type: string;
  deviceId: string;
  locationId: mongoose.Types.ObjectId | null;
  status: string;
  last_active: Date;
  battery_level: number;
  firmware_version: string;
  sensors: string[];
  settings: any;
  registeredBy: mongoose.Types.ObjectId; // Thêm trường này
  created_at: Date;
  updated_at: Date;
}

const DeviceSchema: Schema = new Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ["ESP32", "Arduino", "RaspberryPi", "Custom"],
    default: "Custom",
  },
  deviceId: { type: String, required: true, unique: true },
  locationId: { type: Schema.Types.ObjectId, ref: "Location", default: null },
  status: {
    type: String,
    enum: ["Hoạt động", "Không hoạt động", "Offline", "Cần bảo trì"],
    default: "Không hoạt động",
  },
  last_active: { type: Date },
  battery_level: { type: Number },
  firmware_version: { type: String },
  sensors: [{ type: String }],
  settings: { type: Schema.Types.Mixed, default: {} },
  registeredBy: { type: Schema.Types.ObjectId, ref: "User", required: true }, // Thêm trường này
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Index để tìm kiếm nhanh
DeviceSchema.index({ deviceId: 1 });
DeviceSchema.index({ locationId: 1 });
DeviceSchema.index({ registeredBy: 1 }); // Thêm index này

export default mongoose.model<IDevice>("Device", DeviceSchema);

import mongoose, { Document, Schema } from "mongoose";

export interface ISensorSettings extends Document {
  frequency: number; // Tần suất lấy mẫu (phút)
  is_active: boolean;
  last_updated: Date;
  created_at: Date;
  updated_at: Date;
  locationId: mongoose.Types.ObjectId;
}

const SensorSettingsSchema: Schema = new Schema({
  frequency: { type: Number, default: 15 }, // 15 phút mặc định
  is_active: { type: Boolean, default: true },
  last_updated: { type: Date },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  locationId: { type: Schema.Types.ObjectId, ref: "Location", required: true },
});

export default mongoose.model<ISensorSettings>(
  "SensorSettings",
  SensorSettingsSchema
);

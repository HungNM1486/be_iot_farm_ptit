import mongoose, { Document, Schema } from "mongoose";

export interface IHistoryPlant extends Document {
  volumn: number;
  status: string;
  quality: string;
  created_at: Date;
}

const HistoryPlantSchema: Schema = new Schema({
  volumn: { type: Number, comment: "Harvest volume in kg" },
  status: {
    type: String,
    enum: ["Đã thu hoạch", "Đã hủy", "Thất bại"],
    default: "Đã thu hoạch",
  },
  quality: {
    type: String,
    enum: ["Tệ", "Ổn", "Tốt", "Rất tốt"],
    default: "Tốt",
  },
  created_at: { type: Date, default: Date.now },
});

export default mongoose.model<IHistoryPlant>(
  "HistoryPlant",
  HistoryPlantSchema
);

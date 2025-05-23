import mongoose, { Document, Schema } from "mongoose";

export interface ICareTask extends Document {
  plantId: mongoose.Types.ObjectId;
  name: string;
  type: string;
  scheduled_date: Date;
  note: string;
  created_at: Date;
  updated_at: Date;
}

const CareTaskSchema: Schema = new Schema({
  plantId: { type: Schema.Types.ObjectId, ref: "Plant", required: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: [
      "Bón phân",
      "Tưới nước",
      "Phun thuốc",
      "Tỉa cành",
      "Thu hoạch",
      "Xử lý sâu bệnh",
    ],
    required: true,
  },
  scheduled_date: { type: Date, required: true },
  note: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

export default mongoose.model<ICareTask>("CareTask", CareTaskSchema);

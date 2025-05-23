import mongoose, { Document, Schema } from "mongoose";

export interface IPrediction extends Document {
  disease_name: string;
  confidence: number;
  note: string;
  predicted_at: Date;
  created_at: Date;
  IMG4PredictId: mongoose.Types.ObjectId;
}

const PredictionSchema: Schema = new Schema({
  disease_name: { type: String, required: true },
  confidence: { type: Number, required: true },
  note: { type: String },
  predicted_at: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now },
  IMG4PredictId: {
    type: Schema.Types.ObjectId,
    ref: "IMG4Predict",
    required: true,
  },
});

export default mongoose.model<IPrediction>("Prediction", PredictionSchema);

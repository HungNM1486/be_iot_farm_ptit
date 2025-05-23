import mongoose, { Document, Schema } from "mongoose";

export interface IIMG4Predict extends Document {
  imgURL: string;
  uploaded_at: Date;
  created_at: Date;
  PlantId: mongoose.Types.ObjectId | null;
}

const IMG4PredictSchema: Schema = new Schema({
  imgURL: { type: String, required: true },
  uploaded_at: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now },
  PlantId: { type: Schema.Types.ObjectId, ref: "Plant", default: null },
});

export default mongoose.model<IIMG4Predict>("IMG4Predict", IMG4PredictSchema);

import { Schema, model, Document, Types } from 'mongoose';

/** CONSUMP_REQUEST: chi tiết yêu cầu type='consump' - người thuê tự báo chỉ số điện. */
export interface IConsumpRequest extends Document {
  requestID: Types.ObjectId; // ref Request (1-1)
  image: string;
  reading: number;
  capturedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ConsumpRequestSchema = new Schema<IConsumpRequest>(
  {
    requestID: {
      type: Schema.Types.ObjectId,
      ref: 'Request',
      required: true,
      unique: true,
      index: true,
    },
    image: { type: String, required: true },
    reading: { type: Number, required: true, min: 0 },
    capturedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

export default model<IConsumpRequest>('ConsumpRequest', ConsumpRequestSchema);
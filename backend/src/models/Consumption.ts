import { Schema, model, Document, Types } from 'mongoose';

/** CONSUMPTION: chỉ số công tơ điện ghi nhận cho 1 ROOM tại 1 thời điểm. */
export interface IConsumption extends Document {
  roomID: Types.ObjectId; // ref Room
  meterReading: number;
  trackingTime: Date;
  e_meterImage: string; // ảnh chụp công tơ điện
  createdAt: Date;
  updatedAt: Date;
}

const ConsumptionSchema = new Schema<IConsumption>(
  {
    roomID: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    meterReading: { type: Number, required: true, min: 0 },
    trackingTime: { type: Date, required: true },
    e_meterImage: { type: String, default: '' },
  },
  { timestamps: true },
);

export default model<IConsumption>('Consumption', ConsumptionSchema);
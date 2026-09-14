import { Schema, model, Document, Types } from 'mongoose';

/** CHECKOUT_REQUEST: chi tiết yêu cầu type='checkout' - chốt số điện cuối & trả phòng. */
export interface ICheckoutRequest extends Document {
  requestID: Types.ObjectId; // ref Request (1-1)
  contractID: Types.ObjectId; // ref Contract
  finalImage: string;
  finalReading: number;
  createdAt: Date;
  updatedAt: Date;
}

const CheckoutRequestSchema = new Schema<ICheckoutRequest>(
  {
    requestID: {
      type: Schema.Types.ObjectId,
      ref: 'Request',
      required: true,
      unique: true,
      index: true,
    },
    contractID: { type: Schema.Types.ObjectId, ref: 'Contract', required: true, index: true },
    finalImage: { type: String, required: true },
    finalReading: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

export default model<ICheckoutRequest>('CheckoutRequest', CheckoutRequestSchema);
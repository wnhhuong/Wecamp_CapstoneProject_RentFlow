import { Schema, model, Document, Types } from 'mongoose';

/** PAID_REQUEST: chi tiết yêu cầu type='paid' - báo đã thanh toán 1 INVOICE. */
export interface IPaidRequest extends Document {
  requestID: Types.ObjectId; // ref Request (1-1)
  invoiceID: Types.ObjectId; // ref Invoice
  createdAt: Date;
  updatedAt: Date;
}

const PaidRequestSchema = new Schema<IPaidRequest>(
  {
    requestID: {
      type: Schema.Types.ObjectId,
      ref: 'Request',
      required: true,
      unique: true,
      index: true,
    },
    invoiceID: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
  },
  { timestamps: true },
);

export default model<IPaidRequest>('PaidRequest', PaidRequestSchema);
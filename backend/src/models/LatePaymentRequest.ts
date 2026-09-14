import { Schema, model, Document, Types } from 'mongoose';

/** LATE_PAYMENT_REQUEST: chi tiết yêu cầu type='delay' - xin khất thanh toán 1 INVOICE. */
export interface ILatePaymentRequest extends Document {
  requestID: Types.ObjectId; // ref Request (1-1)
  invoiceID: Types.ObjectId; // ref Invoice
  createdAt: Date;
  updatedAt: Date;
}

const LatePaymentRequestSchema = new Schema<ILatePaymentRequest>(
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

export default model<ILatePaymentRequest>('LatePaymentRequest', LatePaymentRequestSchema);
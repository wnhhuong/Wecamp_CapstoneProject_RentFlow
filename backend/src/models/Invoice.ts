import { Schema, model, Document, Types } from 'mongoose';
import { InvoiceStatus } from './enums.js';

/** INVOICE: hóa đơn tổng hợp tiền phòng + điện/nước/wifi/gửi xe/khác. */
export interface IInvoice extends Document {
  consumptionID: Types.ObjectId; // ref Consumption (giữ nguyên tên field theo ERD)
  roomBill: number;
  totalBill: number;
  electricalBill: number;
  waterBill: number;
  wifiBill: number;
  parkingBill: number;
  otherBill: number;
  createdDate: Date;
  paymentDate?: Date;
  dueDate: Date;
  isRequestLate: boolean;
  status: InvoiceStatus;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    consumptionID: {
      type: Schema.Types.ObjectId,
      ref: 'Consumption',
      required: true,
      index: true,
    },
    roomBill: { type: Number, required: true, min: 0 },
    totalBill: { type: Number, required: true, min: 0 },
    electricalBill: { type: Number, required: true, min: 0, default: 0 },
    waterBill: { type: Number, required: true, min: 0, default: 0 },
    wifiBill: { type: Number, required: true, min: 0, default: 0 },
    parkingBill: { type: Number, required: true, min: 0, default: 0 },
    otherBill: { type: Number, required: true, min: 0, default: 0 },
    createdDate: { type: Date, required: true, default: Date.now },
    paymentDate: { type: Date },
    dueDate: { type: Date, required: true },
    isRequestLate: { type: Boolean, required: true, default: false },
    status: {
      type: String,
      enum: Object.values(InvoiceStatus),
      required: true,
      default: InvoiceStatus.NOT_PAID,
    },
  },
  { timestamps: true },
);

export default model<IInvoice>('Invoice', InvoiceSchema);
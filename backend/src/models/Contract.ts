import { Schema, model, Document, Types } from 'mongoose';
import { ContractStatus } from './enums.js';

/** CONTRACT: hợp đồng thuê, liên kết 1 USER với 1 ROOM. */
export interface IContract extends Document {
  userID: Types.ObjectId; // ref User
  roomID: Types.ObjectId; // ref Room
  startDate: Date;
  expireDate: Date;
  propertyDeposit: number;
  rentPrice: number;
  status: ContractStatus;
  signature: string;
  signedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ContractSchema = new Schema<IContract>(
  {
    userID: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    roomID: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    startDate: { type: Date, required: true },
    expireDate: { type: Date, required: true },
    propertyDeposit: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: Object.values(ContractStatus),
      required: true,
      default: ContractStatus.ACTIVE,
    },
    rentPrice: { type: Number, required: true, min: 0 },
    signature: { type: String, default: '' },
    signedAt: { type: Date },
  },
  { timestamps: true },
);

export default model<IContract>('Contract', ContractSchema);
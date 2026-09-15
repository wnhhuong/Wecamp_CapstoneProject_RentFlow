// backend/src/models/Request.model.ts
import { Schema, model, Document, Types } from 'mongoose';
import { RequestType, RequestStatus } from './enums.js';

/**
 * REQUEST: bảng gốc cho mọi loại yêu cầu người thuê gửi lên
 * (báo chỉ số, xin gia hạn, trả phòng...)
 */
export interface IRequest extends Document {
  type: RequestType;
  roomID: Types.ObjectId; // ref Room
  userID: Types.ObjectId; // ref User
  createDate: Date;
  resolveDate?: Date;
  status: RequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

const RequestSchema = new Schema<IRequest>(
  {
    type: { type: String, enum: Object.values(RequestType), required: true, index: true },
    roomID: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    userID: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createDate: { type: Date, required: true, default: Date.now },
    resolveDate: { type: Date },
    status: {
      type: String,
      enum: Object.values(RequestStatus),
      required: true,
      default: RequestStatus.PENDING,
    },
  },
  { timestamps: true },
);

export default model<IRequest>('Request', RequestSchema);
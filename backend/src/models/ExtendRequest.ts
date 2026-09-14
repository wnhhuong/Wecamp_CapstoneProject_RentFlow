import { Schema, model, Document, Types } from 'mongoose';

/** EXTEND_REQUEST: chi tiết yêu cầu type='extend' - xin gia hạn hợp đồng. */
export interface IExtendRequest extends Document {
  requestID: Types.ObjectId; // ref Request (1-1)
  contractID: Types.ObjectId; // ref Contract
  createdAt: Date;
  updatedAt: Date;
}

const ExtendRequestSchema = new Schema<IExtendRequest>(
  {
    requestID: {
      type: Schema.Types.ObjectId,
      ref: 'Request',
      required: true,
      unique: true,
      index: true,
    },
    contractID: { type: Schema.Types.ObjectId, ref: 'Contract', required: true, index: true },
  },
  { timestamps: true },
);

export default model<IExtendRequest>('ExtendRequest', ExtendRequestSchema);
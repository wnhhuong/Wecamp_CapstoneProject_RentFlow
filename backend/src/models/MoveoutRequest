import { Schema, model, Document, Types } from 'mongoose';

/** MOVEOUT_REQUEST: chi tiết yêu cầu type='moveout' - báo trước ngày trả phòng. */
export interface IMoveoutRequest extends Document {
  requestID: Types.ObjectId; // ref Request (1-1)
  contractID: Types.ObjectId; // ref Contract
  requestMoveoutDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MoveoutRequestSchema = new Schema<IMoveoutRequest>(
  {
    requestID: {
      type: Schema.Types.ObjectId,
      ref: 'Request',
      required: true,
      unique: true,
      index: true,
    },
    contractID: { type: Schema.Types.ObjectId, ref: 'Contract', required: true, index: true },
    requestMoveoutDate: { type: Date, required: true },
  },
  { timestamps: true },
);

export default model<IMoveoutRequest>('MoveoutRequest', MoveoutRequestSchema);
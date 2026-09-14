// backend/src/models/Repair.model.ts
import { Schema, model, Document, Types } from 'mongoose';

/**
 * REPAIR: mô tả thiết bị nào cần sửa trong 1 ticket, kèm mô tả và ảnh hiện trạng.
 */
export interface IRepair extends Document {
  ticketID: Types.ObjectId; // ref Ticket
  facilityID: Types.ObjectId; // ref Facility
  description: string;
  facilityImage: string; // giữ nguyên tên field theo ERD
  createdAt: Date;
  updatedAt: Date;
}

const RepairSchema = new Schema<IRepair>(
  {
    ticketID: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true, index: true },
    facilityID: { type: Schema.Types.ObjectId, ref: 'Facility', required: true, index: true },
    description: { type: String, default: '' },
    facilityImage: { type: String, default: '' },
  },
  { timestamps: true },
);

// 1 ticket chỉ 1 repair cho 1 facility
RepairSchema.index({ ticketID: 1, facilityID: 1 }, { unique: true });

export default model<IRepair>('Repair', RepairSchema);
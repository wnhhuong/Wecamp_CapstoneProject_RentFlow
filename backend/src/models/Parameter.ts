import { Schema, model, Document } from 'mongoose';
import { ParameterName } from './enums.js';

/**
 * PARAMETER: cấu hình chung của hệ thống (đơn giá điện/nước/wifi,
 * ngày chốt số điện, thông tin liên hệ chủ trọ...).
 */
export interface IParameter extends Document {
  name: ParameterName;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

const ParameterSchema = new Schema<IParameter>(
  {
    name: {
      type: String,
      enum: Object.values(ParameterName),
      required: true,
      unique: true,
    },
    value: { type: String, required: true },
  },
  { timestamps: true },
);

export default model<IParameter>('Parameter', ParameterSchema);
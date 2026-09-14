import { Schema, model, Document } from 'mongoose';
import { Sex } from './enums.js';

/**
 * USER: hồ sơ người thuê trọ (thông tin cá nhân dùng để ký hợp đồng).
 */
export interface IUser extends Document {
  fullName: string;
  DoB: Date;
  phoneNumber: string;
  identityNo: string; // CMND/CCCD (giữ nguyên tên field theo ERD)
  sex: Sex;
  nationality: string;
  PoR: string; // Place of Residence - nơi thường trú
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true, trim: true },
    DoB: { type: Date, required: true },
    phoneNumber: { type: String, required: true, trim: true },
    identityNo: { type: String, required: true, unique: true, trim: true },
    sex: { type: String, enum: Object.values(Sex), required: true },
    nationality: { type: String, required: true, trim: true },
    PoR: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

export default model<IUser>('User', UserSchema);
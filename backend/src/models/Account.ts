import { Schema, model, Document, Types } from 'mongoose';
import { AccountRole, AccountStatus } from './enums.js';

/**
 * ACCOUNT: tài khoản đăng nhập hệ thống.
 * - role = 'user' thường gắn với 1 ROOM đang thuê.
 * - role = 'admin' quản lý toàn hệ thống (roomID có thể để trống).
 */
export interface IAccount extends Document {
  roomID?: Types.ObjectId; // ref Room, optional với admin
  username: string;
  password: string; // lưu hash, không lưu plaintext
  status: AccountStatus;
  role: AccountRole;
  startDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema = new Schema<IAccount>(
  {
    roomID: { type: Schema.Types.ObjectId, ref: 'Room', index: true },
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, select: false },
    status: {
      type: String,
      enum: Object.values(AccountStatus),
      required: true,
      default: AccountStatus.ACTIVE,
    },
    role: { type: String, enum: Object.values(AccountRole), required: true },
    startDate: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

export default model<IAccount>('Account', AccountSchema);
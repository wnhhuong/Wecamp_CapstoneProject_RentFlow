import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import Room from '../models/Room.js';
import Account from '../models/Account.js';
import Area from '../models/Area.js';
import { AccountRole, AccountStatus, RoomStatus } from '../models/enums.js';

export interface ICreateRoomDTO {
  areaID: string;
  roomCode: string;
  floor: number;
  maxPeople: number;
  roomDetail: string;
  price: number;
  deposit: number;
  images: string[];
}

export class RoomService {
  public static async createRoomWithAccount(dto: ICreateRoomDTO) {
    const areaExists = await Area.findById(dto.areaID);
    if (!areaExists) {
      this.cleanupImages(dto.images);
      const error: any = new Error('Selected Area does not exist.');
      error.statusCode = 404;
      throw error;
    }

    const existingRoom = await Room.findOne({ roomCode: dto.roomCode });
    if (existingRoom) {
      this.cleanupImages(dto.images);
      const error: any = new Error(`Room with code "${dto.roomCode}" already exists.`);
      error.statusCode = 409;
      throw error;
    }

    const normalizedUsername = dto.roomCode.replace(/\s+/g, '');
    const existingAccount = await Account.findOne({ username: normalizedUsername });
    if (existingAccount) {
      this.cleanupImages(dto.images);
      const error: any = new Error(`An account with username "${normalizedUsername}" already exists.`);
      error.statusCode = 409;
      throw error;
    }

    // Khởi tạo Transaction Session
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Tạo Room: Luôn có status = AVAILABLE_NOW theo đúng AC
      const roomDoc = new Room({
        areaID: new mongoose.Types.ObjectId(dto.areaID),
        roomCode: dto.roomCode,
        floor: dto.floor,
        maxPeople: dto.maxPeople,
        roomDetail: dto.roomDetail,
        price: dto.price,
        deposit: dto.deposit,
        status: RoomStatus.AVAILABLE_NOW,
        availableFrom: new Date(),
        images: dto.images,
      });

      const newRoom = await roomDoc.save({ session });

      // 2. Tạo Account: Luôn có status = BANNED theo đúng AC
      const rawPassword = process.env.DEFAULT_ROOM_PASSWORD!;
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(rawPassword, salt);

      const accountDoc = new Account({
        roomID: newRoom._id,
        username: normalizedUsername,
        password: passwordHash,
        status: AccountStatus.BANNED,
        role: AccountRole.USER,
        startDate: new Date(),
      });

      await accountDoc.save({ session });

      // Transaction commit cả Room + Account
      await session.commitTransaction();
      session.endSession();

      return {
        roomID: String(newRoom._id),
        areaID: String(newRoom.areaID),
        roomCode: newRoom.roomCode,
        floor: newRoom.floor,
        maxPeople: newRoom.maxPeople,
        roomDetail: newRoom.roomDetail,
        price: newRoom.price,
        deposit: newRoom.deposit,
        status: newRoom.status,
        availableFrom: newRoom.availableFrom,
        images: newRoom.images,
      };
    } catch (err) {
      // Rollback toàn bộ nếu Account creation hoặc bất kỳ bước nào fail
      await session.abortTransaction();
      session.endSession();
      this.cleanupImages(dto.images);
      throw err;
    }
  }

  private static cleanupImages(imagePaths: string[]) {
    if (!imagePaths || imagePaths.length === 0) return;
    imagePaths.forEach((relPath) => {
      try {
        const fullPath = path.resolve(process.cwd(), relPath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } catch (e) {
        console.error(`Failed to delete file: ${relPath}`, e);
      }
    });
  }
}
import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { RoomService } from '../../services/room.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';

const cleanupUploadedFiles = (files?: Express.Multer.File[]) => {
  if (!files || files.length === 0) return;
  files.forEach((file) => {
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (err) {
      console.error(`Failed to delete temp file: ${file.path}`, err);
    }
  });
};

export class AdminRoomController {

  /**
   * PATCH /api/admin/rooms/:roomID (#28b)
   * SCRUM-91: Admin updates Room information
   */
  public static async updateRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    const uploadedFiles = req.files as Express.Multer.File[] | undefined;

    try {
      const rawRoomID = req.params.roomID;
      const roomID = Array.isArray(rawRoomID) ? rawRoomID[0] : rawRoomID;

      if (!roomID || !mongoose.Types.ObjectId.isValid(roomID)) {
        cleanupUploadedFiles(uploadedFiles);
        sendError(res, 400, 'Invalid roomID in request parameters.');
        return;
      }

      const { roomCode, floor, maxPeople, roomDetail, price, deposit, images: bodyImages } = req.body;

      // Validate các trường nếu được gửi lên
      if (roomCode !== undefined && (typeof roomCode !== 'string' || roomCode.trim().length === 0)) {
        cleanupUploadedFiles(uploadedFiles);
        sendError(res, 400, 'roomCode cannot be empty.');
        return;
      }

      let parsedFloor: number | undefined;
      if (floor !== undefined && floor !== null && floor !== '') {
        parsedFloor = Number(floor);
        if (isNaN(parsedFloor) || !Number.isInteger(parsedFloor) || parsedFloor < 0) {
          cleanupUploadedFiles(uploadedFiles);
          sendError(res, 400, 'floor must be an integer greater than or equal to 0.');
          return;
        }
      }

      let parsedMaxPeople: number | undefined;
      if (maxPeople !== undefined && maxPeople !== null && maxPeople !== '') {
        parsedMaxPeople = Number(maxPeople);
        if (isNaN(parsedMaxPeople) || !Number.isInteger(parsedMaxPeople) || parsedMaxPeople < 1) {
          cleanupUploadedFiles(uploadedFiles);
          sendError(res, 400, 'maxPeople must be an integer of at least 1 person.');
          return;
        }
      }

      let parsedPrice: number | undefined;
      if (price !== undefined && price !== null && price !== '') {
        parsedPrice = Number(price);
        if (isNaN(parsedPrice) || parsedPrice < 0) {
          cleanupUploadedFiles(uploadedFiles);
          sendError(res, 400, 'price must be a positive number.');
          return;
        }
      }

      let parsedDeposit: number | undefined;
      if (deposit !== undefined && deposit !== null && deposit !== '') {
        parsedDeposit = Number(deposit);
        if (isNaN(parsedDeposit) || parsedDeposit < 0) {
          cleanupUploadedFiles(uploadedFiles);
          sendError(res, 400, 'deposit must be a positive number.');
          return;
        }
      }

      // Thu thập ảnh mới: ưu tiên file upload từ multipart/form-data
      let finalImages: string[] | undefined;
      if (uploadedFiles && uploadedFiles.length > 0) {
        finalImages = uploadedFiles.map((file) =>
          path.join('uploads', 'rooms', file.filename).replace(/\\/g, '/')
        );
      } else if (bodyImages) {
        // Hỗ trợ truyền mảng URL ảnh qua JSON body
        finalImages = Array.isArray(bodyImages) ? bodyImages : [bodyImages];
      }

      const result = await RoomService.updateRoom(roomID, {
        roomCode: roomCode !== undefined ? roomCode.trim() : undefined,
        floor: parsedFloor,
        maxPeople: parsedMaxPeople,
        roomDetail: roomDetail !== undefined ? String(roomDetail).trim() : undefined,
        price: parsedPrice,
        deposit: parsedDeposit,
        images: finalImages,
      });

      sendSuccess(res, result.room, 200);
    } catch (error: any) {
      cleanupUploadedFiles(uploadedFiles);
      if (error.statusCode) {
        sendError(res, error.statusCode, error.message);
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/admin/rooms (#27)
   */
  public static async getRooms(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, areaID, status, maxPeople, owed, page, limit } = req.query;

      const result = await RoomService.getAdminRooms({
        search: search ? String(search) : undefined,
        areaID: areaID ? String(areaID) : undefined,
        status: status ? String(status) : undefined,
        maxPeople: maxPeople ? Number(maxPeople) : undefined,
        owed: owed === 'owed' || owed === 'not_owed' ? (owed as 'owed' | 'not_owed') : undefined,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 12,
      });

      sendSuccess(res, result, 200);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.statusCode, error.message);
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/admin/rooms/:roomID (#28)
   */
  public static async getRoomDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRoomID = req.params.roomID;
      const roomID = Array.isArray(rawRoomID) ? rawRoomID[0] : rawRoomID;

      if (!roomID || !mongoose.Types.ObjectId.isValid(roomID)) {
        sendError(res, 400, 'Invalid roomID in request parameters.');
        return;
      }

      const result = await RoomService.getAdminRoomDetail(roomID);

      sendSuccess(res, result, 200);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.statusCode, error.message);
        return;
      }
      next(error);
    }
  }

  public static async createRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    const uploadedFiles = req.files as Express.Multer.File[];

    try {
      // 1. Validate File ảnh
      if (!uploadedFiles || uploadedFiles.length === 0) {
        sendError(res, 400, 'At least one room image is required (max 4 images).');
        return;
      }

      const { areaID, roomCode, floor, maxPeople, roomDetail, price, deposit } = req.body;

      // 2. Validate areaID
      if (!areaID || typeof areaID !== 'string' || !mongoose.Types.ObjectId.isValid(areaID)) {
        cleanupUploadedFiles(uploadedFiles);
        sendError(res, 400, 'areaID is required and must be a valid ObjectId.');
        return;
      }

      // 3. Validate roomCode
      if (!roomCode || typeof roomCode !== 'string' || roomCode.trim().length === 0) {
        cleanupUploadedFiles(uploadedFiles);
        sendError(res, 400, 'roomCode is required and cannot be empty.');
        return;
      }

      // 4. Validate floor
      const parsedFloor = Number(floor);
      if (floor === undefined || floor === null || isNaN(parsedFloor) || !Number.isInteger(parsedFloor) || parsedFloor < 0) {
        cleanupUploadedFiles(uploadedFiles);
        sendError(res, 400, 'floor must be an integer greater than or equal to 0.');
        return;
      }

      // 5. Validate maxPeople
      const parsedMaxPeople = Number(maxPeople);
      if (maxPeople === undefined || maxPeople === null || isNaN(parsedMaxPeople) || !Number.isInteger(parsedMaxPeople) || parsedMaxPeople < 1) {
        cleanupUploadedFiles(uploadedFiles);
        sendError(res, 400, 'maxPeople must be an integer of at least 1 person.');
        return;
      }

      // 6. Validate roomDetail
      if (!roomDetail || typeof roomDetail !== 'string' || roomDetail.trim().length < 5) {
        cleanupUploadedFiles(uploadedFiles);
        sendError(res, 400, 'roomDetail is required and must be at least 5 characters.');
        return;
      }

      // 7. Validate price & deposit
      const parsedPrice = Number(price);
      if (price === undefined || price === null || isNaN(parsedPrice) || parsedPrice < 0) {
        cleanupUploadedFiles(uploadedFiles);
        sendError(res, 400, 'price is required and must be a positive number.');
        return;
      }

      const parsedDeposit = Number(deposit);
      if (deposit === undefined || deposit === null || isNaN(parsedDeposit) || parsedDeposit < 0) {
        cleanupUploadedFiles(uploadedFiles);
        sendError(res, 400, 'deposit is required and must be a positive number.');
        return;
      }

      const imagePaths: string[] = uploadedFiles.map((file) =>
        path.join('uploads', 'rooms', file.filename).replace(/\\/g, '/')
      );

      // Gọi service (status mặc định AVAILABLE_NOW)
      const roomData = await RoomService.createRoomWithAccount({
        areaID,
        roomCode: roomCode.trim(),
        floor: parsedFloor,
        maxPeople: parsedMaxPeople,
        roomDetail: roomDetail.trim(),
        price: parsedPrice,
        deposit: parsedDeposit,
        images: imagePaths,
      });

      sendSuccess(res, roomData, 201);
    } catch (error: any) {
      cleanupUploadedFiles(uploadedFiles);
      if (error.statusCode) {
        sendError(res, error.statusCode, error.message);
        return;
      }
      next(error);
    }
  }

  public static async prepareRoomAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRoomID = req.params.roomID;
      const roomID = Array.isArray(rawRoomID) ? rawRoomID[0] : rawRoomID;
      const rawPassword = req.body.newPassword ?? req.body.password;
      
      // 1. Validate roomID
      if (!roomID || !mongoose.Types.ObjectId.isValid(roomID)) {
        sendError(res, 400, 'Invalid or missing roomID in request parameters.');
        return;
      }

      // 2. Validate bắt buộc Admin phải nhập mật khẩu
      if (!rawPassword || typeof rawPassword !== 'string' || rawPassword.trim().length === 0) {
        sendError(res, 400, 'newPassword is required. Admin must provide a temporary password.');
        return;
      }

      // 3. Validate độ dài mật khẩu (tối thiểu 6 ký tự)
      if (rawPassword.trim().length < 6) {
        sendError(res, 400, 'newPassword must be at least 6 characters long.');
        return;
      }

      const result = await RoomService.prepareRoomAccount({
        roomID,
        newPassword: rawPassword.trim(),
      });

      // Output theo chuẩn API Spec #31: { success: true, data: { accountID, roomID, username, status }, message: null }
      sendSuccess(res, result, 200);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.statusCode, error.message);
        return;
      }
      next(error);
    }
  }
}
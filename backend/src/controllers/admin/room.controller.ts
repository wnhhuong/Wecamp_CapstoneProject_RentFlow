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
}
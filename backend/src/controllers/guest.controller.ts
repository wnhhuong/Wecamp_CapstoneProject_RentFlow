import { NextFunction, Request, Response } from "express";
import Parameter from "../models/Parameter.js";
import { ParameterName, RoomStatus } from "../models/enums.js";
import { sendError, sendSuccess } from "../utils/response.js";
import { buildPaginationMeta, parsePagination } from "../utils/pagination.js";
import Room from "../models/Room.js";
import Area from "../models/Area.js";
import mongoose from "mongoose";

const escapeRegex = (str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Get property info in parameters
// GET /guest/parameters
export const getParameters = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Chạy song song 6 query cùng lúc + lean()
        const [propertyName, address, adminPhone, adminEmail, adminFacebook, adminZalo] = await Promise.all([
            Parameter.findOne({ name: ParameterName.PROPERTY_NAME }).lean(),
            Parameter.findOne({ name: ParameterName.ADDRESS }).lean(),
            Parameter.findOne({ name: ParameterName.ADMIN_PHONE }).lean(),
            Parameter.findOne({ name: ParameterName.ADMIN_EMAIL }).lean(),
            Parameter.findOne({ name: ParameterName.ADMIN_FACEBOOK }).lean(),
            Parameter.findOne({ name: ParameterName.ADMIN_ZALO }).lean(),
        ]);

        if (!propertyName || !address || !adminPhone || !adminEmail) {
            sendError(res, 404, "Required parameters not found");
            return;
        }

        const data = { propertyName, address, adminPhone, adminEmail, adminFacebook, adminZalo };
        sendSuccess(res, data, 200);
    } catch (error) {
        next(error);
    }
};

// Get public rooms
// GET /guest/rooms
export const getPublicRoom = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { search, floor, status, maxPeople, priceMin, priceMax, page, limit } = req.query;

        // validate status
        // Guest chỉ được xem AVAILABLE_NOW / AVAILABLE_SOON, không lộ NOT_AVAILABLE / RENTED
        const allowedStatuses = [RoomStatus.AVAILABLE_NOW, RoomStatus.AVAILABLE_SOON];
        if (status && !allowedStatuses.includes(status as RoomStatus)) {
            sendError(res, 400, "Invalid status filter");
            return;
        }
        const statusFilter = status ? [status as RoomStatus] : allowedStatuses;

        // validate floor
        let floorNum: number | undefined;
        if (floor !== undefined) {
            floorNum = Number(floor);
            if (!Number.isInteger(floorNum)) {
                sendError(res, 400, "Invalid floor filter");
                return;
            }
        }

        // validate maxPeople
        let minCapacity: number | undefined;
        if (maxPeople !== undefined) {
            minCapacity = Number(maxPeople);
            if (!Number.isInteger(minCapacity) || minCapacity < 1) {
                sendError(res, 400, "Invalid maxPeople filter");
                return;
            }
        }

        // validate price range
        let priceMinNum: number | undefined;
        let priceMaxNum: number | undefined;
        if (priceMin !== undefined) {
            priceMinNum = Number(priceMin);
            if (!Number.isFinite(priceMinNum) || priceMinNum < 0) {
                sendError(res, 400, "Invalid priceMin filter");
                return;
            }
        }
        if (priceMax !== undefined) {
            priceMaxNum = Number(priceMax);
            if (!Number.isFinite(priceMaxNum) || priceMaxNum < 0) {
                sendError(res, 400, "Invalid priceMax filter");
                return;
            }
        }
        if (priceMinNum !== undefined && priceMaxNum !== undefined && priceMinNum > priceMaxNum) {
            sendError(res, 400, "priceMin must not be greater than priceMax");
            return;
        }

        // validate + clamp pagination
        const { page: pageNum, limit: limitNum, skip } = parsePagination(page, limit);

        const filter: any = { status: { $in: statusFilter } };
            if (floorNum !== undefined) filter.floor = floorNum;
            if (minCapacity !== undefined) filter.maxPeople = { $gte: minCapacity };
            if (priceMinNum !== undefined || priceMaxNum !== undefined) {
                filter.price = {};
            if (priceMinNum !== undefined) filter.price.$gte = priceMinNum;
            if (priceMaxNum !== undefined) filter.price.$lte = priceMaxNum;
        }

        // search theo roomCode / roomDetail (description) / areaName
        // areaName nằm ở collection Area nên phải lookup trước rồi gộp vào $or
        if (search) {
            const regex = new RegExp(escapeRegex(String(search).trim()), "i");
            const matchedAreas = await Area.find({ areaName: regex }).select("_id");
            const matchedAreaIds = matchedAreas.map((a) => a._id);

            filter.$or = [
                { roomCode: regex },
                { roomDetail: regex },
                ...(matchedAreaIds.length ? [{ areaID: { $in: matchedAreaIds } }] : []),
            ];
        }

        const total = await Room.countDocuments(filter);

        // Sort: AVAILABLE_NOW trước AVAILABLE_SOON.
        // 'available_now' < 'available_soon' theo alphabet (n < s) nên sort tăng dần
        const rooms = await Room.find(filter)
        .populate<{ areaID: { _id: string; areaName: string } }>("areaID", "areaName")
        .sort({ status: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum);

        const items = rooms.map((room) => {
        const area = room.areaID as unknown as { _id: string; areaName: string };
        return {
            roomID: room._id,
            roomCode: room.roomCode,
            areaID: area._id,
            areaName: area.areaName,
            status: room.status,
            floor: room.floor,
            maxPeople: room.maxPeople,
            price: room.price,
            description: room.roomDetail,
            availableFrom:
            room.status === RoomStatus.AVAILABLE_SOON ? room.availableFrom.toISOString() : null,
            coverImage: room.images[0] ?? null,
        };
        });

        sendSuccess(res, { items, pagination: buildPaginationMeta(total, pageNum, limitNum) }, 200);
    } catch (error) {
        next(error);
    }
};

// Get public room details
// GET /guest/rooms/:roomID
export const getPublicRoomDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {roomID} = req.params;
        if (!mongoose.isValidObjectId(roomID)) {
            sendError(res, 400, "Invalid roomID");
            return;
        }

        const room = await Room.findById(roomID)
            .populate<{ areaID: { _id: string; areaName: string } }>("areaID", "areaName");
        if (!room) {
            sendError(res, 404, "Room not found");
            return;
        }

        const allowedStatuses = [RoomStatus.AVAILABLE_NOW, RoomStatus.AVAILABLE_SOON];
        if (!allowedStatuses.includes(room.status as RoomStatus)) {
            sendError(res, 404, "Room not found");
            return;
        }

        const area = room.areaID as unknown as { _id: string; areaName: string };
        const [adminPhone, adminEmail, adminFacebook, adminZalo] = await Promise.all([
            Parameter.findOne({ name: ParameterName.ADMIN_PHONE }).lean(),
            Parameter.findOne({ name: ParameterName.ADMIN_EMAIL }).lean(),
            Parameter.findOne({ name: ParameterName.ADMIN_FACEBOOK }).lean(),
            Parameter.findOne({ name: ParameterName.ADMIN_ZALO }).lean(),
        ]);

        const data = {
            roomID: room._id,
            roomCode: room.roomCode,
            areaID: area._id,
            areaNam: area.areaName,
            status: room.status,
            floor: room.floor,
            maxPeolple: room.maxPeople,
            roomDetail: room.roomDetail,
            price: room.price,
            deposit: room.deposit,
            availableFrom: room.status === RoomStatus.AVAILABLE_SOON ? room.availableFrom.toISOString() : null,
            images: room.images,
            contact: {
                adminPhone: adminPhone?.value ?? null,
                adminEmail: adminEmail?.value ?? null,
                adminFacebook: adminFacebook?.value ?? null,
                adminZalo: adminZalo?.value ?? null,
            },
        }
        sendSuccess(res, data, 200);

    } catch (error) {
        next(error)
    }
}
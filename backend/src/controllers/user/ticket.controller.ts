import { NextFunction, Response } from "express";
import { UserAuthRequest } from "../../middlewares/auth.middleware.js";
import { TicketStatus, TicketType } from "../../models/enums.js";
import { sendError, sendSuccess } from "../../utils/response.js";
import { buildPaginationMeta, parsePagination } from "../../utils/pagination.js";
import Room from "../../models/Room.js";
import fs from "fs";
import Ticket from "../../models/Ticket.js";
import { buildTicketDisplayID } from "../../utils/displayId.js";
import Complain from "../../models/Complain.js";
import Repair from "../../models/Repair.js";
import Area from "../../models/Area.js";
import Facility from "../../models/Facility.js";
import FacilityType from "../../models/FacilityType.js";
import mongoose from "mongoose";

// Get all user tickets with filter and search
// GET /api/user/tickets
export const getAllTickets = async (req: UserAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { roomID, startDate } = req.auth!;
        const { search, type, status, page, limit } = req.query;

        const allowedStatuses = [TicketStatus.DONE, TicketStatus.IN_PROGRESS, TicketStatus.NEED_ACTION];
        if (status && !allowedStatuses.includes(status as TicketStatus)) {
            sendError(res, 400, "Invalid status filter");
            return;
        }
        const allowedTypes = [TicketType.COMPLAIN, TicketType.REPAIR];
        if (type && !allowedTypes.includes(type as TicketType)) {
            sendError(res, 400, "Invalid type filter");
            return;
        }
        const { page: pageNum, limit: limitNum } = parsePagination(page, limit);

        const room = await Room.findById(roomID);
        if (!room) { sendError(res, 404, "Room not found"); return; }

        const filter: any = {
            roomID,
            createDate: { $gte: new Date(startDate) },
        };
        if (status) filter.status = status;
        if (type) filter.ticketType = type;
        const allTickets = await Ticket.find(filter).sort({ createDate: -1 });

        // tách ticketID theo loại để batch-fetch
        const complainTicketIDs = allTickets
            .filter((t) => t.ticketType === TicketType.COMPLAIN)
            .map((t) => t._id);
        const repairTicketIDs = allTickets
            .filter((t) => t.ticketType === TicketType.REPAIR)
            .map((t) => t._id);

        const [complains, repairs] = await Promise.all([
            Complain.find({ ticketID: { $in: complainTicketIDs } }),
            Repair.find({ ticketID: { $in: repairTicketIDs } }),
        ]);

        const complainByTicketID = new Map(complains.map((c) => [c.ticketID.toString(), c]));
        const repairByTicketID = new Map(repairs.map((r) => [r.ticketID.toString(), r]));

        // lấy area cho complain (theo areaID trên complain), room theo roomID trên complain (nếu có)
        const areaIDs = [...new Set(complains.map((c) => c.areaID.toString()))];
        const complainRoomIDs = [
            ...new Set(complains.filter((c) => c.roomID).map((c) => c.roomID!.toString())),
        ];
        const [areas, complainRooms] = await Promise.all([
            Area.find({ _id: { $in: areaIDs } }),
            Room.find({ _id: { $in: complainRoomIDs } }),
        ]);
        const areaNameByID = new Map(areas.map((a) => [a._id.toString(), a.areaName]));
        const roomCodeByID = new Map(complainRooms.map((r) => [r._id.toString(), r.roomCode]));

        // lấy facility + facility type cho repair
        const facilityIDs = [...new Set(repairs.map((r) => r.facilityID.toString()))];
        const facilities = await Facility.find({ _id: { $in: facilityIDs } });
        const typeIDs = [...new Set(facilities.map((f) => f.typeID.toString()))];
        const facilityTypes = await FacilityType.find({ _id: { $in: typeIDs } });
        const typeNameByID = new Map(facilityTypes.map((ft) => [ft._id.toString(), ft.typeName]));
        const typeNameByFacilityID = new Map(
            facilities.map((f) => [f._id.toString(), typeNameByID.get(f.typeID.toString()) ?? ""])
        );

        let mapped = allTickets.map((tick) => {
            const d = new Date(tick.createDate);
            const displayID = buildTicketDisplayID(tick.ticketType, room.roomCode, d, tick._id);

            let description = "";
            let location = "";
            let image = "";

            if (tick.ticketType === TicketType.COMPLAIN) {
                const complain = complainByTicketID.get(tick._id.toString());
                if (complain) {
                    description = complain.description;
                    const areaName = areaNameByID.get(complain.areaID.toString()) ?? "";
                    const roomCode = complain.roomID
                        ? roomCodeByID.get(complain.roomID.toString()) ?? ""
                        : "";
                    location = roomCode ? `${areaName} ${roomCode}` : areaName;
                }
            } else if (tick.ticketType === TicketType.REPAIR) {
                const repair = repairByTicketID.get(tick._id.toString());
                if (repair) {
                    description = repair.description;
                    location = typeNameByFacilityID.get(repair.facilityID.toString()) ?? "";
                    image = repair.facilityImage;
                }
            }

            return {
                ticketID: tick._id,
                displayID,
                description,
                location,
                image,
                roomCode: room.roomCode,
                ticketType: tick.ticketType,
                createDate: tick.createDate.toISOString(),
                resolveDate: tick.resolveDate ? tick.resolveDate.toISOString() : null,
                status: tick.status,
            };
        });

        if (search) {
            const searchStr = String(search).trim().toLowerCase();
            mapped = mapped.filter((item) =>
                item.displayID.toLowerCase().includes(searchStr) ||
                item.description.toLowerCase().includes(searchStr) ||
                item.location.toLowerCase().includes(searchStr)
            );
        }

        const total = mapped.length;
        const data = mapped.slice((pageNum - 1) * limitNum, pageNum * limitNum);

        sendSuccess(res, {
            items: data,
            pagination: buildPaginationMeta(total, pageNum, limitNum),
        });
    } catch (error) {
        next(error);
    }
}

// Get repair options
// GET /api/user/tickets/repairs/options
export const getRepairOptions = async (req: UserAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { roomID } = req.auth!;

        const room = await Room.findById(roomID);
        if (!room) { sendError(res, 404, "Room not found"); return; }

        const facilities = await Facility.find({ roomID });
        const typeIDs = [...new Set(facilities.map((f) => f.typeID.toString()))];
        const facilityTypes = await FacilityType.find({ _id: { $in: typeIDs } });
        const typeNameByID = new Map(facilityTypes.map((ft) => [ft._id.toString(), ft.typeName]));

        const mappedFacilities = facilities.map((f) => ({
            facilityID: f._id,
            typeID: f.typeID,
            typeName: typeNameByID.get(f.typeID.toString()) ?? "",
        }));

        sendSuccess(res, {
            roomID: room._id,
            roomCode: room.roomCode,
            facilities: mappedFacilities,
        });

    } catch (error) {
        next(error);
    }
}

// Get complain options
// GET /api/user/tickets/complains/options
export const getComplainOptions = async (_req: UserAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const [areas, rooms] = await Promise.all([
            Area.find().lean(),
            Room.find().lean()
        ]);

        const roomsByAreaID = new Map<string, { roomID: any; roomCode: string }[]>();
        for (const r of rooms) {
            const key = r.areaID.toString();
            if (!roomsByAreaID.has(key)) roomsByAreaID.set(key, []);
            roomsByAreaID.get(key)!.push({ roomID: r._id, roomCode: r.roomCode });
        }

        const mappedAreas = areas.map((a) => ({
            areaID: a._id,
            areaName: a.areaName,
            rooms: roomsByAreaID.get(a._id.toString()) ?? [],
        }));

        sendSuccess(res, { areas: mappedAreas });
    } catch (error) {
        next(error);
    }
}

// Create repair ticket
// POST /api/user/tickets/repairs
export const createRepairTicket = async (req: UserAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const file = req.file;
    const cleanupFile = () => {
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    };

    try {
        const { roomID } = req.auth!;

        // validate input
        if (!file) { sendError(res, 400, "Facility image is required"); return; }
        const { facilityID, description } = req.body;
        if (!facilityID || !description) {
            cleanupFile();
            sendError(res, 400, "Please enter all required fields");
            return;
        }
        if (!mongoose.isValidObjectId(facilityID)) {
            cleanupFile();
            sendError(res, 400, "Invalid facilityID");
            return;
        }
        const room = await Room.findById(roomID);
        if (!room) {
            cleanupFile();
            sendError(res, 404, "Room not found");
            return;
        }
        // facility phải thuộc đúng phòng của tenant
        const facility = await Facility.findOne({ _id: facilityID, roomID });
        if (!facility) {
            cleanupFile();
            sendError(res, 403, "Facility does not belong to your room");
            return;
        }

        const now = new Date();
        const imagePath = `/uploads/repair/${file.filename}`;

        const session = await mongoose.startSession();
        let ticket, repair;

        try {
            session.startTransaction();

            const createdTicket = await Ticket.create(
                [{
                    roomID: room._id,
                    ticketType: TicketType.REPAIR,
                    createDate: now,
                    status: TicketStatus.NEED_ACTION,
                }],
                { session }
            );
            ticket = createdTicket[0];

            const createdRepair = await Repair.create(
                [{
                    ticketID: ticket._id,
                    facilityID: facility._id,
                    description,
                    facilityImage: imagePath,
                }],
                { session }
            );
            repair = createdRepair[0];

            await session.commitTransaction();
        } catch (err) {
            await session.abortTransaction();
            cleanupFile();
            throw err;
        } finally {
            session.endSession();
        }

        const displayID = buildTicketDisplayID(ticket.ticketType, room.roomCode, now, ticket._id);

        sendSuccess(res, {
            ticketID: ticket._id,
            type: ticket.ticketType,
            ticketName: displayID,
            roomID: room._id,
            facilityID: repair.facilityID,
            description: repair.description,
            facilityImage: repair.facilityImage,
            createDate: ticket.createDate.toISOString(),
            status: ticket.status,
        });
        
    } catch (error: any) {
        if (error?.status) {
            sendError(res, error.status, error.message);
            return;
        }

        next(error);
    }
}

// Create complain ticket
// POST /api/user/tickets/complains
export const createComplainTicket = async (req: UserAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { roomID } = req.auth!;
        const { areaID, roomID: targetRoomID, description } = req.body;

        if (!areaID || !description) {
            sendError(res, 400, "Please enter all required fields");
            return;
        }
        if (!mongoose.isValidObjectId(areaID)) {
            sendError(res, 400, "Invalid areaID");
            return;
        }
        if (targetRoomID !== undefined && targetRoomID !== null && !mongoose.isValidObjectId(targetRoomID)) {
            sendError(res, 400, "Invalid roomID");
            return;
        }

        const area = await Area.findById(areaID);
        if (!area) { sendError(res, 404, "Area not found"); return; }
        // nếu có chọn room cụ thể, room đó phải thuộc đúng area
        let targetRoom = null;
        if (targetRoomID) {
            targetRoom = await Room.findOne({ _id: targetRoomID, areaID });
            if (!targetRoom) {
                sendError(res, 400, "Room does not belong to the selected area");
                return;
            }
        }

        const room = await Room.findById(roomID);
        if (!room) { sendError(res, 404, "Room not found"); return; }

        const now = new Date();

        const session = await mongoose.startSession();
        let ticket, complain;

        try {
            session.startTransaction();
            const createdTicket = await Ticket.create(
                [{
                    roomID: room._id,
                    ticketType: TicketType.COMPLAIN,
                    createDate: now,
                    status: TicketStatus.NEED_ACTION,
                }],
                { session }
            );
            ticket = createdTicket[0];

            const createdComplain = await Complain.create(
                [{
                    ticketID: ticket._id,
                    areaID: area._id,
                    roomID: targetRoom ? targetRoom._id : undefined,
                    description,
                }],
                { session }
            );
            complain = createdComplain[0];

            await session.commitTransaction();
        } catch (err) {
            await session.abortTransaction();
            throw err;
        } finally {
            session.endSession();
        }

        const displayID = buildTicketDisplayID(ticket.ticketType, room.roomCode, now, ticket._id);

        sendSuccess(res, {
            ticketID: ticket._id,
            type: ticket.ticketType,
            ticketName: displayID,
            areaID: complain.areaID,
            roomID: complain.roomID ?? null,
            description: complain.description,
            createDate: ticket.createDate.toISOString(),
            status: ticket.status,
        });

    } catch (error: any) {
        if (error?.status) {
            sendError(res, error.status, error.message);
            return;
        }

        next(error);
    }
}
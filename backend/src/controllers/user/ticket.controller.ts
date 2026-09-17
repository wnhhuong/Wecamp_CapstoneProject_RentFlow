import { NextFunction, Response } from "express";
import { UserAuthRequest } from "../../middlewares/auth.middleware.js";
import { TicketStatus, TicketType } from "../../models/enums.js";
import { sendError, sendSuccess } from "../../utils/response.js";
import { buildPaginationMeta, parsePagination } from "../../utils/pagination.js";
import Room from "../../models/Room.js";
import Ticket from "../../models/Ticket.js";
import { buildTicketDisplayID } from "../../utils/displayId.js";
import Complain from "../../models/Complain.js";
import Repair from "../../models/Repair.js";
import Area from "../../models/Area.js";
import Facility from "../../models/Facility.js";
import FacilityType from "../../models/FacilityType.js";

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
        if (type) filter.type = type;
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
                }
            }

            return {
                ticketID: tick._id,
                displayID,
                description,
                location,
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

// // Get repair options
// // GET /api/user/tickets/repair/options
// export const getRepairOptions = async (req: UserAuthRequest, res: Response, next: NextFunction): Promise<void> => {
//     try {
        
//     } catch (error) {
//         next(error);
//     }
// }

// // Get complain options
// // GET /api/user/tickets/complain/options
// export const getComplainOptions = async (req: UserAuthRequest, res: Response, next: NextFunction): Promise<void> => {
//     try {
        
//     } catch (error) {
//         next(error);
//     }
// }

// // Create repair ticket
// // POST /api/user/tickets/repair
// export const createRepairTicket = async (req: UserAuthRequest, res: Response, next: NextFunction): Promise<void> => {
//     try {
        
//     } catch (error) {
//         next(error);
//     }
// }

// // Create complain ticket
// // POST /api/user/tickets/complain
// export const createComplainTicket = async (req: UserAuthRequest, res: Response, next: NextFunction): Promise<void> => {
//     try {
        
//     } catch (error) {
//         next(error);
//     }
// }
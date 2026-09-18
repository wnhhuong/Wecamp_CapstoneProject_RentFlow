import { NextFunction, Response } from "express";
import mongoose from "mongoose";
import { AdminAuthRequest } from "../../middlewares/auth.middleware.js";
import { TicketStatus, TicketType } from "../../models/enums.js";
import { sendError, sendSuccess } from "../../utils/response.js";
import { buildPaginationMeta, parsePagination } from "../../utils/pagination.js";
import { buildTicketDisplayID } from "../../utils/displayId.js";
import Room from "../../models/Room.js";
import Account from "../../models/Account.js";
import Ticket from "../../models/Ticket.js";
import Complain from "../../models/Complain.js";
import Repair from "../../models/Repair.js";
import Area from "../../models/Area.js";
import Facility from "../../models/Facility.js";
import FacilityType from "../../models/FacilityType.js";

// Lifecycle hợp lệ: chỉ tiến, không skip/backward/reopen
const NEXT_STATUS: Record<TicketStatus, TicketStatus | null> = {
    [TicketStatus.NEED_ACTION]: TicketStatus.IN_PROGRESS,
    [TicketStatus.IN_PROGRESS]: TicketStatus.DONE,
    [TicketStatus.DONE]: null,
};

// Get all tickets (toàn khu trọ) with filter/search — Admin only
// GET /api/admin/tickets
export const getAllTicketsAdmin = async (req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { search, type, status, areaID, roomID, facilityID, page, limit } = req.query;

        const allowedStatuses = [TicketStatus.NEED_ACTION, TicketStatus.IN_PROGRESS, TicketStatus.DONE];
        if (status && !allowedStatuses.includes(status as TicketStatus)) {
            sendError(res, 400, "Invalid status filter");
            return;
        }
        const allowedTypes = [TicketType.COMPLAIN, TicketType.REPAIR];
        if (type && !allowedTypes.includes(type as TicketType)) {
            sendError(res, 400, "Invalid type filter");
            return;
        }
        if (areaID && !mongoose.isValidObjectId(areaID)) {
            sendError(res, 400, "Invalid areaID filter");
            return;
        }
        if (roomID && !mongoose.isValidObjectId(roomID)) {
            sendError(res, 400, "Invalid roomID filter");
            return;
        }
        if (facilityID && !mongoose.isValidObjectId(facilityID)) {
            sendError(res, 400, "Invalid facilityID filter");
            return;
        }

        const { page: pageNum, limit: limitNum } = parsePagination(page, limit);

        // Bước 1: filter field nằm thẳng trên Ticket
        const filter: any = {};
        if (status) filter.status = status;
        if (type) filter.ticketType = type;
        if (roomID) filter.roomID = roomID;

        const allTickets = await Ticket.find(filter).sort({ createDate: -1 });

        const complainTicketIDs = allTickets.filter((t) => t.ticketType === TicketType.COMPLAIN).map((t) => t._id);
        const repairTicketIDs = allTickets.filter((t) => t.ticketType === TicketType.REPAIR).map((t) => t._id);

        const [complains, repairs] = await Promise.all([
            Complain.find({ ticketID: { $in: complainTicketIDs } }),
            Repair.find({ ticketID: { $in: repairTicketIDs } }),
        ]);

        const complainByTicketID = new Map(complains.map((c) => [c.ticketID.toString(), c]));
        const repairByTicketID = new Map(repairs.map((r) => [r.ticketID.toString(), r]));

        // room cho MỌI ticket (khác bản tenant vốn chỉ có 1 room cố định)
        const allRoomIDs = new Set<string>();
        allTickets.forEach((t) => allRoomIDs.add(t.roomID.toString()));
        complains.forEach((c) => { if (c.roomID) allRoomIDs.add(c.roomID.toString()); });
        const rooms = await Room.find({ _id: { $in: [...allRoomIDs] } });
        const roomByID = new Map(rooms.map((r) => [r._id.toString(), r]));

        // area cho complain
        const areaIDs = [...new Set(complains.map((c) => c.areaID.toString()))];
        const areas = await Area.find({ _id: { $in: areaIDs } });
        const areaNameByID = new Map(areas.map((a) => [a._id.toString(), a.areaName]));

        // facility + facility type cho repair
        const facilityIDs = [...new Set(repairs.map((r) => r.facilityID.toString()))];
        const facilities = await Facility.find({ _id: { $in: facilityIDs } });
        const typeIDs = [...new Set(facilities.map((f) => f.typeID.toString()))];
        const facilityTypes = await FacilityType.find({ _id: { $in: typeIDs } });
        const typeNameByID = new Map(facilityTypes.map((ft) => [ft._id.toString(), ft.typeName]));
        const typeNameByFacilityID = new Map(
            facilities.map((f) => [f._id.toString(), typeNameByID.get(f.typeID.toString()) ?? ""])
        );

        // accountID join qua Ticket.roomID -> Account.roomID (xem cảnh báo giả định field ở trên)
        const accounts = await Account.find({ roomID: { $in: [...allRoomIDs] } }).select("roomID");
        const accountIDByRoomID = new Map(accounts.map((a: any) => [a.roomID.toString(), a._id]));

        let mapped = allTickets.map((tick) => {
            const room = roomByID.get(tick.roomID.toString());
            const roomCode = room ? room.roomCode : "";
            const d = new Date(tick.createDate);
            const displayID = buildTicketDisplayID(tick.ticketType, roomCode, d, tick._id);

            let description = "";
            let location = "";
            let ticketAreaID: string | null = null;
            let ticketFacilityID: string | null = null;

            if (tick.ticketType === TicketType.COMPLAIN) {
                const complain = complainByTicketID.get(tick._id.toString());
                if (complain) {
                    description = complain.description;
                    ticketAreaID = complain.areaID.toString();
                    const areaName = areaNameByID.get(complain.areaID.toString()) ?? "";
                    const cRoomCode = complain.roomID
                        ? roomByID.get(complain.roomID.toString())?.roomCode ?? ""
                        : "";
                    location = cRoomCode ? `${areaName} ${cRoomCode}` : areaName;
                }
            } else if (tick.ticketType === TicketType.REPAIR) {
                const repair = repairByTicketID.get(tick._id.toString());
                if (repair) {
                    description = repair.description;
                    ticketFacilityID = repair.facilityID.toString();
                    location = typeNameByFacilityID.get(repair.facilityID.toString()) ?? "";
                }
            }

            return {
                ticketID: tick._id,
                displayID,
                ticketType: tick.ticketType,
                description,
                location,
                roomID: tick.roomID,
                roomCode,
                accountID: accountIDByRoomID.get(tick.roomID.toString()) ?? null,
                createDate: tick.createDate.toISOString(),
                resolveDate: tick.resolveDate ? tick.resolveDate.toISOString() : null,
                status: tick.status,
                _areaID: ticketAreaID,       // field nội bộ, bỏ trước khi trả response
                _facilityID: ticketFacilityID, // field nội bộ, bỏ trước khi trả response
            };
        });

        // filter theo areaID/facilityID — field đã join, không nằm thẳng trên Ticket -> filter ở JS
        if (areaID) {
            mapped = mapped.filter((item) => item._areaID === String(areaID));
        }
        if (facilityID) {
            mapped = mapped.filter((item) => item._facilityID === String(facilityID));
        }

        // search theo displayID/description/location/roomCode
        if (search) {
            const searchStr = String(search).trim().toLowerCase();
            mapped = mapped.filter((item) =>
                item.displayID.toLowerCase().includes(searchStr) ||
                item.description.toLowerCase().includes(searchStr) ||
                item.location.toLowerCase().includes(searchStr) ||
                item.roomCode.toLowerCase().includes(searchStr)
            );
        }

        const cleaned = mapped.map(({ _areaID, _facilityID, ...rest }) => rest);

        const total = cleaned.length;
        const data = cleaned.slice((pageNum - 1) * limitNum, pageNum * limitNum);

        sendSuccess(res, {
            items: data,
            pagination: buildPaginationMeta(total, pageNum, limitNum),
        });
    } catch (error) {
        next(error);
    }
};

// Update ticket status theo lifecycle NEED_ACTION -> IN_PROGRESS -> DONE — Admin only
// PATCH /api/admin/tickets/:ticketID/status
export const updateTicketStatus = async (req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { ticketID } = req.params;
        const { status } = req.body;

        if (!mongoose.isValidObjectId(ticketID)) {
            sendError(res, 400, "Invalid ticketID");
            return;
        }

        const allowedStatuses = [TicketStatus.NEED_ACTION, TicketStatus.IN_PROGRESS, TicketStatus.DONE];
        if (!status || !allowedStatuses.includes(status)) {
            sendError(res, 400, "Invalid status value");
            return;
        }

        const ticket = await Ticket.findById(ticketID);
        if (!ticket) { sendError(res, 404, "Ticket not found"); return; }

        const nextAllowed = NEXT_STATUS[ticket.status as TicketStatus];
        if (nextAllowed !== status) {
            sendError(
                res,
                409,
                `Cannot move ticket from "${ticket.status}" to "${status}". Chỉ cho phép NEED_ACTION -> IN_PROGRESS -> DONE, không skip/backward/reopen.`
            );
            return;
        }

        ticket.status = status;
        if (status === TicketStatus.DONE) {
            ticket.resolveDate = new Date();
        }
        await ticket.save();

        sendSuccess(res, {
            ticketID: ticket._id,
            status: ticket.status,
            resolveDate: ticket.resolveDate ? ticket.resolveDate.toISOString() : null,
        });
    } catch (error) {
        next(error);
    }
};
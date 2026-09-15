import { NextFunction, Response } from "express";
import { UserAuthRequest } from "../../middlewares/auth.middleware.js";
import { InvoiceStatus } from "../../models/enums.js";
import { sendError, sendSuccess } from "../../utils/response.js";
import Consumption from "../../models/Consumption.js";
import Invoice from "../../models/Invoice.js";
import Room from "../../models/Room.js";
import mongoose from "mongoose";

const pad2 = (n: number) => n.toString().padStart(2, "0");
const computeIsOverdue = (paymentDate: Date | null | undefined, dueDate: Date, now: Date): boolean => {
    if (!paymentDate) return now > dueDate;
    return paymentDate > dueDate;
};
// Get list invoices
// GET /api/user/invoices
export const getInvoiceList = async (req: UserAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { roomID, startDate } = req.auth!; 
        const { search, status, year, page, limit } = req.query;

        // validate input
        // Invoice.status chỉ dùng NOT_PAID / PAID 
        const allowedStatuses = [InvoiceStatus.NOT_PAID, InvoiceStatus.PAID];
        if (status && !allowedStatuses.includes(status as InvoiceStatus)) {
            sendError(res, 400, "Invalid status filter");
            return;
        }
        // validate + clamp pagination
        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.min(100, Math.max(1, Number(limit) || 12));
        // validate year
        let yearNum: number | undefined;
        if (year !== undefined) {
            yearNum = Number(year);
            if (!Number.isInteger(yearNum)) {
                sendError(res, 400, "Invalid year filter");
                return;
            }
        }

        const room = await Room.findById(roomID);
        if (!room) { sendError(res, 404, "Room not found"); return; }
 
        // Bước 1: lấy các Consumption thuộc current tenancy của phòng này
        const consumptions = await Consumption.find({
            roomID,
            trackingTime: { $gte: new Date(startDate) },
        }).select("_id");
        const consumptionIds = consumptions.map((c) => c._id);

        // Bước 2: filter theo status/year ngay ở DB (2 field này nằm thẳng trên Invoice, filter trực tiếp được)
        const filter: any = { comsumptionID: { $in: consumptionIds } };
        if (status) filter.status = status;
        if (yearNum !== undefined) {
            filter.createdDate = {
                $gte: new Date(yearNum, 0, 1),
                $lt: new Date(yearNum + 1, 0, 1),
            };
        }
        // Lấy toàn bộ thỏa filter
        const allInvoices = await Invoice.find(filter).sort({ createdDate: -1 });
        const now = new Date();
        let mapped = allInvoices.map((inv) => {
            const d = new Date(inv.createdDate);
            const displayID = `${room.roomCode}-${pad2(d.getDate())}${pad2(d.getMonth() + 1)}${pad2(d.getFullYear() % 100)}`;
            return {
                invoiceID: inv._id,
                displayID,
                roomCode: room.roomCode,
                createDate: inv.createdDate,
                dueDate: inv.dueDate.toISOString().split("T")[0],
                totalBill: inv.totalBill,
                status: inv.status,
                isOverdue: computeIsOverdue(inv.paymentDate, inv.dueDate, now),
                isRequestLate: inv.isRequestLate,
            };
        });

        // Bước 3: search theo displayID (roomCode-ddmmyy) — xử lý trong JS vì đây là giá trị tính toán
        if (search) {
            const searchStr = String(search).trim().toLowerCase();
            mapped = mapped.filter((item) => item.displayID.toLowerCase().includes(searchStr));
        }
 
        // Bước 4: phân trang sau khi đã search xong
        const total = mapped.length;
        const data = mapped.slice((pageNum - 1) * limitNum, pageNum * limitNum);
 
        sendSuccess(res, {
            items: data,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });

    } catch (error) {
        next(error)
    }
}

// Get invoice detail
// GET /api/user/invoices/:invoiceID
export const getInvoiceDetail = async (req: UserAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { roomID, startDate } = req.auth!;
        const { invoiceID } = req.params;

        if (!mongoose.isValidObjectId(invoiceID)) {
            sendError(res, 400, "Invalid invoiceID");
            return;
        }

        const invoice = await Invoice.findById(invoiceID);
        if (!invoice) { sendError(res, 404, "Invoice not found"); return; }
 
        const consumption = await Consumption.findById(invoice.comsumptionID);
        if (!consumption) { sendError(res, 404, "Related consumption not found"); return; }

        // chặn IDOR — invoice phải thuộc đúng phòng + current tenancy của người đang đăng nhập
        const belongsToCurrentTenancy =
            consumption.roomID.toString() === roomID &&
            consumption.trackingTime >= new Date(startDate);
        if (!belongsToCurrentTenancy) {
            sendError(res, 403, "You do not have access to this invoice");
            return;
        }

        const room = await Room.findById(roomID);
        if (!room) { sendError(res, 404, "Room not found"); return; }
 
        const now = new Date();
        const d = new Date(invoice.createdDate);
        const displayID = `${room.roomCode}-${pad2(d.getDate())}${pad2(d.getMonth() + 1)}${pad2(d.getFullYear() % 100)}`;
        
        sendSuccess(res, {
            invoiceID: displayID,
            roomCode: room.roomCode,
            createDate: invoice.createdDate,
            paymentDate: invoice.paymentDate ?? null,
            dueDate: invoice.dueDate.toISOString().split("T")[0],
            status: invoice.status,
            isOverdue: computeIsOverdue(invoice.paymentDate, invoice.dueDate, now),
            isRequestLate: invoice.isRequestLate,
            meterReading: consumption.meterReading,
            breakdown: {
                room: invoice.roomBill,
                electrical: invoice.electricalBill,
                water: invoice.waterBill,
                wifi: invoice.wifiBill,
                parking: invoice.parkingBill,
                other: invoice.otherBill,
            },
            totalBill: invoice.totalBill,
        });
    } catch (error) {
        next(error)
    }
}
import { NextFunction, Response } from "express";
import { UserAuthRequest } from "../../middlewares/auth.middleware.js";
import { InvoiceStatus, RequestStatus, RequestType } from "../../models/enums.js";
import { sendError, sendSuccess } from "../../utils/response.js";
import Consumption from "../../models/Consumption.js";
import Invoice from "../../models/Invoice.js";
import Room from "../../models/Room.js";
import mongoose from "mongoose";
import PaidRequest from "../../models/PaidRequest.js";
import RequestModel from "../../models/Request.js";
import { buildPaginationMeta, parsePagination } from "../../utils/pagination.js";
import { formatVNShortDate } from "../../utils/dateFormat.js";
import LatePaymentRequest from "../../models/LatePaymentRequest.js";

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
        const { page: pageNum, limit: limitNum } = parsePagination(page, limit);

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
        const filter: any = { consumptionID: { $in: consumptionIds } };
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
            const displayID = `${room.roomCode}-${formatVNShortDate(new Date(inv.createdDate))}`;
            return {
                invoiceID: inv._id,
                displayID,
                roomCode: room.roomCode,
                createDate: inv.createdDate,
                dueDate: inv.dueDate.toISOString(),
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
            pagination: buildPaginationMeta(total, pageNum, limitNum),
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
 
        const consumption = await Consumption.findById(invoice.consumptionID);
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
        const displayID = `${room.roomCode}-${formatVNShortDate(new Date(invoice.createdDate))}`;
        
        sendSuccess(res, {
            invoiceID: displayID,
            roomCode: room.roomCode,
            createDate: invoice.createdDate,
            paymentDate: invoice.paymentDate ?? null,
            dueDate: invoice.dueDate.toISOString(),
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

// Create PAID request
// POST /api/user/invoices/:invoiceID/paid-request
export const submitPaidRequest = async (req: UserAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { roomID, startDate, userID } = req.auth!;
        const { invoiceID } = req.params;

        if (!mongoose.isValidObjectId(invoiceID)) {
            sendError(res, 400, "Invalid invoiceID");
            return;
        }

        const invoice = await Invoice.findById(invoiceID);
        if (!invoice) { sendError(res, 404, "Invoice not found"); return; }

        // chặn IDOR — invoice phải thuộc đúng phòng + current tenancy của người đang đăng nhập
        const consumption = await Consumption.findById(invoice.consumptionID);
        if (!consumption) { sendError(res, 404, "Related consumption not found"); return; }

        const belongsToCurrentTenancy =
            consumption.roomID.toString() === roomID &&
            consumption.trackingTime >= new Date(startDate);
        if (!belongsToCurrentTenancy) {
            sendError(res, 403, "You do not have access to this invoice");
            return;
        }

        // Invoice PAID không thể tạo PAID Request mới
        if (invoice.status !== InvoiceStatus.NOT_PAID) {
            sendError(res, 409, "Invoice is already paid");
            return;
        }

        // Một Invoice chỉ có tối đa một PAID Request đang PENDING
        const existingPaidRequests = await PaidRequest.find({ invoiceID: invoice._id }).select("requestID");
        if (existingPaidRequests.length > 0) {
            const requestIds = existingPaidRequests.map((pr) => pr.requestID);
            const pendingPaidRequest = await RequestModel.findOne({
                _id: { $in: requestIds },
                status: RequestStatus.PENDING,
            });
            if (pendingPaidRequest) {
                sendError(res, 409, "A pending paid request already exists for this invoice");
                return;
            }
        }

        const now = new Date();
        const session = await mongoose.startSession();
        let request, paidRequest;

        try {
            session.startTransaction();

            const createdRequest = await RequestModel.create(
                [{
                    type: RequestType.PAID,
                    roomID,
                    userID,
                    createDate: now,
                    status: RequestStatus.PENDING,
                }],
                { session }
            );
            request = createdRequest[0];

            const createdPaidRequest = await PaidRequest.create(
                [{
                    requestID: request._id,
                    invoiceID: invoice._id,
                }],
                { session }
            );
            paidRequest = createdPaidRequest[0];

            await session.commitTransaction();
        } catch (err) {
            await session.abortTransaction();
            throw err;
        } finally {
            session.endSession();
        }

        sendSuccess(res, {
            requestID: request._id,
            invoiceID: paidRequest.invoiceID,
            type: request.type,
            createDate: request.createDate.toISOString(),
            status: request.status,
        });
    } catch (error) {
        next(error);
    }
}

// Create LATE_PAYMENT request
// POST /api/user/invoices/:invoiceID/late-payment-request
export const submitLatePaymentRequest = async (req: UserAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { roomID, startDate, userID } = req.auth!;
        const { invoiceID } = req.params;

        if (!mongoose.isValidObjectId(invoiceID)) {
            sendError(res, 400, "Invalid invoiceID");
            return;
        }

        const invoice = await Invoice.findById(invoiceID);
        if (!invoice) { sendError(res, 404, "Invoice not found"); return; }

        // chặn IDOR — invoice phải thuộc đúng phòng + current tenancy của người đang đăng nhập
        const consumption = await Consumption.findById(invoice.consumptionID);
        if (!consumption) { sendError(res, 404, "Related consumption not found"); return; }

        const belongsToCurrentTenancy =
            consumption.roomID.toString() === roomID &&
            consumption.trackingTime >= new Date(startDate);
        if (!belongsToCurrentTenancy) {
            sendError(res, 403, "You do not have access to this invoice");
            return;
        }

        // Invoice PAID không thể tạo LATE_PAYMENT Request mới
        if (invoice.status !== InvoiceStatus.NOT_PAID) {
            sendError(res, 409, "Invoice is already paid");
            return;
        }

        // Không tạo Late Payment Request cho invoice đã có PAID request
        const existingPaidRequest = await PaidRequest.findOne({ invoiceID: invoice._id }).lean();
        if (existingPaidRequest) {
            sendError(res, 409, "A paid request already exists for this invoice");
            return;
        }

        // Một Invoice chỉ có tối đa một Late Payment Request
        const existingLatePaymentRequest = await LatePaymentRequest.findOne({ invoiceID: invoice._id }).lean();
        if (existingLatePaymentRequest) {
            sendError(res, 409, "A late payment request already exists for this invoice");
            return;
        }

        const now = new Date();
        const session = await mongoose.startSession();
        let request, latePaymentRequest;

        try {
            session.startTransaction();

            const createdRequest = await RequestModel.create(
                [{
                    type: RequestType.DELAY,
                    roomID,
                    userID,
                    createDate: now,
                    status: RequestStatus.PENDING,
                }],
                { session }
            );
            request = createdRequest[0];

            const createdLateRequest = await LatePaymentRequest.create(
                [{
                    requestID: request._id,
                    invoiceID: invoice._id,
                }],
                { session }
            );
            latePaymentRequest = createdLateRequest[0];

            await session.commitTransaction();
        } catch (err) {
            await session.abortTransaction();
            throw err;
        } finally {
            session.endSession();
        }

        sendSuccess(res, {
            requestID: request._id,
            invoiceID: latePaymentRequest.invoiceID,
            type: request.type,
            createDate: request.createDate.toISOString(),
            status: request.status,
        });
    } catch (error) {
        next(error);
    }
}
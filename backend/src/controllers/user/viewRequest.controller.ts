import { NextFunction, Response } from "express";
import { UserAuthRequest } from "../../middlewares/auth.middleware.js";
import { RequestStatus, RequestType } from "../../models/enums.js";
import { sendError, sendSuccess } from "../../utils/response.js";
import { buildPaginationMeta, parsePagination } from "../../utils/pagination.js";
import Room from "../../models/Room.js";
import RequestModel from "../../models/Request.js";
import mongoose from "mongoose";
import { buildDetails, DETAIL_MODEL_MAP } from "../../services/request.service.js";
import Invoice from "../../models/Invoice.js";
import Contract from "../../models/Contract.js";
import { buildContractDisplayID, buildInvoiceDisplayID, buildRequestDisplayID } from "../../utils/displayId.js";

// Get user's list requests
// GET /api/user/requests
export const getRequestList = async (req: UserAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { roomID, startDate } = req.auth!;
        const { search, type, status, page, limit } = req.query;

        const allowedStatuses = [RequestStatus.PENDING, RequestStatus.APPROVED];
        if (status && !allowedStatuses.includes(status as RequestStatus)) {
            sendError(res, 400, "Invalid status filter");
            return;
        }
        const allowedTypes = [RequestType.CHECKOUT, RequestType.CONSUMP, RequestType.DELAY,
            RequestType.EXTEND, RequestType.MOVEOUT, RequestType.PAID
        ];
        if (type && !allowedTypes.includes(type as RequestType)) {
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
        const allRequests = await RequestModel.find(filter).sort({ createDate: -1 });

        let mapped = allRequests.map((myReq) => {
            const d = new Date(myReq.createDate);
            const displayID = buildRequestDisplayID(myReq.type, room.roomCode, d);
            return {
                requestID: myReq._id,
                displayID,
                roomCode: room.roomCode,
                type: myReq.type,
                createDate: myReq.createDate.toISOString(),
                resolveDate: myReq.resolveDate ?  myReq.resolveDate.toISOString() : null,
                status: myReq.status
            };
        });

        if (search) {
            const searchStr = String(search).trim().toLowerCase();
            mapped = mapped.filter((item) => item.displayID.toLowerCase().includes(searchStr));
        }

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

// Get request's detail
// GET /api/user/requests/:requestID
export const getRequestDetails = async (req: UserAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { roomID, startDate } = req.auth!;
        const { requestID } = req.params;

        if (!mongoose.isValidObjectId(requestID)) {
            sendError(res, 400, "Invalid requestID");
            return;
        }

        const request = await RequestModel.findById(requestID);
        if (!request) { sendError(res, 404, "Request not found"); return; }

        // chặn IDOR — request phải thuộc đúng phòng + current tenancy của người đang đăng nhập
        const belongsToCurrentTenancy =
            request.roomID.toString() === roomID &&
            request.createDate >= new Date(startDate);
        if (!belongsToCurrentTenancy) {
            sendError(res, 403, "You do not have access to this request");
            return;
        }

        const room = await Room.findById(roomID);
        if (!room) { sendError(res, 404, "Room not found"); return; }

        const DetailModel = DETAIL_MODEL_MAP[request.type];
        if (!DetailModel) {
            sendError(res, 500, `No detail model configured for request type "${request.type}"`);
            return;
        }

        const detailDoc = await DetailModel.findOne({ requestID: request._id });
        if (!detailDoc) {
            sendError(res, 404, "Request detail not found");
            return;
        }

        const details = buildDetails(request.type, detailDoc);
        if (!details) {
            sendError(res, 500, "Unknown request type");
            return;
        }

        // Với type có invoiceID (delay, paid) -> thêm invoiceDisplayID cho dễ đọc, giữ nguyên invoiceID thật
        if ((request.type === RequestType.DELAY || request.type === RequestType.PAID) && details.invoiceID) {
            const relatedInvoice = await Invoice.findById(details.invoiceID);
            if (relatedInvoice) {
                details.invoiceDisplayID = buildInvoiceDisplayID(room.roomCode, new Date(relatedInvoice.createdDate));
            }
        }

        // Với type có contractID (checkout, extend, moveout) -> thêm contractDisplayID cho dễ đọc
        if (
            (request.type === RequestType.CHECKOUT || request.type === RequestType.EXTEND || request.type === RequestType.MOVEOUT) &&
            details.contractID
        ) {
            const relatedContract = await Contract.findById(details.contractID);
            if (relatedContract) {
                details.contractDisplayID = buildContractDisplayID(
                    room.roomCode,
                    new Date(relatedContract.startDate),
                );
            }
        }

        const displayID = buildRequestDisplayID(request.type, room.roomCode, new Date(request.createDate));

        sendSuccess(res, {
            requestID: request._id,
            displayID,
            roomCode: room.roomCode,
            type: request.type,
            status: request.status,
            createDate: request.createDate.toISOString(),
            resolveDate: request.resolveDate ? request.resolveDate.toISOString() : null,
            details,
        });

    } catch (error) {
        next(error)
    }
}
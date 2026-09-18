import { NextFunction, Response } from "express";
import { UserAuthRequest } from "../../middlewares/auth.middleware.js";
import Room from "../../models/Room.js";
import { sendError, sendSuccess } from "../../utils/response.js";
import { endOfVNDay, getVNDateParts, startOfVNDay } from "../../utils/dateFormat.js";
import Consumption from "../../models/Consumption.js";
import Invoice from "../../models/Invoice.js";
import { ParameterName, RequestStatus, RequestType, TicketStatus, TicketType } from "../../models/enums.js";
import { computeIsOverdue } from "./invoice.controller.js";
import Parameter from "../../models/Parameter.js";
import RequestModel from "../../models/Request.js";
import Ticket from "../../models/Ticket.js";
import Repair from "../../models/Repair.js";
import Complain from "../../models/Complain.js";
import { buildRequestDisplayID } from "../../utils/displayId.js";

// Get user dashboard
// GET /api/user/dashboard
export const getDashboard = async (req: UserAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { roomID, startDate } = req.auth!;

        const room = await Room.findById(roomID);
        if (!room) { sendError(res, 404, "Room not found"); return; }
        
        const now = new Date();
        const { year: vnYear, month: vnMonth } = getVNDateParts(now);

         // 1. currentInvoice: invoice của tháng hiện tại (theo createdDate), thuộc current tenancy ----
        const consumptions = await Consumption.find({
            roomID,
            trackingTime: { $gte: new Date(startDate) },
        }).select("_id");
        const consumptionIds = consumptions.map((c) => c._id);
 
        const monthStart = startOfVNDay(vnYear, vnMonth, 1);
        const nextMonth = vnMonth === 12 ? 1 : vnMonth + 1;
        const nextMonthYear = vnMonth === 12 ? vnYear + 1 : vnYear;
        const monthEnd = startOfVNDay(nextMonthYear, nextMonth, 1); // mốc đầu tháng sau (exclusive)
 
        const invoiceThisMonth = await Invoice.findOne({
            consumptionID: { $in: consumptionIds },
            createdDate: { $gte: monthStart, $lt: monthEnd },
        });
 
        const currentInvoice = invoiceThisMonth
            ? {
                  invoiceID: invoiceThisMonth._id,
                  totalBill: invoiceThisMonth.totalBill,
                  status: invoiceThisMonth.status,
                  isOverdue: computeIsOverdue(invoiceThisMonth.paymentDate, invoiceThisMonth.dueDate, now),
                  dueDate: invoiceThisMonth.dueDate,
                  breakdown: {
                      room: invoiceThisMonth.roomBill,
                      electrical: invoiceThisMonth.electricalBill,
                      water: invoiceThisMonth.waterBill,
                      wifi: invoiceThisMonth.wifiBill,
                      parking: invoiceThisMonth.parkingBill,
                      other: invoiceThisMonth.otherBill,
                  },
              }
            : null;
        
        // 2. electricityReminder ----
        const [startDayParam, endDayParam] = await Promise.all([
            Parameter.findOne({ name: ParameterName.METER_READING_START_DAY }),
            Parameter.findOne({ name: ParameterName.METER_READING_END_DAY }),
        ]);
        if (!startDayParam || !endDayParam) {
            sendError(res, 500, "Meter reading parameters are not configured");
            return;
        }
        const startDay = Number(startDayParam.value);
        const endDay = Number(endDayParam.value);
        const windowStart = startOfVNDay(vnYear, vnMonth, startDay);
        const windowEnd = endOfVNDay(vnYear, vnMonth, endDay);
 
        const [existingRequest, existingConsumptionInWindow] = await Promise.all([
            RequestModel.findOne({
                roomID,
                type: RequestType.CONSUMP,
                createDate: { $gte: windowStart, $lte: windowEnd },
            }),
            Consumption.findOne({
                roomID,
                trackingTime: { $gte: windowStart, $lte: windowEnd },
            }),
        ]);
 
        let state: "not_due" | "due_not_uploaded" | "submitted";
        if (existingRequest || existingConsumptionInWindow) {
            state = "submitted";
        } else if (now < windowStart) {
            state = "not_due";
        } else {
            // bao gồm cả case đang trong window lẫn đã quá windowEnd mà vẫn chưa nộp
            state = "due_not_uploaded";
        }
 
        const electricityReminder = {
            state,
            startDate: windowStart,
            endDate: windowEnd,
        };

        // ---- 3. activeTickets: status khác DONE ----
        const activeTicketDocs = await Ticket.find({
            roomID,
            status: { $ne: TicketStatus.DONE },
        }).sort({ createDate: -1 });

        const activeTickets = await Promise.all(
            activeTicketDocs.map(async (t) => {
                let description: string | null = null;
 
                if (t.ticketType === TicketType.REPAIR) {
                    const repair = await Repair.findOne({ ticketID: t._id });
                    description = repair?.description ?? null;
                } else if (t.ticketType === TicketType.COMPLAIN) {
                    const complain = await Complain.findOne({ ticketID: t._id });
                    description = complain?.description ?? null;
                }
 
                return {
                    ticketID: t._id,
                    ticketType: t.ticketType,
                    discription: description,
                    status: t.status,
                    createDate: t.createDate,
                };
            })
        );

        // ---- 4. pendingRequests: status pending, thuộc current tenancy ----
        const pendingRequestDocs = await RequestModel.find({
            roomID,
            createDate: { $gte: new Date(startDate) },
            status: RequestStatus.PENDING,
        }).sort({ createDate: -1 });
 
        const pendingRequests = pendingRequestDocs.map((r) => ({
            requestID: r._id,
            displayID: buildRequestDisplayID(r.type, room.roomCode, new Date(r.createDate)),
            type: r.type,
            createDate: r.createDate,
            status: r.status,
        }));

        sendSuccess(res, {
            currentInvoice,
            electricityReminder,
            activeTickets,
            pendingRequests,
        });

    } catch (error) {
        next(error)
    }
}
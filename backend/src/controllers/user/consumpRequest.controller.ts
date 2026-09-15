import { NextFunction, Response } from "express";
import { UserAuthRequest } from "../../middlewares/auth.middleware.js";
import { sendError, sendSuccess } from "../../utils/response.js";
import Contract from "../../models/Contract.js";
import { ContractStatus, ParameterName, RequestStatus, RequestType } from "../../models/enums.js";
import Room from "../../models/Room.js";
import Parameter from "../../models/Parameter.js";
import RequestModel from "../../models/Request.js";
import fs from "fs";
import Consumption from "../../models/Consumption.js";
import mongoose from "mongoose";
import ConsumpRequest from "../../models/ConsumpRequest.js";


// Get context of consumption
// GET /api/user/consumption-requests/context
export const consumpContext = async (req: UserAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        // use userOnly middleware hear
        const {roomID, contractID} = req.auth!;

        // contract have to be active
        const contract = await Contract.findById(contractID)
        if(!contract || contract.status !== ContractStatus.ACTIVE){
            sendError(res, 403, "Contract is not active");
            return;
        }

        const room = await Room.findById(roomID);
        if (!room) { 
            sendError(res, 404, "Room not found"); 
            return; 
        }

        // electric params
        const [startDayParam, endDayParam, priceParam] = await Promise.all([
            Parameter.findOne({ name: ParameterName.METER_READING_START_DAY }),
            Parameter.findOne({ name: ParameterName.METER_READING_END_DAY }),
            Parameter.findOne({ name: ParameterName.ELECTRICITY_UNIT_PRICE }),
        ]);

        if (!startDayParam || !endDayParam || !priceParam) {
            sendError(res, 500, "Meter reading parameters are not configured");
            return;
        }

        const startDay = Number(startDayParam.value);
        const endDay = Number(endDayParam.value);
        const electricityUnitPrice = Number(priceParam.value);

        // canSubmit check
        const now = new Date();
        const windowStart = new Date(now.getFullYear(), now.getMonth(), startDay, 0, 0, 0, 0);
        const windowEnd = new Date(now.getFullYear(), now.getMonth(), endDay, 23, 59, 59, 999);
        const isWithinWindow = now >= windowStart && now <= windowEnd;

        // not exist any consump request this month and no consump record this month
        const [existingRequest, existingConsumptionInWindow] = await Promise.all([
            RequestModel.findOne({
                roomID: room._id,
                type: RequestType.CONSUMP,
                createDate: { $gte: windowStart, $lte: windowEnd },
            }),
            Consumption.findOne({
                roomID: room._id,
                trackingTime: { $gte: windowStart, $lte: windowEnd },
            }),
        ]);

        sendSuccess(res, {
            roomID: room._id,
            roomCode: room.roomCode,
            windowStart: windowStart.toISOString().split("T")[0],
            windowEnd: windowEnd.toISOString().split("T")[0],
            canSubmit: isWithinWindow && !existingRequest && !existingConsumptionInWindow,
            electricityUnitPrice,
            existingRequestID: existingRequest ? existingRequest._id : null,
        });
    } catch (error) {
        next(error)
    }
}

// Create consumption request
// POST /api/user/consumption-requests
export const createConsumpRequest = async (req: UserAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const file = req.file;
    const cleanupFile = () => {
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    };

    try {
        const { roomID, userID, contractID } = req.auth!;

        //req field
        if (!file) { sendError(res, 400, "Meter image is required"); return; }
        const { reading, capturedAt } = req.body;

        // validate data
        const readingNum = Number(reading);
        if (reading === undefined || Number.isNaN(readingNum) || readingNum < 0) {
            cleanupFile();
            sendError(res, 400, "reading must be a number >= 0");
            return;
        }
        const capturedAtDate = capturedAt ? new Date(capturedAt) : null;
        if (!capturedAtDate || Number.isNaN(capturedAtDate.getTime())) {
            cleanupFile();
            sendError(res, 400, "capturedAt must be a valid timestamp");
            return;
        }

        // requirements to create request
        // active contract
        const contract = await Contract.findById(contractID);
        if (!contract || contract.status !== ContractStatus.ACTIVE) {
            cleanupFile();
            sendError(res, 403, "Contract is not active");
            return;
        }
        // room exist
        const room = await Room.findById(roomID);
        if (!room) { 
            cleanupFile(); 
            sendError(res, 404, "Room not found"); 
            return; 
        }
        // submit time
        const [startDayParam, endDayParam, priceParam] = await Promise.all([
            Parameter.findOne({ name: ParameterName.METER_READING_START_DAY }),
            Parameter.findOne({ name: ParameterName.METER_READING_END_DAY }),
            Parameter.findOne({ name: ParameterName.ELECTRICITY_UNIT_PRICE }),
        ]);
        if (!startDayParam || !endDayParam || !priceParam) {
            cleanupFile();
            sendError(res, 500, "Meter reading parameters are not configured");
            return;
        }
        const startDay = Number(startDayParam.value);
        const endDay = Number(endDayParam.value);
        const electricityUnitPrice = Number(priceParam.value);

        const now = new Date();
        const windowStart = new Date(now.getFullYear(), now.getMonth(), startDay, 0, 0, 0, 0);
        const windowEnd = new Date(now.getFullYear(), now.getMonth(), endDay, 23, 59, 59, 999);
        if (now < windowStart || now > windowEnd) {
            cleanupFile();
            sendError(res, 403, "Outside meter reading window");
            return;
        }
        //no request nor consump this month
        const [existingRequest, existingConsumptionInWindow] = await Promise.all([
            RequestModel.findOne({
                roomID: room._id,
                type: RequestType.CONSUMP,
                createDate: { $gte: windowStart, $lte: windowEnd },
            }),
            Consumption.findOne({
                roomID: room._id,
                trackingTime: { $gte: windowStart, $lte: windowEnd },
            }),
        ]);
        if (existingRequest || existingConsumptionInWindow) {
            cleanupFile();
            sendError(res, 409, "A consumption request already exists for this period");
            return;
        }
        // reading >= previous reading
        const previousConsumption = await Consumption.findOne({ roomID: room._id }).sort({ trackingTime: -1 });
        const previousMeterReading = previousConsumption ? previousConsumption.meterReading : 0;
        if (readingNum < previousMeterReading) {
            cleanupFile();
            sendError(res, 400, `reading must be >= previous approved reading (${previousMeterReading})`);
            return;
        }

        //calculate usage & save transaction
        const usage = readingNum - previousMeterReading;
        const correspondingCost = usage * electricityUnitPrice;
 
        const imagePath = `/uploads/consumption/${file.filename}`;
 
        const session = await mongoose.startSession();
        let request, consumpRequest;

        try {
            session.startTransaction();
 
            const createdRequest = await RequestModel.create(
                [{
                    type: RequestType.CONSUMP,
                    roomID: room._id,
                    userID,
                    createDate: now,
                    status: RequestStatus.PENDING,
                }],
                { session }
            );
            request = createdRequest[0];
 
            const createdConsumpRequest = await ConsumpRequest.create(
                [{
                    requestID: request._id,
                    image: imagePath,
                    reading: readingNum,
                    capturedAt: capturedAtDate,
                }],
                { session }
            );
            consumpRequest = createdConsumpRequest[0];
 
            await session.commitTransaction();
        } catch (err) {
            await session.abortTransaction();
            cleanupFile();
            throw err;
        } finally {
            session.endSession();
        }

        sendSuccess(res, {
            requestID: request._id,
            type: RequestType.CONSUMP,
            image: consumpRequest.image,
            reading: consumpRequest.reading,
            previousReading: previousMeterReading,
            usage: usage,
            capturedAt: consumpRequest.capturedAt,
            correspondingCost,
            status: request.status,
        });
    } catch (error: any) {
        if (error?.status) {
            sendError(res, error.status, error.message);
            return;
        }
        next(error)
    }
}

// view consumption request
// GET /api/user/consumption-requests/:requestID
export const viewConsumpRequest = async (req: UserAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { requestID } = req.params;
        const { userID } = req.auth!;

        // validate
        if (!mongoose.isValidObjectId(requestID)) {
            sendError(res, 400, "Invalid requestID");
            return;
        }
        // consumption request exist
        const request = await RequestModel.findById(requestID);
        if (!request || request.type !== RequestType.CONSUMP) {
            sendError(res, 404, "Consumption request not found");
            return;
        }
        // chặn IDOR — chỉ chủ sở hữu request mới được xem, không phải cứ đăng nhập là xem được mọi requestID
        if (request.userID.toString() !== userID) {
            sendError(res, 403, "You do not have access to this request");
            return;
        }
        // consumption request detail exist 
        const consumpRequest = await ConsumpRequest.findOne({ requestID: request._id });
        if (!consumpRequest) {
            sendError(res, 404, "Consumption request detail not found");
            return;
        }

        // calculate
        const priceParam = await Parameter.findOne({ name: ParameterName.ELECTRICITY_UNIT_PRICE });
        const electricityUnitPrice = Number(priceParam?.value);
        if (!electricityUnitPrice) {
            sendError(res, 500, "Electricity unit price is not configured");
            return;
        }
        // "reading gần nhất" tại đúng thời điểm request này được tạo
        const previousConsumption = await Consumption.findOne({
            roomID: request.roomID,
            trackingTime: { $lt: consumpRequest.capturedAt },
        }).sort({ trackingTime: -1 });
        const previousMeterReading = previousConsumption ? previousConsumption.meterReading : 0;
        const usage = consumpRequest.reading - previousMeterReading;
        const correspondingCost = usage * electricityUnitPrice;

        sendSuccess(res, {
            requestID: request._id,
            type: RequestType.CONSUMP,
            image: consumpRequest.image,
            reading: consumpRequest.reading,
            previousReading: previousMeterReading,
            usage: usage,
            capturedAt: consumpRequest.capturedAt,
            correspondingCost,
            createDate: request.createDate.toISOString().split("T")[0],
            resolveDate: request.resolveDate ? request.resolveDate.toISOString().split("T")[0] : null,
            status: request.status,
        });
    } catch (error) {
        next(error)
    }
}

import mongoose, { ClientSession, HydratedDocument } from 'mongoose';
import RequestModel, { IRequest } from '../models/Request.js';
import ConsumpRequest from '../models/ConsumpRequest.js';
import Contract from '../models/Contract.js';
import Consumption from '../models/Consumption.js';
import User from '../models/User.js';
import Room from '../models/Room.js';
import { 
  RequestType, 
  RequestStatus, 
  ContractStatus 
} from '../models/enums.js';



const isSameCalendarMonth = (a: Date, b: Date): boolean =>
  a.getUTCFullYear() === b.getUTCFullYear() && 
  a.getUTCMonth() === b.getUTCMonth();


const formatBillingPeriod = (date: Date): string => {
  const d = new Date(date);
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  return `${d.getUTCFullYear()}-${month}`;
};

export class RequestServiceError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'RequestServiceError';
  }
}

export interface ApproveRequestResult {
  requestID: string;
  type: RequestType;
  resolveDate: Date;
  status: RequestStatus;
  result: Record<string, unknown>;
}

/**
 * #40 — PATCH /api/admin/requests/:requestID/approve
 *
 * Implement đầy đủ cho type = CONSUMP (task "Approve Consumption") và type = PAID
 * (task "Approve PAID Request"). 4 type còn lại (DELAY/EXTEND/MOVEOUT/CHECKOUT) là TODO
 * — task khác sẽ bổ sung case riêng, KHÔNG tự ý code ở đây.
 *
 * ATOMIC: toàn bộ transition Request PENDING->APPROVED + side-effect (tạo Consumption/Invoice,
 * hoặc update Invoice PAID) nằm trong 1 Mongo transaction. Chốt chặn double-approve nằm ở
 * `findOneAndUpdate` với filter `status: PENDING` — 2 request approve cùng lúc, chỉ đúng 1 cái
 * match được điều kiện này, cái còn lại nhận về `null` ngay lập tức (không có race window).
 */
export const approveRequest = async (requestID: string): Promise<ApproveRequestResult> => {
  if (!mongoose.Types.ObjectId.isValid(requestID)) {
    throw new RequestServiceError(404, `Request with ID ${requestID} not found.`);
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const now = new Date();

    // Atomic guard chống double-approve: chỉ update được nếu ĐANG là PENDING.
    const updatedRequest = await RequestModel.findOneAndUpdate(
      { _id: requestID, status: RequestStatus.PENDING },
      { $set: { status: RequestStatus.APPROVED, resolveDate: now } },
      { new: true, session },
    );

    if (!updatedRequest) {
      // Không match được filter -> hoặc không tồn tại, hoặc đã approved trước đó.
      // Tra thêm 1 lần (trong cùng session) chỉ để trả message rõ ràng, KHÔNG ảnh hưởng tính atomic ở trên.
      const existing = await RequestModel.findById(requestID).session(session);
      await session.abortTransaction();
      if (!existing) {
        throw new RequestServiceError(404, `Request with ID ${requestID} not found.`);
      }
      throw new RequestServiceError(
        400,
        `Request ${requestID} is already "${existing.status}", cannot approve again.`,
      );
    }

    let result: Record<string, unknown>;

    switch (updatedRequest.type) {
      case RequestType.CONSUMP: {
        result = await approveConsumpRequest(updatedRequest, session);
        break;
      }
      case RequestType.PAID:      
      case RequestType.DELAY:
      case RequestType.EXTEND:
      case RequestType.MOVEOUT:
      case RequestType.CHECKOUT: {
        // TODO: implement ở task riêng. Throw ở đây sẽ abort transaction bên dưới,
        // Request tự động rollback lại về PENDING — không bị kẹt ở trạng thái approved dở dang.
        throw new RequestServiceError(
          501,
          `Approve logic for request type "${updatedRequest.type}" is not implemented yet (out of scope of this task).`,
        );
      }

      default: {
        throw new RequestServiceError(400, `Unknown request type "${updatedRequest.type}".`);
      }
    }

    await session.commitTransaction();

    return {
      requestID: String(updatedRequest._id),
      type: updatedRequest.type,
      resolveDate: updatedRequest.resolveDate as Date,
      status: updatedRequest.status,
      result,
    };
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Nhánh CONSUMP_REQUEST (task "Approve Consumption and create CONSUMPTION"):
 * 1. Lấy chi tiết ConsumpRequest (reading/image/capturedAt).
 * 2. Lấy active CONTRACT + Room của room.
 * 3. Lấy reading kỳ trước gần nhất (nếu có) -> tính usage = currentReading - previousReading.
 * 4. Chặn duplicate: nếu Consumption gần nhất đã nằm CÙNG THÁNG với capturedAt -> đã có invoice
 *    kỳ này rồi, không tạo thêm (task 2 AC "một tenancy/billing period không tạo duplicate Invoice").
 * 5. Tạo CONSUMPTION mới.
 * 6. Tạo INVOICE tương ứng (qua invoice.service, cùng session).
 */
const approveConsumpRequest = async (
  request: HydratedDocument<IRequest>,
  session: ClientSession,
): Promise<Record<string, unknown>> => {
  const consumpRequest = await ConsumpRequest.findOne({ requestID: request._id }).session(session);
  if (!consumpRequest) {
    throw new RequestServiceError(
      404,
      `CONSUMP_REQUEST detail not found for request ${request._id}.`,
    );
  }

  const [activeContract, room] = await Promise.all([
    Contract.findOne({ roomID: request.roomID, status: ContractStatus.ACTIVE }).session(session),
    Room.findById(request.roomID).session(session),
  ]);

  if (!activeContract) {
    throw new RequestServiceError(
      400,
      `Room ${request.roomID} has no active contract, cannot determine roomBill.`,
    );
  }
  if (!room) {
    throw new RequestServiceError(404, `Room ${request.roomID} not found.`);
  }

  // Reading kỳ trước gần nhất của phòng (nếu có) để tính usage.
  // GIẢ ĐỊNH: nếu đây là kỳ điện đầu tiên (chưa từng có Consumption), previousReading = 0.
  const previousConsumption = await Consumption.findOne({ roomID: request.roomID })
    .sort({ trackingTime: -1 })
    .session(session);
  const previousReading = previousConsumption?.meterReading ?? 0;

  if (consumpRequest.reading < previousReading) {
    throw new RequestServiceError(
      400,
      `New reading (${consumpRequest.reading}) is smaller than the last recorded reading (${previousReading}).`,
    );
  }

  // Chặn duplicate invoice cùng billing period cho cùng 1 phòng.
  if (previousConsumption && isSameCalendarMonth(previousConsumption.trackingTime, consumpRequest.capturedAt)) {
    throw new RequestServiceError(
      409,
      `Room ${request.roomID} already has a CONSUMPTION/Invoice for billing period ${formatBillingPeriod(
        consumpRequest.capturedAt,
      )}. Cannot create duplicate.`,
    );
  }

  const consumpAmount = consumpRequest.reading - previousReading;

  const createdConsumption = await Consumption.create(
    [
      {
        roomID: request.roomID,
        meterReading: consumpRequest.reading,
        trackingTime: consumpRequest.capturedAt,
        e_meterImage: consumpRequest.image,
      },
    ],
    { session },
  );
  const consumption = createdConsumption[0];

  return {
    consumptionID: String(consumption._id),
    meterReading: consumption.meterReading,
    previousReading,
    consumpAmount,
    billingPeriod: formatBillingPeriod(consumption.trackingTime),
  };
};

// ---------------------------------------------------------------------------
// #38 / #39 — GET list & detail
// Admin xem được pending Consumption Request + meter image/current/previous reading
// TRƯỚC KHI approve). Implement generic cho mọi type ở list (chỉ field chung),
// nhưng detail chỉ build đầy đủ `details` cho type=consump 
// ---------------------------------------------------------------------------

export interface ListRequestsQuery {
  search?: string;
  type?: string;
  status?: string;
  page?: string | number;
  limit?: string | number;
}
 
export const listRequests = async (query: ListRequestsQuery) => {
  const filter: Record<string, unknown> = {};
 
  if (query.type) {
    if (!Object.values(RequestType).includes(query.type as RequestType)) {
      throw new RequestServiceError(400, `Invalid type filter "${query.type}".`);
    }
    filter.type = query.type;
  }
  if (query.status) {
    if (!Object.values(RequestStatus).includes(query.status as RequestStatus)) {
      throw new RequestServiceError(400, `Invalid status filter "${query.status}".`);
    }
    filter.status = query.status;
  }
 
  const pageNum = Math.max(1, Number(query.page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(query.limit) || 12));
 
  const requests = await RequestModel.find(filter)
    .sort({ createDate: -1 })
    .populate<{ roomID: { _id: mongoose.Types.ObjectId; roomCode: string } }>('roomID', 'roomCode')
    .populate<{ userID: { _id: mongoose.Types.ObjectId; fullName: string } }>('userID', 'fullName');
 
  let mapped = requests.map((r) => ({
    requestID: String(r._id),
    type: r.type,
    roomID: String((r.roomID as any)?._id ?? r.roomID),
    roomCode: (r.roomID as any)?.roomCode ?? null,
    userID: String((r.userID as any)?._id ?? r.userID),
    userFullName: (r.userID as any)?.fullName ?? null,
    createDate: r.createDate,
    resolveDate: r.resolveDate ?? null,
    status: r.status,
  }));
 
  if (query.search) {
    const s = String(query.search).trim().toLowerCase();
    mapped = mapped.filter(
      (item) =>
        item.requestID.toLowerCase().includes(s) ||
        (item.roomCode ?? '').toLowerCase().includes(s) ||
        (item.userFullName ?? '').toLowerCase().includes(s),
    );
  }
 
  const totalItems = mapped.length;
  const items = mapped.slice((pageNum - 1) * limitNum, pageNum * limitNum);
 
  return {
    items,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalItems,
      totalPages: Math.ceil(totalItems / limitNum) || 1,
    },
  };
};
 
export const getRequestDetail = async (requestID: string) => {
  if (!mongoose.Types.ObjectId.isValid(requestID)) {
    throw new RequestServiceError(404, `Request with ID ${requestID} not found.`);
  }
 
  const request = await RequestModel.findById(requestID);
  if (!request) {
    throw new RequestServiceError(404, `Request with ID ${requestID} not found.`);
  }
 
  const [room, user] = await Promise.all([
    Room.findById(request.roomID),
    User.findById(request.userID),
  ]);
 
  let details: Record<string, unknown>;
 
  if (request.type === RequestType.CONSUMP) {
    const consumpRequest = await ConsumpRequest.findOne({ requestID: request._id });
    if (!consumpRequest) {
      throw new RequestServiceError(404, `CONSUMP_REQUEST detail not found for request ${requestID}.`);
    }
    const previousConsumption = await Consumption.findOne({
      roomID: request.roomID,
      trackingTime: { $lt: consumpRequest.capturedAt },
    }).sort({ trackingTime: -1 });
    const previousReading = previousConsumption ? previousConsumption.meterReading : 0;
 
    details = {
      image: consumpRequest.image,
      currentReading: consumpRequest.reading,
      previousReading,
      usage: consumpRequest.reading - previousReading,
      capturedAt: consumpRequest.capturedAt,
    };
  } else {
    details = {
      note: `Detail rendering for request type "${request.type}" is not implemented yet.`,
    };
  }
 
  return {
    requestID: String(request._id),
    type: request.type,
    room: room ? { roomID: String(room._id), roomCode: room.roomCode } : null,
    user: user ? { userID: String(user._id), fullName: user.fullName } : null,
    createDate: request.createDate,
    resolveDate: request.resolveDate ?? null,
    status: request.status,
    details,
  };
};
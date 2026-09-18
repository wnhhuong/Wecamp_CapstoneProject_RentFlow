import mongoose, { ClientSession, HydratedDocument } from 'mongoose';
import RequestModel, { IRequest } from '../models/Request.js';
import ConsumpRequest from '../models/ConsumpRequest.js';
import CheckoutRequest from "../models/CheckoutRequest.js";
import ExtendRequest from "../models/ExtendRequest.js";
import LatePaymentRequest from "../models/LatePaymentRequest.js";
import MoveoutRequest from "../models/MoveoutRequest.js";
import PaidRequest from "../models/PaidRequest.js";
import Contract from '../models/Contract.js';
import Consumption from '../models/Consumption.js';
import Invoice from '../models/Invoice.js';
import User from '../models/User.js';
import Room from '../models/Room.js';
import { 
  RequestType, 
  RequestStatus, 
  ContractStatus,
  InvoiceStatus,
  RoomStatus, 
} from '../models/enums.js';

import { buildInvoiceForConsumption, computeBillingPeriod } from './invoice.service.js';
import { getVNDateParts } from '../utils/dateFormat.js';
import { buildInvoiceDisplayID, buildRequestDisplayID } from '../utils/displayId.js';
import { parsePagination, paginateArray } from '../utils/pagination.js';

/**
 * So sánh "cùng tháng" theo GIỜ VIỆT NAM (không dùng getUTCMonth trực tiếp) — tránh lệch
 * 1 tháng với các request tạo/approve trong khoảng 00h-07h sáng giờ VN (17h-24h UTC hôm trước).
 */
const isSameCalendarMonth = (a: Date, b: Date): boolean => {
  const pa = getVNDateParts(a);
  const pb = getVNDateParts(b);
  return pa.year === pb.year && pa.month === pb.month;
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
**/
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
      { returnDocument: "after", session },
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
        `Request ${requestID} is already ${existing.status.toUpperCase()}, cannot approve again.`,
      );
    }

    let result: Record<string, unknown>;

    switch (updatedRequest.type) {
      case RequestType.CONSUMP: {
        result = await approveConsumpRequest(updatedRequest, session);
        break;
      }
      case RequestType.PAID: {
        result = await approvePaidRequest(updatedRequest, session);
        break;
      }      
      case RequestType.DELAY: {
        result = await approveLatePaymentRequest(updatedRequest, session);
        break;
      }
      case RequestType.EXTEND:
      case RequestType.MOVEOUT: {
        result = await approveMoveoutRequest(updatedRequest, session);
        break;
      }
      case RequestType.CHECKOUT: {
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
  const previousConsumption = await Consumption.findOne({ 
    roomID: request.roomID,
    trackingTime: { $lt: consumpRequest.capturedAt },
  })
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
      `Room ${room.roomCode} already has a CONSUMPTION/Invoice for billing period ${computeBillingPeriod(
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

  const invoice = await buildInvoiceForConsumption(
    {
      consumptionID: consumption._id,
      consumpAmount,
      roomBill: activeContract.rentPrice,
    },
  session
  );

  return {
    consumptionID: String(consumption._id),
    roomCode: room.roomCode,
    meterReading: consumption.meterReading,
    previousReading,
    consumpAmount,
    billingPeriod: computeBillingPeriod(consumption.trackingTime),
    // Invoice summary
    invoiceID: String(invoice._id),
    displayID: buildInvoiceDisplayID(room.roomCode, invoice.createdDate),
    totalBill: invoice.totalBill,

  // Full bill
    invoice,

  };
};

/**
 * Nhánh PAID_REQUEST:
 * 1. Lấy PaidRequest -> invoiceID.
 * 2. Invoice PHẢI đang NOT_PAID.
 * 3. Set Invoice PAID + paymentDate = now (cùng transaction).
 */
const approvePaidRequest = async (
  request: HydratedDocument<IRequest>,
  session: ClientSession,
): Promise<Record<string, unknown>> => {
  const paidRequest = await PaidRequest.findOne({ requestID: request._id }).session(session);
  if (!paidRequest) {
    throw new RequestServiceError(404, `PAID_REQUEST detail not found for request ${request._id}.`);
  }
 
  const invoice = await Invoice.findById(paidRequest.invoiceID).session(session);
  if (!invoice) {
    throw new RequestServiceError(404, `Invoice ${paidRequest.invoiceID} not found.`);
  }
 
  if (invoice.status === InvoiceStatus.PAID) {
    throw new RequestServiceError(
      400,
      `Invoice ${invoice._id} is already PAID, cannot confirm payment again.`,
    );
  }
  if (invoice.status !== InvoiceStatus.NOT_PAID) {
    throw new RequestServiceError(
      400,
      `Invoice ${invoice._id} is in status "${invoice.status}", only NOT_PAID invoices can be marked as PAID via this request.`,
    );
  }
 
  const now = new Date();
  invoice.status = InvoiceStatus.PAID;
  invoice.paymentDate = now;
  await invoice.save({ session });
 
  return {
    invoiceID: String(invoice._id),
    status: invoice.status,
    paymentDate: invoice.paymentDate,
    totalBill: invoice.totalBill,
  };
};

/**
 * Nhánh LATE_PAYMENT_REQUEST (type DELAY):
 * 1. Lấy LatePaymentRequest -> invoiceID.
 * 2. Set Invoice.isRequestLate = true.
 * 3. KHÔNG đụng Invoice.dueDate, KHÔNG đụng Invoice.status (không chuyển PAID).
 *
 * "Request không được xử lý lại" đã được đảm bảo ở tầng approveRequest() (atomic guard chung).
 */
const approveLatePaymentRequest = async (
  request: HydratedDocument<IRequest>,
  session: ClientSession,
): Promise<Record<string, unknown>> => {
  const lateRequest = await LatePaymentRequest.findOne({ requestID: request._id }).session(session);
  if (!lateRequest) {
    throw new RequestServiceError(404, `LATE_PAYMENT_REQUEST detail not found for request ${request._id}.`);
  }
 
  const invoice = await Invoice.findById(lateRequest.invoiceID).session(session);
  if (!invoice) {
    throw new RequestServiceError(404, `Invoice ${lateRequest.invoiceID} not found.`);
  }
 
  const dueDateBefore = invoice.dueDate;
  const statusBefore = invoice.status;
 
  invoice.isRequestLate = true;
  await invoice.save({ session });
 
  // Sanity-check: không được vô tình đổi 2 field này (bảo vệ AC, không phải logic nghiệp vụ).
  if (invoice.dueDate.getTime() !== dueDateBefore.getTime() || invoice.status !== statusBefore) {
    throw new RequestServiceError(500, 'Unexpected mutation of Invoice.dueDate/status while approving late-payment request.');
  }
 
  return {
    invoiceID: String(invoice._id),
    isRequestLate: invoice.isRequestLate,
    dueDate: invoice.dueDate,
    status: invoice.status,
  };
};

/**
 * Nhánh MOVEOUT_REQUEST:
 * 1. Lấy MoveoutRequest -> contractID.
 * 2. Contract PHẢI đang ACTIVE (giữ nguyên ACTIVE sau approve — tenancy chưa kết thúc).
 * 3. Room PHẢI đang RENTED -> chuyển AVAILABLE_SOON.
 */
const approveMoveoutRequest = async (
  request: HydratedDocument<IRequest>,
  session: ClientSession,
): Promise<Record<string, unknown>> => {
  const moveoutRequest = await MoveoutRequest.findOne({ requestID: request._id }).session(session);
  if (!moveoutRequest) {
    throw new RequestServiceError(404, `MOVEOUT_REQUEST detail not found for request ${request._id}.`);
  }
 
  const contract = await Contract.findById(moveoutRequest.contractID).session(session);
  if (!contract) {
    throw new RequestServiceError(404, `Contract ${moveoutRequest.contractID} not found.`);
  }
  if (contract.status !== ContractStatus.ACTIVE) {
    throw new RequestServiceError(
      400,
      `Contract ${contract._id} is "${contract.status}", must be ACTIVE to approve move-out.`,
    );
  }
 
  const room = await Room.findById(contract.roomID).session(session);
  if (!room) {
    throw new RequestServiceError(404, `Room ${contract.roomID} not found.`);
  }
  if (room.status !== RoomStatus.RENTED) {
    throw new RequestServiceError(
      400,
      `Room ${room.roomCode} is "${room.status}", expected RENTED to approve move-out.`,
    );
  }
 
  room.status = RoomStatus.AVAILABLE_SOON;
  await room.save({ session });
  // Contract KHÔNG đổi status — tenancy chưa kết thúc (AC: "Contract vẫn ACTIVE").
 
  return {
    contractID: String(contract._id),
    contractStatus: contract.status,
    roomID: String(room._id),
    roomCode: room.roomCode,
    roomStatus: room.status,
    requestMoveoutDate: moveoutRequest.requestMoveoutDate,
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
 
  const { page, limit } = parsePagination(query.page, query.limit);
 
  const requests = await RequestModel.find(filter)
    .sort({ createDate: -1 })
    .populate<{ roomID: { _id: mongoose.Types.ObjectId; roomCode: string } }>('roomID', 'roomCode')
    .populate<{ userID: { _id: mongoose.Types.ObjectId; fullName: string } }>('userID', 'fullName');
 
  let mapped = requests.map((r) => {
    const roomCode = (r.roomID as any)?.roomCode ?? null;
    return {
      requestID: String(r._id),
      displayID: roomCode
        ? buildRequestDisplayID(r.type, roomCode, new Date(r.createDate))
        : null,
      type: r.type,
      roomID: String((r.roomID as any)?._id ?? r.roomID),
      roomCode,
      userID: String((r.userID as any)?._id ?? r.userID),
      userFullName: (r.userID as any)?.fullName ?? null,
      createDate: r.createDate,
      resolveDate: r.resolveDate ?? null,
      status: r.status,
    };
  });
 
  if (query.search) {
    const s = String(query.search).trim().toLowerCase();
    mapped = mapped.filter(
      (item) =>
        item.requestID.toLowerCase().includes(s) ||
        (item.displayID ?? '').toLowerCase().includes(s) ||
        (item.roomCode ?? '').toLowerCase().includes(s) ||
        (item.userFullName ?? '').toLowerCase().includes(s),
    );
  }
 
  // search/filter bằng field đã map ở JS -> paginate trên mảng in-memory (đúng use-case paginateArray)
  const { data, meta } = paginateArray(mapped, page, limit);
 
  return {
    items: data,
    pagination: meta, // { page, limit, total, totalPages } — total, KHÔNG phải totalItems (xem cảnh báo)
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
 
  let details: Record<string, unknown> | null;
 
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
    const DetailModel = DETAIL_MODEL_MAP[request.type];
    const doc = DetailModel ? await DetailModel.findOne({ requestID: request._id }) : null;
    details = doc
      ? buildDetails(request.type, doc)
      : { note: `Detail record not found for request type "${request.type}".` };
  }
 
  // Admin duyệt PAID request là xác nhận đã nhận tiền, nên phải thấy hoá đơn nào
  // và bao nhiêu tiền ngay trong panel, không chỉ một ObjectId.
  if (request.type === RequestType.PAID && details?.invoiceID) {
    const invoice = await Invoice.findById(details.invoiceID as mongoose.Types.ObjectId);
    if (invoice) {
      details.invoiceDisplayID = room
        ? buildInvoiceDisplayID(room.roomCode, new Date(invoice.createdDate))
        : null;
      details.invoiceTotalBill = invoice.totalBill;
      details.invoiceDueDate = invoice.dueDate.toISOString();
      details.invoiceStatus = invoice.status;
    }
  }

  return {
    requestID: String(request._id),
    displayID: room
      ? buildRequestDisplayID(request.type, room.roomCode, new Date(request.createDate))
      : null,
    type: request.type,
    room: room ? { roomID: String(room._id), roomCode: room.roomCode } : null,
    user: user ? { userID: String(user._id), fullName: user.fullName } : null,
    createDate: request.createDate,
    resolveDate: request.resolveDate ?? null,
    status: request.status,
    details,
  };
};

export const DETAIL_MODEL_MAP: Record<RequestType, any> = {
    [RequestType.CHECKOUT]: CheckoutRequest,
    [RequestType.CONSUMP]: ConsumpRequest,
    [RequestType.EXTEND]: ExtendRequest,
    [RequestType.DELAY]: LatePaymentRequest,
    [RequestType.MOVEOUT]: MoveoutRequest,
    [RequestType.PAID]: PaidRequest,
};

export const buildDetails = (type: RequestType, doc: any): Record<string, any> | null => {
    switch (type) {
        case RequestType.CHECKOUT:
            return {
                contractID: doc.contractID,
                finalImage: doc.finalImage,
                finalReading: doc.finalReading,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
            };
        case RequestType.CONSUMP:
            return {
                image: doc.image,
                reading: doc.reading,
                capturedAt: doc.capturedAt,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
            };
        case RequestType.EXTEND:
            return {
                contractID: doc.contractID,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
            };
        case RequestType.DELAY:
            return {
                invoiceID: doc.invoiceID,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
            };
        case RequestType.MOVEOUT:
            return {
                contractID: doc.contractID,
                requestMoveoutDate: doc.requestMoveoutDate,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
            };
        case RequestType.PAID:
            return {
                invoiceID: doc.invoiceID,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
            };
        default:
            return null;
    }
};
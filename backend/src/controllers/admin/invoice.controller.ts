import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Invoice from '../../models/Invoice.js';
import Consumption from '../../models/Consumption.js';
import Room from '../../models/Room.js';
import Contract from '../../models/Contract.js';
import User from '../../models/User.js';
import { InvoiceStatus, ContractStatus } from '../../models/enums.js';
import { computeBillingPeriod, computeUsageAndUnitPrice } from '../../services/invoice.service.js';
import { buildInvoiceDisplayID } from '../../utils/displayId.js';
import { parsePagination, paginateArray } from '../../utils/pagination.js';
import { sendSuccess, sendError } from '../../utils/response.js';

const computeIsOverdue = (paymentDate: Date | null | undefined, dueDate: Date, now: Date): boolean => {
  if (!paymentDate) return now > dueDate;
  return paymentDate > dueDate;
};

/**
 * #34 — GET /api/admin/invoices
 * Implement Admin Invoice list-detail APIs: xem toàn bộ Invoice của property,
 * không giới hạn theo 1 tenancy như bản tenant. tenantName join theo ACTIVE CONTRACT
 * hiện tại của room (đã xác nhận: chấp nhận có thể không khớp lịch sử nếu tenant đã đổi).
 */
export const getAdminInvoiceList = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { search, status, isRequestLate, page, limit } = req.query;

    const filter: Record<string, unknown> = {};
    if (status) {
      if (!Object.values(InvoiceStatus).includes(status as InvoiceStatus)) {
        sendError(res, 400, `Invalid status filter "${status}".`);
        return;
      }
      filter.status = status;
    }
    if (isRequestLate !== undefined) {
      filter.isRequestLate = isRequestLate === 'true';
    }

    const { page: pageNum, limit: limitNum } = parsePagination(page, limit);

    const invoices = await Invoice.find(filter).sort({ createdDate: -1 });

    // Batch resolve Consumption -> Room -> active Contract -> User, tránh N+1 query
    const consumptionIds = invoices.map((inv) => inv.consumptionID);
    const consumptions = await Consumption.find({ _id: { $in: consumptionIds } });
    const consumptionMap = new Map(consumptions.map((c) => [String(c._id), c]));

    const roomIds = [...new Set(consumptions.map((c) => String(c.roomID)))];
    const rooms = await Room.find({ _id: { $in: roomIds } });
    const roomMap = new Map(rooms.map((r) => [String(r._id), r]));

    const activeContracts = await Contract.find({
      roomID: { $in: roomIds },
      status: ContractStatus.ACTIVE,
    });
    const contractByRoom = new Map(activeContracts.map((c) => [String(c.roomID), c]));

    const userIds = [...new Set(activeContracts.map((c) => String(c.userID)))];
    const users = await User.find({ _id: { $in: userIds } });
    const userMap = new Map(users.map((u) => [String(u._id), u]));

    const now = new Date();

    let mapped = invoices.map((inv) => {
      const consumption = consumptionMap.get(String(inv.consumptionID));
      const room = consumption ? roomMap.get(String(consumption.roomID)) : undefined;
      const contract = consumption ? contractByRoom.get(String(consumption.roomID)) : undefined;
      const tenant = contract ? userMap.get(String(contract.userID)) : undefined;

      const received = inv.status === InvoiceStatus.PAID ? inv.totalBill : 0;
      const stillOwed = inv.totalBill - received;

      return {
        invoiceID: String(inv._id),
        displayID: room ? buildInvoiceDisplayID(room.roomCode, inv.createdDate) : null,
        tenantName: tenant?.fullName ?? null,
        roomCode: room?.roomCode ?? null,
        billingPeriod: consumption ? computeBillingPeriod(consumption.trackingTime) : null,
        createDate: inv.createdDate,
        dueDate: inv.dueDate.toISOString(),
        totalBill: inv.totalBill,
        received,
        stillOwed,
        status: inv.status,
        isOverdue: computeIsOverdue(inv.paymentDate, inv.dueDate, now),
        isRequestLate: inv.isRequestLate,
      };
    });

    if (search) {
      const s = String(search).trim().toLowerCase();
      mapped = mapped.filter(
        (item) =>
          (item.displayID ?? '').toLowerCase().includes(s) ||
          (item.roomCode ?? '').toLowerCase().includes(s) ||
          (item.tenantName ?? '').toLowerCase().includes(s),
      );
    }

    const { data: items, meta } = paginateArray(mapped, pageNum, limitNum);

    sendSuccess(res, {
      items,
      pagination: meta, // { page, limit, total, totalPages } — total, KHÔNG phải totalItems (xem cảnh báo)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * #35 — GET /api/admin/invoices/:invoiceID
 * Trả breakdown FINALIZED đầy đủ + Room/Tenant context + usage/unit price derived (task 4).
 * KHÔNG có endpoint update nào cho breakdown -> tự nhiên read-only, đúng AC "finalized read-only".
 */
export const getAdminInvoiceDetail = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { invoiceID } = req.params;
    if (!mongoose.isValidObjectId(invoiceID)) {
      sendError(res, 400, 'Invalid invoiceID');
      return;
    }

    const invoice = await Invoice.findById(invoiceID);
    if (!invoice) {
      sendError(res, 404, 'Invoice not found');
      return;
    }

    const consumption = await Consumption.findById(invoice.consumptionID);
    if (!consumption) {
      sendError(res, 404, 'Related consumption not found');
      return;
    }

    const room = await Room.findById(consumption.roomID);
    if (!room) {
      sendError(res, 404, 'Related room not found');
      return;
    }

    // Tenant theo ACTIVE CONTRACT hiện tại (đã xác nhận) — có thể không khớp tenant lịch sử
    // nếu phòng đã đổi người thuê sau khi invoice này được tạo.
    const activeContract = await Contract.findOne({
      roomID: room._id,
      status: ContractStatus.ACTIVE,
    });
    const tenant = activeContract ? await User.findById(activeContract.userID) : null;

    const { usageKwh, electricityUnitPrice, electricityUnitPriceIsApprox } =
      await computeUsageAndUnitPrice(invoice, consumption);

    const now = new Date();
    const received = invoice.status === InvoiceStatus.PAID ? invoice.totalBill : 0;
    const stillOwed = invoice.totalBill - received;

    sendSuccess(res, {
      invoiceID: String(invoice._id),
      displayID: buildInvoiceDisplayID(room.roomCode, invoice.createdDate),
      billingPeriod: computeBillingPeriod(consumption.trackingTime),
      room: { roomID: String(room._id), roomCode: room.roomCode },
      tenant: tenant ? { userID: String(tenant._id), fullName: tenant.fullName } : null,
      createDate: invoice.createdDate,
      paymentDate: invoice.paymentDate ?? null,
      dueDate: invoice.dueDate.toISOString(),
      status: invoice.status,
      isOverdue: computeIsOverdue(invoice.paymentDate, invoice.dueDate, now),
      isRequestLate: invoice.isRequestLate,
      meterReading: consumption.meterReading,
      usageKwh,
      electricityUnitPrice,
      electricityUnitPriceIsApprox, // true nếu usageKwh=0 và phải fallback giá hiện tại
      breakdown: {
        room: invoice.roomBill,
        electrical: invoice.electricalBill,
        water: invoice.waterBill,
        wifi: invoice.wifiBill,
        parking: invoice.parkingBill,
        other: invoice.otherBill,
      },
      totalBill: invoice.totalBill,
      received,
      stillOwed,
    });
  } catch (error) {
    next(error);
  }
};
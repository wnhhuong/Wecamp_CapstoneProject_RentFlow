import Room from '../models/Room.js';
import Invoice from '../models/Invoice.js';
import Request from '../models/Request.js';
import Ticket from '../models/Ticket.js';
import Area from '../models/Area.js';
import { InvoiceStatus, RequestStatus, TicketStatus } from '../models/enums.js';

export interface IRoomSummary {
  availableNow: number;
  rented: number;
  availableSoon: number;
  notAvailable: number;
  total: number;
  occupancyRate: number;
}

export interface IPaymentSummary {
  paid: number;
  notPaid: number;
  overdue: number;
}

export interface IRequestNeedingApproval {
  requestID: string;
  type: string;
  roomCode: string;
  userFullName: string;
  createDate: string;
}

export interface ITicketNeedingAction {
  ticketID: string;
  ticketName: string;
  type: string;
  location: string;
  createDate: string;
}

export interface IDashboardSummaryData {
  roomSummary: IRoomSummary;
  paymentSummary: IPaymentSummary;
  requestsNeedingApproval: IRequestNeedingApproval[];
  ticketsNeedingAction: ITicketNeedingAction[];
}

export class DashboardService {
  public static async getAdminDashboardSummary(): Promise<IDashboardSummaryData> {
    const today = new Date();
    // Reset về 0h00 để so sánh đúng dueDate < today
    today.setHours(0, 0, 0, 0);

    // Chạy song song tất cả các nhóm dữ liệu để tối ưu thời gian phản hồi API
    const [
      rooms,
      invoices,
      pendingRequests,
      actionTickets,
    ] = await Promise.all([
      // 1. Lấy tất cả phòng để đếm trạng thái & tính tỷ lệ lấp đầy
      Room.find({}).select('status').lean(),

      // 2. Lấy tất cả hóa đơn để thống kê tình trạng thanh toán
      Invoice.find({}).select('status dueDate').lean(),

      // 3. Lấy các request pending mới nhất
      Request.find({ status: RequestStatus.PENDING })
        .populate<{ roomID: any }>('roomID', 'roomCode')
        .populate<{ userID: any }>('userID', 'fullName')
        .sort({ createDate: -1, createdAt: -1 })
        .lean(),

      // 4. Lấy các ticket need_action mới nhất
      Ticket.find({ status: TicketStatus.NEED_ACTION })
        .populate<{ roomID: any }>('roomID', 'roomCode areaID')
        .sort({ createDate: -1, createdAt: -1 })
        .lean(),
    ]);

    // ==========================================
    // A. XỬ LÝ ROOM SUMMARY & OCCUPANCY RATE
    // ==========================================
    let availableNow = 0;
    let rented = 0;
    let availableSoon = 0;
    let notAvailable = 0;

    rooms.forEach((r: any) => {
      const st = (r.status || '').toLowerCase().trim();
      if (st === 'available_now' || st === 'available now') {
        availableNow++;
      } else if (st === 'rented') {
        rented++;
      } else if (st === 'available_soon' || st === 'available soon') {
        availableSoon++;
      } else if (st === 'not_available' || st === 'not available') {
        notAvailable++;
      }
    });

    const totalRooms = rooms.length;
    // occupancyRate = (rented / total) * 100 làm tròn 1 chữ số thập phân, total = 0 thì trả 0
    const rawOccupancy = totalRooms > 0 ? (rented / totalRooms) * 100 : 0;
    const occupancyRate = Number(rawOccupancy.toFixed(1));

    const roomSummary: IRoomSummary = {
      availableNow,
      rented,
      availableSoon,
      notAvailable,
      total: totalRooms,
      occupancyRate,
    };

    // ==========================================
    // B. XỬ LÝ PAYMENT SUMMARY
    // ==========================================
    let paid = 0;
    let notPaid = 0;
    let overdue = 0;

    invoices.forEach((inv: any) => {
      const st = (inv.status || '').toLowerCase().trim();
      const isPaid = st === 'paid' || st === InvoiceStatus.PAID;

      if (isPaid) {
        paid++;
      } else {
        notPaid++;
        // Kiểm tra quá hạn: dueDate < today
        if (inv.dueDate) {
          const due = new Date(inv.dueDate);
          due.setHours(0, 0, 0, 0);
          if (due < today) {
            overdue++;
          }
        }
      }
    });

    const paymentSummary: IPaymentSummary = {
      paid,
      notPaid,
      overdue,
    };

    // ==========================================
    // C. XỬ LÝ REQUESTS NEEDING APPROVAL
    // ==========================================
    const requestsNeedingApproval: IRequestNeedingApproval[] = (pendingRequests || []).map((req: any) => {
      const room = req.roomID;
      const user = req.userID;
      const rawDate = req.createDate || req.createdAt || new Date();
      const formattedDate = new Date(rawDate).toISOString();

      return {
        requestID: String(req._id || req.requestID),
        type: req.type || 'unknown',
        roomCode: room ? room.roomCode : 'N/A',
        userFullName: user ? user.fullName : 'N/A',
        createDate: formattedDate,
      };
    });

    // ==========================================
    // D. XỬ LÝ TICKETS NEEDING ACTION
    // ==========================================
    // Gom danh sách areaID cần tìm tên khu vực cho ticket nếu có
    const areaIdsToFetch = [
        ...new Set(
            actionTickets
                .map((t: any) => t.roomID?.areaID || t.areaID)
                .filter(Boolean)
                .map(String)
        ),
    ];

    const areas = await Area.find({ _id: { $in: areaIdsToFetch } }).lean();
    const areaMap = new Map<string, string>();
    areas.forEach((a: any) => areaMap.set(String(a._id), a.areaName));

    const ticketsNeedingAction: ITicketNeedingAction[] = (actionTickets || []).map((t: any) => {
      const room = t.roomID;
      const rawDate = t.createDate || t.createdAt || new Date();
      const formattedDate = new Date(rawDate).toISOString();

      // Xác định vị trí (location): roomCode hoặc Tên Khu vực
      let location = 'General';
      if (room && room.roomCode) {
        location = `Room ${room.roomCode}`;
      } else {
        const aId = String(t.areaID || (room && room.areaID) || '');
        if (areaMap.has(aId)) {
          location = `Area ${areaMap.get(aId)}`;
        }
      }

      return {
        ticketID: String(t._id || t.ticketID),
        ticketName: t.ticketType === 'repair' ? 'Repair' : t.ticketType === 'complain' ? 'Complaint' : 'Ticket',
        type: t.ticketType ? t.ticketType.toUpperCase() : (t.facilityID ? 'REPAIR' : 'COMPLAIN'),
        location,
        createDate: formattedDate,
      };
    });

    return {
      roomSummary,
      paymentSummary,
      requestsNeedingApproval,
      ticketsNeedingAction,
    };
  }
}

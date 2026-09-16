import { Types, ClientSession } from 'mongoose';
import Invoice, { IInvoice } from '../models/Invoice.js';
import Parameter from '../models/Parameter.js';
import Consumption, { IConsumption } from '../models/Consumption.js';
import { ParameterName, InvoiceStatus } from '../models/enums.js';

interface BuildInvoiceInput {
  consumptionID: Types.ObjectId;
  consumpAmount: number; // reading hiện tại - reading kỳ trước
  roomBill: number; // = CONTRACT.rentPrice (snapshot lúc ký), KHÔNG lấy ROOM.price
}

/**
 * Đọc value của 1 Parameter theo tên, ép về number.
 * Nếu Parameter chưa được seed (thiếu dữ liệu), trả về fallback thay vì throw,
 * để không chặn toàn bộ luồng approve chỉ vì thiếu 1 config phụ.
 * Truyền `session` khi gọi trong transaction để đảm bảo đọc đúng snapshot dữ liệu.
 */
const getParamNumber = async (
  name: ParameterName,
  fallback = 0,
  session?: ClientSession,
): Promise<number> => {
  const query = Parameter.findOne({ name });
  if (session) query.session(session);
  const param = await query.lean();
  if (!param) return fallback;
  const num = Number(param.value);
  return isNaN(num) ? fallback : num;
};

const getParamRaw = async (name: ParameterName, session?: ClientSession): Promise<string | null> => {
  const query = Parameter.findOne({ name });
  if (session) query.session(session);
  const param = await query.lean();
  return param ? param.value : null;
};

/**
 * Tính dueDate cho invoice mới tạo, dựa trên Parameter "paymentDueDay".
 *
 * GIẢ ĐỊNH (đã xác nhận: paymentDueDay là NGÀY CỐ ĐỊNH TRONG THÁNG):
 * chỉ lấy phần "ngày" (getUTCDate) trong value đang lưu (vd "2025-02-10" -> ngày 10),
 * bỏ qua tháng/năm lưu trong Parameter. Invoice tạo ngay sau khi kỳ ghi điện đóng lại
 * (thường cuối tháng hiện tại), hạn thanh toán áp dụng cho NGÀY ĐÓ CỦA THÁNG KẾ TIẾP.
 *
 * QUAN TRỌNG (task 2 AC "Parameter thay đổi sau đó không làm thay đổi Invoice đã tạo"):
 * dueDate được TÍNH 1 LẦN NGAY LÚC TẠO INVOICE và lưu cứng vào `Invoice.dueDate`,
 * không tính lại theo Parameter hiện tại ở các lần đọc sau -> đã tuân thủ đúng AC.
 */
const computeDueDate = async (createdDate: Date, session?: ClientSession): Promise<Date> => {
  const raw = await getParamRaw(ParameterName.PAYMENT_DUE_DAY, session);
  const dayOfMonth = raw ? new Date(raw).getUTCDate() : 10; // fallback ngày 10 nếu Parameter thiếu/lỗi

  const nextMonthIndex = createdDate.getUTCMonth() + 1; // Date.UTC tự tràn năm nếu = 12
  const year = createdDate.getUTCFullYear();

  return new Date(Date.UTC(year, nextMonthIndex, dayOfMonth));
};

/**
 * Tạo INVOICE mới cho 1 CONSUMPTION vừa được approve. FINALIZED ngay khi tạo xong
 * (không có endpoint update/edit breakdown ở đâu khác trong toàn bộ codebase -> tự nhiên read-only).
 *
 * - roomBill: truyền vào từ ngoài (CONTRACT.rentPrice snapshot), KHÔNG đọc ROOM.price ở đây.
 * - electricalBill = consumpAmount x electricityUnitPrice (Parameter tại thời điểm approve).
 * - waterBill/wifiBill/otherBill: phí CỐ ĐỊNH lấy thẳng từ Parameter, áp dụng như nhau mọi phòng.
 * - parkingBill: chưa có Parameter nguồn -> mặc định 0 (đã xác nhận, chưa launch phí gửi xe).
 * - status khởi tạo LUÔN là NOT_PAID (task 2 AC "Không sử dụng Invoice PENDING" cho khởi tạo).
 *
 * Truyền `session` để nằm chung transaction với việc tạo Consumption + update Request,
 * đảm bảo atomic — nếu bất kỳ bước nào lỗi, toàn bộ rollback (không có Invoice "mồ côi").
 */
export const buildInvoiceForConsumption = async (
  { consumptionID, consumpAmount, roomBill }: BuildInvoiceInput,
  session?: ClientSession,
): Promise<IInvoice> => {
  const electricityUnitPrice = await getParamNumber(ParameterName.ELECTRICITY_UNIT_PRICE, 0, session);
  const waterBill = await getParamNumber(ParameterName.WATER_PRICE, 0, session);
  const wifiBill = await getParamNumber(ParameterName.WIFI_FEE, 0, session);
  const otherBill = await getParamNumber(ParameterName.OTHER_FEES, 0, session);
  const parkingBill = 0; // Chưa có Parameter cho phí gửi xe (đã xác nhận: giữ 0)

  const electricalBill = consumpAmount * electricityUnitPrice;
  const totalBill = roomBill + electricalBill + waterBill + wifiBill + parkingBill + otherBill;

  const createdDate = new Date();
  const dueDate = await computeDueDate(createdDate, session);

  const created = await Invoice.create(
    [
      {
        comsumptionID: consumptionID,
        roomBill,
        electricalBill,
        waterBill,
        wifiBill,
        parkingBill,
        otherBill,
        totalBill,
        createdDate,
        dueDate,
        isRequestLate: false,
        status: InvoiceStatus.NOT_PAID,
      },
    ],
    { session },
  );

  return created[0];
};

/**
 * billingPeriod KHÔNG lưu DB (đã xác nhận) — suy ra từ Consumption.trackingTime
 * vì mỗi Invoice gắn 1-1 với 1 Consumption duy nhất. Format "YYYY-MM".
 */
export const computeBillingPeriod = (trackingTime: Date): string => {
  const d = new Date(trackingTime);
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  return `${d.getUTCFullYear()}-${month}`;
};

/**
 * Suy ngược usageKwh và electricityUnitPrice TẠI THỜI ĐIỂM TẠO INVOICE (không phải giá hiện tại),
 * dùng cho Admin Invoice detail (task 4) mà không cần thêm field mới vào Invoice model.
 *
 * usageKwh = meterReading hiện tại - meterReading của Consumption liền trước (nếu có, else 0).
 * electricityUnitPrice = electricalBill / usageKwh (chính xác vì lúc tạo không làm tròn số này).
 *
 * Case usageKwh = 0 (phòng không dùng điện kỳ đó): không chia được -> fallback lấy giá Parameter
 * HIỆN TẠI kèm cờ `electricityUnitPriceIsApprox: true` để FE có thể ghi chú "giá tham khảo".
 */
export const computeUsageAndUnitPrice = async (
  invoice: Pick<IInvoice, 'electricalBill'>,
  consumption: Pick<IConsumption, 'roomID' | 'trackingTime' | 'meterReading'>,
): Promise<{ usageKwh: number; electricityUnitPrice: number; electricityUnitPriceIsApprox: boolean }> => {
  const previous = await Consumption.findOne({
    roomID: consumption.roomID,
    trackingTime: { $lt: consumption.trackingTime },
  }).sort({ trackingTime: -1 });

  const previousReading = previous ? previous.meterReading : 0;
  const usageKwh = consumption.meterReading - previousReading;

  if (usageKwh > 0) {
    return {
      usageKwh,
      electricityUnitPrice: Math.round(invoice.electricalBill / usageKwh),
      electricityUnitPriceIsApprox: false,
    };
  }

  const currentPrice = await getParamNumber(ParameterName.ELECTRICITY_UNIT_PRICE, 0);
  return {
    usageKwh,
    electricityUnitPrice: currentPrice,
    electricityUnitPriceIsApprox: true,
  };
};
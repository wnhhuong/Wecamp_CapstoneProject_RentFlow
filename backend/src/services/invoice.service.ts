import { Types, ClientSession } from 'mongoose';
import Invoice, { IInvoice } from '../models/Invoice.js';
import Parameter from '../models/Parameter.js';
import Consumption, { IConsumption } from '../models/Consumption.js';
import { ParameterName, InvoiceStatus } from '../models/enums.js';
import { getVNDateParts } from '../utils/dateFormat.js';


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
 * Tính dueDate cho invoice mới tạo, dựa trên Parameter "paymentDueDay" 
 * Fallback ngày 10 nếu Parameter thiếu/lỗi, để không chặn toàn bộ luồng approve chỉ vì thiếu 1 config phụ.
 */
const computeDueDate = async (createdDate: Date, session?: ClientSession): Promise<Date> => {
  const raw = await getParamRaw(ParameterName.PAYMENT_DUE_DAY, session);
  const dayOfMonth = raw ? Number(raw) : 10; 

  const { month, year } = getVNDateParts(createdDate);

  return new Date(Date.UTC(year, month, dayOfMonth));
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
  { consumptionID, consumpAmount, roomBill}: BuildInvoiceInput,
  session?: ClientSession,
): Promise<IInvoice> => {
  const electricityUnitPrice = await getParamNumber(ParameterName.ELECTRICITY_UNIT_PRICE, 0, session);
  const waterBill = await getParamNumber(ParameterName.WATER_PRICE, 0, session);
  const wifiBill = await getParamNumber(ParameterName.WIFI_FEE, 0, session);
  const otherBill = await getParamNumber(ParameterName.OTHER_FEES, 0, session);
  const parkingBill = await getParamNumber(ParameterName.PARKING_FEE, 0, session); 

  const electricalBill = consumpAmount * electricityUnitPrice;
  const totalBill = roomBill + electricalBill + waterBill + wifiBill + parkingBill + otherBill;

  const createdDate = new Date();
  const dueDate = await computeDueDate(createdDate, session);

  const created = await Invoice.create(
    [
      {
        consumptionID: consumptionID,
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
  const { month, year } = getVNDateParts(trackingTime);
  return `${year}-${month.toString().padStart(2, '0')}`;
}

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
/**
 * Development seed for RentFlow.
 *
 * Relationships use Mongoose-generated ObjectIds. Dates are relative to
 * seedNow so active contracts do not silently become stale.
 * Run only against a disposable database: npm run seed -- --reset
 */
import 'dotenv/config';

import assert from 'node:assert/strict';
import { access, cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import bcrypt from 'bcrypt';
import mongoose, { Types } from 'mongoose';

import Account from './models/Account.js';
import Area from './models/Area.js';
import CheckoutRequest from './models/CheckoutRequest.js';
import Complain from './models/Complain.js';
import ConsumpRequest from './models/ConsumpRequest.js';
import Consumption from './models/Consumption.js';
import Contract from './models/Contract.js';
import ExtendRequest from './models/ExtendRequest.js';
import Facility from './models/Facility.js';
import FacilityType from './models/FacilityType.js';
import Invoice from './models/Invoice.js';
import LatePaymentRequest from './models/LatePaymentRequest.js';
import MoveoutRequest from './models/MoveoutRequest.js';
import PaidRequest from './models/PaidRequest.js';
import Parameter from './models/Parameter.js';
import Repair from './models/Repair.js';
import RequestModel from './models/Request.js';
import Room from './models/Room.js';
import Ticket from './models/Ticket.js';
import User from './models/User.js';
import {
  AccountRole,
  AccountStatus,
  ContractStatus,
  InvoiceStatus,
  ParameterName,
  RequestStatus,
  RequestType,
  RoomStatus,
  Sex,
  TicketStatus,
  TicketType,
} from './models/enums.js';
import { getVNDateParts } from './utils/dateFormat.js';

const mongoUri = process.env.MONGO_URI;
const shouldReset = process.argv.includes('--reset');

if (!mongoUri) throw new Error('MONGO_URI is required. Add it to backend/.env before seeding.');
if (!shouldReset) {
  throw new Error('Refusing to delete data. Run npm run seed -- --reset only against a disposable development database.');
}

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const seedAssetsRoot = resolve(backendRoot, 'seed-assets', 'uploads');
const uploadsRoot = resolve(backendRoot, 'uploads');

const id = (map: Map<string, Types.ObjectId>, key: string, label: string): Types.ObjectId => {
  const value = map.get(key);
  if (!value) throw new Error(`${label} not found for key "${key}".`);
  return value;
};

const objectId = (value: unknown): Types.ObjectId => value as Types.ObjectId;
const addHours = (date: Date, hours: number): Date => new Date(date.getTime() + hours * HOUR_MS);
const addDays = (date: Date, days: number): Date => new Date(date.getTime() + days * DAY_MS);

const addYears = (date: Date, years: number): Date => {
  const result = new Date(date);
  result.setUTCFullYear(result.getUTCFullYear() + years);
  return result;
};

const parseSeedNow = (): Date => {
  const raw = process.env.SEED_REFERENCE_DATE?.trim();
  if (!raw) return new Date();

  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T12:00:00+07:00`)
    : new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('SEED_REFERENCE_DATE must be YYYY-MM-DD or a valid ISO timestamp.');
  }
  return parsed;
};

const seedNow = parseSeedNow();
// Use this month's reading window only after the full demo workflow fits in
// the past; otherwise use the previous completed window.
const currentCaptureAt = (() => {
  const { month, year } = getVNDateParts(seedNow);
  const currentWindowCandidate = new Date(Date.UTC(year, month - 1, 25, 1, 0, 0));
  if (seedNow.getTime() >= addHours(currentWindowCandidate, 7).getTime()) {
    return currentWindowCandidate;
  }
  return new Date(Date.UTC(year, month - 2, 28, 1, 0, 0));
})();

const anchorParts = getVNDateParts(currentCaptureAt);

const dateInBillingMonth = (monthOffset: number, day: number, hour = 8): Date => {
  const normalized = new Date(Date.UTC(anchorParts.year, anchorParts.month - 1 + monthOffset, 1));
  return new Date(Date.UTC(normalized.getUTCFullYear(), normalized.getUTCMonth(), day, hour - 7));
};

const dueDateFor = (invoiceCreatedAt: Date): Date => {
  const { month, year } = getVNDateParts(invoiceCreatedAt);
  return new Date(Date.UTC(year, month, 5));
};

const syncSeedAssets = async (): Promise<void> => {
  await access(seedAssetsRoot);
  await mkdir(uploadsRoot, { recursive: true });
  await cp(seedAssetsRoot, uploadsRoot, { recursive: true, force: true });
};

async function clearCollections(): Promise<void> {
  await Promise.all([
    Repair.deleteMany({}),
    Complain.deleteMany({}),
    CheckoutRequest.deleteMany({}),
    MoveoutRequest.deleteMany({}),
    ExtendRequest.deleteMany({}),
    ConsumpRequest.deleteMany({}),
    PaidRequest.deleteMany({}),
    LatePaymentRequest.deleteMany({}),
  ]);
  await Promise.all([Invoice.deleteMany({}), RequestModel.deleteMany({}), Ticket.deleteMany({})]);
  await Promise.all([Consumption.deleteMany({}), Facility.deleteMany({}), Contract.deleteMany({}), Account.deleteMany({})]);
  await Promise.all([Room.deleteMany({}), User.deleteMany({}), FacilityType.deleteMany({}), Area.deleteMany({}), Parameter.deleteMany({})]);
}

const parameterValues = new Map<ParameterName, string>([
  [ParameterName.ELECTRICITY_UNIT_PRICE, '3500'],
  [ParameterName.WATER_PRICE, '150000'],
  [ParameterName.WIFI_FEE, '100000'],
  [ParameterName.PARKING_FEE, '70000'],
  [ParameterName.OTHER_FEES, '30000'],
  [ParameterName.METER_READING_START_DAY, '25'],
  [ParameterName.METER_READING_END_DAY, '30'],
  [ParameterName.PAYMENT_DUE_DAY, '05'],
  [ParameterName.YEAR_TO_EXTEND, '1'],
  [ParameterName.ADMIN_PHONE, '0901234567'],
  [ParameterName.ADMIN_FACEBOOK, 'https://facebook.com/rentflow'],
  [ParameterName.ADMIN_ZALO, '0901234567'],
  [ParameterName.ADDRESS, '12 Nguyễn Trãi, Thanh Xuân, Hà Nội'],
  [ParameterName.PROPERTY_NAME, 'RentFlow Residence'],
  [ParameterName.ADMIN_EMAIL, 'admin@rentflow.vn'],
  [ParameterName.BANK_ACCOUNT_HOLDER, 'NGUYEN THI BINH'],
  [ParameterName.BANK_NAME, 'Vietcombank (VCB)'],
  [ParameterName.BANK_ACCOUNT_NUMBER, '0071000999999'],
  [
    ParameterName.CONTRACT_PLACEHOLDER,
    'This Room Lease Agreement is made between Nguyễn Thị Bình (the Owner) and {fullName}, identity number {identityNo}, residing at {placeOfResidence} (the Tenant). The Tenant confirms that the personal information supplied during first login is accurate.\n\nThe Owner leases Room {roomCode} at Nhà trọ Bình An, 128 Đường số 7, Thủ Đức, to the Tenant from {startDate} until {expireDate}. The room is intended only for residential use by the registered Tenant.\n\nThe monthly rent is {rent}. A property deposit of {deposit} is recorded for this contract. Electricity is charged at ₫ 3.500 for each tenant-submitted meterReading approved by the Owner. Other monthly services are shown on the Tenant invoice.\n\nInvoices are issued monthly and must be paid by the displayed due date. If payment cannot be made on time, the Tenant may submit a late-payment request. A payment is recorded as paid only after the Owner confirms receipt.\n\nThe Tenant must use the room and shared areas responsibly, report repair needs through RentFlow, and compensate for damage caused by misuse. The Owner is responsible for maintaining the property facilities under their control.\n\nTo end the lease, the Tenant must first submit a move-out notice with a proposed date. On the approved checkout date, the Tenant must submit the final electricity image and final meterReading.\n\nBy signing electronically below, the Tenant confirms having read, understood and accepted this agreement. The electronic signature, timestamp and account identity will be associated with this agreement.',
  ],
]);

const numberParameter = (name: ParameterName): number => {
  const value = Number(parameterValues.get(name));
  if (!Number.isFinite(value)) throw new Error(`Invalid numeric seed parameter: ${name}.`);
  return value;
};

interface RoomSeed {
  roomCode: string;
  areaName: string;
  floor: number;
  maxPeople: number;
  price: number;
  deposit: number;
  status: RoomStatus;
  imageSource: string;
  roomDetail: string;
  availableFrom: Date;
}

const activeRoomCodes = new Set([
  'A-101', 'A-102', 'A-103', 'A-202',
  'B-101', 'B-102', 'B-103', 'B-201',
  'C-101', 'C-201', 'C-202', 'C-301',
]);

const moveoutApprovedDates = new Map<string, Date>([
  ['B-201', addDays(seedNow, 21)],
  ['C-101', addDays(seedNow, 14)],
]);

const roomSeeds: RoomSeed[] = [
  { roomCode: 'A-101', areaName: 'Building A', floor: 1, maxPeople: 2, price: 3200000, deposit: 3200000, status: RoomStatus.RENTED, imageSource: 'A-101', roomDetail: 'Bright corner room with private bathroom and balcony.', availableFrom: seedNow },
  { roomCode: 'A-102', areaName: 'Building A', floor: 1, maxPeople: 2, price: 3400000, deposit: 3400000, status: RoomStatus.RENTED, imageSource: 'A-102', roomDetail: 'Quiet room near the stairwell with practical furniture.', availableFrom: seedNow },
  { roomCode: 'A-103', areaName: 'Building A', floor: 1, maxPeople: 2, price: 3350000, deposit: 3350000, status: RoomStatus.RENTED, imageSource: 'A-102', roomDetail: 'Well-ventilated room close to the shared kitchen.', availableFrom: seedNow },
  { roomCode: 'A-201', areaName: 'Building A', floor: 2, maxPeople: 1, price: 2800000, deposit: 2800000, status: RoomStatus.AVAILABLE_NOW, imageSource: 'A-201', roomDetail: 'Compact furnished room for one occupant.', availableFrom: seedNow },
  { roomCode: 'A-202', areaName: 'Building A', floor: 2, maxPeople: 2, price: 3500000, deposit: 3500000, status: RoomStatus.RENTED, imageSource: 'A-201', roomDetail: 'Two-person room with good daylight and storage.', availableFrom: seedNow },
  { roomCode: 'A-301', areaName: 'Building A', floor: 3, maxPeople: 2, price: 3300000, deposit: 3300000, status: RoomStatus.AVAILABLE_SOON, imageSource: 'A-301', roomDetail: 'Room awaiting final cleaning and maintenance.', availableFrom: addDays(seedNow, 30) },
  { roomCode: 'A-302', areaName: 'Building A', floor: 3, maxPeople: 2, price: 3450000, deposit: 3450000, status: RoomStatus.AVAILABLE_NOW, imageSource: 'A-301', roomDetail: 'Freshly renovated room with a private bathroom.', availableFrom: seedNow },
  { roomCode: 'A-401', areaName: 'Building A', floor: 4, maxPeople: 1, price: 2700000, deposit: 2700000, status: RoomStatus.NOT_AVAILABLE, imageSource: 'C-401', roomDetail: 'Temporarily unavailable for electrical maintenance.', availableFrom: addDays(seedNow, 60) },
  { roomCode: 'B-101', areaName: 'Building B', floor: 1, maxPeople: 3, price: 3800000, deposit: 3800000, status: RoomStatus.RENTED, imageSource: 'B-101', roomDetail: 'Large room close to the parking area.', availableFrom: seedNow },
  { roomCode: 'B-102', areaName: 'Building B', floor: 1, maxPeople: 2, price: 3600000, deposit: 3600000, status: RoomStatus.RENTED, imageSource: 'B-101', roomDetail: 'Comfortable room with a quiet courtyard view.', availableFrom: seedNow },
  { roomCode: 'B-103', areaName: 'Building B', floor: 1, maxPeople: 2, price: 3550000, deposit: 3550000, status: RoomStatus.RENTED, imageSource: 'B-101', roomDetail: 'Convenient ground-floor room near the entrance.', availableFrom: seedNow },
  { roomCode: 'B-201', areaName: 'Building B', floor: 2, maxPeople: 2, price: 3700000, deposit: 3700000, status: RoomStatus.AVAILABLE_SOON, imageSource: 'B-202', roomDetail: 'Active tenancy with an approved move-out notice.', availableFrom: moveoutApprovedDates.get('B-201')! },
  { roomCode: 'B-202', areaName: 'Building B', floor: 2, maxPeople: 2, price: 3600000, deposit: 3600000, status: RoomStatus.NOT_AVAILABLE, imageSource: 'B-202', roomDetail: 'Temporarily closed for bathroom renovation.', availableFrom: addDays(seedNow, 45) },
  { roomCode: 'B-203', areaName: 'Building B', floor: 2, maxPeople: 3, price: 3900000, deposit: 3900000, status: RoomStatus.AVAILABLE_NOW, imageSource: 'B-202', roomDetail: 'Spacious room suitable for a small family.', availableFrom: seedNow },
  { roomCode: 'B-301', areaName: 'Building B', floor: 3, maxPeople: 2, price: 3750000, deposit: 3750000, status: RoomStatus.AVAILABLE_SOON, imageSource: 'A-301', roomDetail: 'Room scheduled to reopen after repainting.', availableFrom: addDays(seedNow, 20) },
  { roomCode: 'B-302', areaName: 'Building B', floor: 3, maxPeople: 1, price: 2900000, deposit: 2900000, status: RoomStatus.AVAILABLE_NOW, imageSource: 'C-401', roomDetail: 'Private single room with compact furnishings.', availableFrom: seedNow },
  { roomCode: 'C-101', areaName: 'Building C', floor: 1, maxPeople: 2, price: 3650000, deposit: 3650000, status: RoomStatus.AVAILABLE_SOON, imageSource: 'C-302', roomDetail: 'Tenant is completing the approved checkout process.', availableFrom: moveoutApprovedDates.get('C-101')! },
  { roomCode: 'C-102', areaName: 'Building C', floor: 1, maxPeople: 2, price: 3550000, deposit: 3550000, status: RoomStatus.AVAILABLE_NOW, imageSource: 'C-302', roomDetail: 'Recently vacated room ready for a new tenant.', availableFrom: seedNow },
  { roomCode: 'C-201', areaName: 'Building C', floor: 2, maxPeople: 2, price: 3900000, deposit: 3900000, status: RoomStatus.RENTED, imageSource: 'C-301', roomDetail: 'Modern room with generous natural light.', availableFrom: seedNow },
  { roomCode: 'C-202', areaName: 'Building C', floor: 2, maxPeople: 3, price: 4100000, deposit: 4100000, status: RoomStatus.RENTED, imageSource: 'C-301', roomDetail: 'Large furnished room for up to three occupants.', availableFrom: seedNow },
  { roomCode: 'C-301', areaName: 'Building C', floor: 3, maxPeople: 3, price: 4200000, deposit: 4200000, status: RoomStatus.RENTED, imageSource: 'C-301', roomDetail: 'Premium high-floor room with city views.', availableFrom: seedNow },
  { roomCode: 'C-302', areaName: 'Building C', floor: 3, maxPeople: 2, price: 3500000, deposit: 3500000, status: RoomStatus.AVAILABLE_NOW, imageSource: 'C-302', roomDetail: 'Prepared room waiting for first-login onboarding.', availableFrom: seedNow },
  { roomCode: 'C-401', areaName: 'Building C', floor: 4, maxPeople: 1, price: 2500000, deposit: 2500000, status: RoomStatus.AVAILABLE_NOW, imageSource: 'C-401', roomDetail: 'Prepared single room waiting for onboarding.', availableFrom: seedNow },
  { roomCode: 'C-402', areaName: 'Building C', floor: 4, maxPeople: 4, price: 5000000, deposit: 5000000, status: RoomStatus.AVAILABLE_NOW, imageSource: 'C-402', roomDetail: 'Large room used to test account preparation.', availableFrom: seedNow },
];

const roomImages = (source: string): string[] =>
  [1, 2, 3, 4].map((index) => `/uploads/rooms/${source}-${index}.jpg`);

interface UserSeed {
  key: string;
  fullName: string;
  birthDate: string;
  phoneNumber: string;
  identityNo: string;
  sex: Sex;
  nationality: string;
  placeOfResidence: string;
}

const userSeeds: UserSeed[] = [
  { key: 'an', fullName: 'Nguyễn Văn An', birthDate: '2002-06-14', phoneNumber: '0901234501', identityNo: '001202000001', sex: Sex.MALE, nationality: 'Vietnamese', placeOfResidence: 'Hà Nội' },
  { key: 'binh', fullName: 'Trần Thị Bình', birthDate: '2001-11-20', phoneNumber: '0901234502', identityNo: '001201000002', sex: Sex.FEMALE, nationality: 'Vietnamese', placeOfResidence: 'Nam Định' },
  { key: 'chau', fullName: 'Lê Minh Châu', birthDate: '1998-03-08', phoneNumber: '0901234503', identityNo: '001198000003', sex: Sex.OTHER, nationality: 'Vietnamese', placeOfResidence: 'Đà Nẵng' },
  { key: 'dung', fullName: 'Phạm Hoàng Dũng', birthDate: '1995-09-02', phoneNumber: '0901234504', identityNo: '001195000004', sex: Sex.MALE, nationality: 'Vietnamese', placeOfResidence: 'TP. Hồ Chí Minh' },
  { key: 'lan', fullName: 'Võ Ngọc Lan', birthDate: '2000-01-19', phoneNumber: '0901234505', identityNo: '001200000005', sex: Sex.FEMALE, nationality: 'Vietnamese', placeOfResidence: 'Bình Định' },
  { key: 'minh', fullName: 'Đỗ Quốc Minh', birthDate: '1999-05-11', phoneNumber: '0901234506', identityNo: '001199000006', sex: Sex.MALE, nationality: 'Vietnamese', placeOfResidence: 'Hải Dương' },
  { key: 'ngan', fullName: 'Hoàng Thu Ngân', birthDate: '2001-08-25', phoneNumber: '0901234507', identityNo: '001201000007', sex: Sex.FEMALE, nationality: 'Vietnamese', placeOfResidence: 'Ninh Bình' },
  { key: 'phuc', fullName: 'Nguyễn Gia Phúc', birthDate: '1997-12-03', phoneNumber: '0901234508', identityNo: '001197000008', sex: Sex.MALE, nationality: 'Vietnamese', placeOfResidence: 'Cần Thơ' },
  { key: 'quyen', fullName: 'Bùi Hồng Quyên', birthDate: '2000-04-17', phoneNumber: '0901234509', identityNo: '001200000009', sex: Sex.FEMALE, nationality: 'Vietnamese', placeOfResidence: 'Huế' },
  { key: 'son', fullName: 'Trương Minh Sơn', birthDate: '1996-10-09', phoneNumber: '0901234510', identityNo: '001196000010', sex: Sex.MALE, nationality: 'Vietnamese', placeOfResidence: 'Quảng Nam' },
  { key: 'thao', fullName: 'Phan Thanh Thảo', birthDate: '1999-02-26', phoneNumber: '0901234515', identityNo: '001199000015', sex: Sex.FEMALE, nationality: 'Vietnamese', placeOfResidence: 'Khánh Hòa' },
  { key: 'tuan', fullName: 'Lý Anh Tuấn', birthDate: '1998-07-07', phoneNumber: '0901234516', identityNo: '001198000016', sex: Sex.MALE, nationality: 'Vietnamese', placeOfResidence: 'Đồng Nai' },
  { key: 'old-an', fullName: 'Ngô Quang Huy', birthDate: '1990-04-12', phoneNumber: '0901234521', identityNo: '001190000021', sex: Sex.MALE, nationality: 'Vietnamese', placeOfResidence: 'Hải Phòng' },
  { key: 'old-binh', fullName: 'Đặng Thị Mai', birthDate: '1992-12-01', phoneNumber: '0901234522', identityNo: '001192000022', sex: Sex.FEMALE, nationality: 'Vietnamese', placeOfResidence: 'Quảng Ninh' },
  { key: 'old-chau', fullName: 'Phan Gia Hân', birthDate: '1997-07-23', phoneNumber: '0901234523', identityNo: '001197000023', sex: Sex.FEMALE, nationality: 'Vietnamese', placeOfResidence: 'Huế' },
  { key: 'old-dung', fullName: 'Bùi Đức Long', birthDate: '1993-02-18', phoneNumber: '0901234524', identityNo: '001193000024', sex: Sex.MALE, nationality: 'Vietnamese', placeOfResidence: 'Nghệ An' },
  { key: 'old-checkout', fullName: 'Đinh Thanh Vân', birthDate: '1994-09-15', phoneNumber: '0901234525', identityNo: '001194000025', sex: Sex.FEMALE, nationality: 'Vietnamese', placeOfResidence: 'Bắc Ninh' },
];

const currentTenants = new Map<string, string>([
  ['A-101', 'an'], ['A-102', 'binh'], ['A-103', 'lan'], ['A-202', 'minh'],
  ['B-101', 'chau'], ['B-102', 'ngan'], ['B-103', 'phuc'], ['B-201', 'quyen'],
  ['C-101', 'son'], ['C-201', 'thao'], ['C-202', 'tuan'], ['C-301', 'dung'],
]);

const historicalTenants = new Map<string, string>([
  ['A-101', 'old-an'],
  ['A-102', 'old-binh'],
  ['B-101', 'old-chau'],
  ['C-301', 'old-dung'],
]);

const signaturePaths = [
  '/uploads/signatures/contract-501.png',
  '/uploads/signatures/contract-502.png',
  '/uploads/signatures/contract-503.png',
  '/uploads/signatures/contract-504.png',
];

const oldSignaturePaths = [
  '/uploads/signatures/contract-old-a101.png',
  '/uploads/signatures/contract-old-a102.png',
  '/uploads/signatures/contract-old-b101.png',
  '/uploads/signatures/contract-old-c301.png',
];

const consumptionImages = [
  '/uploads/consumption/A-101-202608.jpg',
  '/uploads/consumption/A-102-202608.jpg',
  '/uploads/consumption/B-101-202608.jpg',
  '/uploads/consumption/C-301-202608.jpg',
];

interface CreateRequestInput {
  type: RequestType;
  roomCode: string;
  userKey: string;
  createDate: Date;
  status: RequestStatus;
  resolveDate?: Date;
}

interface BillingChainInput {
  roomCode: string;
  userKey: string;
  contractKey: string;
  capturedAt: Date;
  usage: number;
  imageIndex: number;
  payment: 'paid' | 'pending' | 'none';
  latePayment?: 'approved' | 'pending';
}

interface SeedContext {
  roomIds: Map<string, Types.ObjectId>;
  userIds: Map<string, Types.ObjectId>;
  contractIds: Map<string, Types.ObjectId>;
  contractRent: Map<string, number>;
  meterReadings: Map<string, number>;
}

const createParentRequest = async (
  context: SeedContext,
  input: CreateRequestInput,
): Promise<Types.ObjectId> => {
  const request = await RequestModel.create({
    type: input.type,
    roomID: id(context.roomIds, input.roomCode, 'Room'),
    userID: id(context.userIds, input.userKey, 'User'),
    createDate: input.createDate,
    resolveDate: input.resolveDate,
    status: input.status,
  });
  return objectId(request._id);
};

const seedBillingChain = async (
  context: SeedContext,
  input: BillingChainInput,
): Promise<void> => {
  const previousReading = context.meterReadings.get(input.roomCode);
  if (previousReading === undefined) throw new Error(`Missing meter baseline for ${input.roomCode}.`);

  const reading = previousReading + input.usage;
  const approvalDate = addHours(input.capturedAt, 2);
  const consumpRequestID = await createParentRequest(context, {
    type: RequestType.CONSUMP,
    roomCode: input.roomCode,
    userKey: input.userKey,
    createDate: input.capturedAt,
    resolveDate: approvalDate,
    status: RequestStatus.APPROVED,
  });
  const meterImage = consumptionImages[input.imageIndex % consumptionImages.length];
  await ConsumpRequest.create({ requestID: consumpRequestID, image: meterImage, reading, capturedAt: input.capturedAt });

  const consumption = await Consumption.create({
    roomID: id(context.roomIds, input.roomCode, 'Room'),
    meterReading: reading,
    trackingTime: input.capturedAt,
    e_meterImage: meterImage,
  });
  context.meterReadings.set(input.roomCode, reading);

  const electricityUnitPrice = numberParameter(ParameterName.ELECTRICITY_UNIT_PRICE);
  const waterBill = numberParameter(ParameterName.WATER_PRICE);
  const wifiBill = numberParameter(ParameterName.WIFI_FEE);
  const parkingBill = numberParameter(ParameterName.PARKING_FEE);
  const otherBill = numberParameter(ParameterName.OTHER_FEES);
  const roomBill = context.contractRent.get(input.contractKey);
  if (roomBill === undefined) throw new Error(`Missing contract rent for ${input.contractKey}.`);

  const electricalBill = input.usage * electricityUnitPrice;
  const totalBill = roomBill + electricalBill + waterBill + wifiBill + parkingBill + otherBill;
  const invoice = await Invoice.create({
    consumptionID: consumption._id,
    roomBill,
    electricalBill,
    waterBill,
    wifiBill,
    parkingBill,
    otherBill,
    electricityUnitPrice,
    totalBill,
    createdDate: approvalDate,
    dueDate: dueDateFor(approvalDate),
    isRequestLate: input.latePayment === 'approved',
    status: input.payment === 'paid' ? InvoiceStatus.PAID : InvoiceStatus.NOT_PAID,
    paymentDate: input.payment === 'paid' ? addHours(approvalDate, 2) : undefined,
  });

  if (input.payment === 'paid' || input.payment === 'pending') {
    const paymentRequestDate = addHours(approvalDate, 1);
    const paidRequestID = await createParentRequest(context, {
      type: RequestType.PAID,
      roomCode: input.roomCode,
      userKey: input.userKey,
      createDate: paymentRequestDate,
      resolveDate: input.payment === 'paid' ? addHours(paymentRequestDate, 1) : undefined,
      status: input.payment === 'paid' ? RequestStatus.APPROVED : RequestStatus.PENDING,
    });
    await PaidRequest.create({ requestID: paidRequestID, invoiceID: invoice._id });
  }

  if (input.latePayment) {
    const lateCreateDate = addHours(approvalDate, 1);
    const lateRequestID = await createParentRequest(context, {
      type: RequestType.DELAY,
      roomCode: input.roomCode,
      userKey: input.userKey,
      createDate: lateCreateDate,
      resolveDate: input.latePayment === 'approved' ? addHours(lateCreateDate, 1) : undefined,
      status: input.latePayment === 'approved' ? RequestStatus.APPROVED : RequestStatus.PENDING,
    });
    await LatePaymentRequest.create({ requestID: lateRequestID, invoiceID: invoice._id });
  }
};

const createMeterBaseline = async (
  context: SeedContext,
  roomCode: string,
  reading: number,
  trackingTime: Date,
  imageIndex: number,
): Promise<void> => {
  const image = consumptionImages[imageIndex % consumptionImages.length];
  await Consumption.create({
    roomID: id(context.roomIds, roomCode, 'Room'),
    meterReading: reading,
    trackingTime,
    e_meterImage: image,
  });
  context.meterReadings.set(roomCode, reading);
};

const requestDetailExists = async (requestID: Types.ObjectId, type: RequestType): Promise<boolean> => {
  switch (type) {
    case RequestType.CONSUMP:
      return Boolean(await ConsumpRequest.exists({ requestID }));
    case RequestType.DELAY:
      return Boolean(await LatePaymentRequest.exists({ requestID }));
    case RequestType.CHECKOUT:
      return Boolean(await CheckoutRequest.exists({ requestID }));
    case RequestType.PAID:
      return Boolean(await PaidRequest.exists({ requestID }));
    case RequestType.EXTEND:
      return Boolean(await ExtendRequest.exists({ requestID }));
    case RequestType.MOVEOUT:
      return Boolean(await MoveoutRequest.exists({ requestID }));
  }
  return false;
};

const assetFile = (publicPath: string): string => resolve(backendRoot, publicPath.replace(/^\//, ''));

const validateSeedData = async (): Promise<void> => {
  const [rooms, accounts, contracts, requests, consumptions, invoices] = await Promise.all([
    Room.find().lean(),
    Account.find().lean(),
    Contract.find().lean(),
    RequestModel.find().lean(),
    Consumption.find().sort({ roomID: 1, trackingTime: 1 }).lean(),
    Invoice.find().lean(),
  ]);

  assert.equal(rooms.length, 24, 'Seed must contain exactly 24 rooms.');
  const roomAccounts = accounts.filter((account) => account.role === AccountRole.USER);
  assert.equal(roomAccounts.length, 24, 'Every room must have one room account.');
  assert.equal(
    new Set(roomAccounts.map((account) => String(account.roomID))).size,
    rooms.length,
    'Room accounts must have a one-to-one relationship with rooms.',
  );
  assert.equal(new Set(rooms.map((room) => room.roomCode)).size, rooms.length, 'Room codes must be unique.');

  const activeContracts = contracts.filter((contract) => contract.status === ContractStatus.ACTIVE);
  assert.equal(activeContracts.length, activeRoomCodes.size, 'Active tenancy count must match active room plan.');
  const roomById = new Map(rooms.map((room) => [String(room._id), room]));
  const accountByRoomId = new Map(
    accounts.filter((account) => account.roomID).map((account) => [String(account.roomID), account]),
  );
  for (const contract of activeContracts) {
    const room = roomById.get(String(contract.roomID));
    const account = accountByRoomId.get(String(contract.roomID));
    assert(room, `Active contract ${String(contract._id)} has no room.`);
    assert(activeRoomCodes.has(room.roomCode), `${room.roomCode} is not in the active tenancy plan.`);
    assert(
      room.status === RoomStatus.RENTED || room.status === RoomStatus.AVAILABLE_SOON,
      `${room.roomCode} has an active contract but an invalid room status.`,
    );
    assert.equal(account?.status, AccountStatus.ACTIVE, `${room.roomCode} must have an active account.`);
    assert(contract.expireDate.getTime() > seedNow.getTime(), `${room.roomCode} active contract is already expired.`);
  }

  for (const type of Object.values(RequestType)) {
    assert(
      requests.some((request) => request.type === type && request.status === RequestStatus.PENDING),
      `Missing pending ${type} request.`,
    );
    assert(
      requests.some((request) => request.type === type && request.status === RequestStatus.APPROVED),
      `Missing approved ${type} request.`,
    );
  }

  for (const request of requests) {
    assert(request.createDate.getTime() <= seedNow.getTime(), `Request ${String(request._id)} is dated in the future.`);
    if (request.resolveDate) {
      assert(request.resolveDate.getTime() <= seedNow.getTime(), `Request ${String(request._id)} resolves in the future.`);
    }
    assert.equal(
      request.status === RequestStatus.APPROVED,
      Boolean(request.resolveDate),
      `Request ${String(request._id)} resolveDate does not match its status.`,
    );
    assert(
      await requestDetailExists(objectId(request._id), request.type),
      `Request ${String(request._id)} has no matching ${request.type} detail.`,
    );
  }

  const previousReadingByRoom = new Map<string, number>();
  for (const consumption of consumptions) {
    const roomKey = String(consumption.roomID);
    const previousReading = previousReadingByRoom.get(roomKey);
    if (previousReading !== undefined) {
      assert(
        consumption.meterReading > previousReading,
        `Meter reading for room ${roomKey} must increase over time.`,
      );
    }
    previousReadingByRoom.set(roomKey, consumption.meterReading);
    await access(assetFile(consumption.e_meterImage));
  }

  const consumptionById = new Map(consumptions.map((consumption) => [String(consumption._id), consumption]));
  const consumpDetails = await ConsumpRequest.find().lean();
  const requestById = new Map(requests.map((request) => [String(request._id), request]));
  const paidDetails = await PaidRequest.find().lean();
  const lateDetails = await LatePaymentRequest.find().lean();

  for (const invoice of invoices) {
    const consumption = consumptionById.get(String(invoice.consumptionID));
    assert(consumption, `Invoice ${String(invoice._id)} has no Consumption.`);
    const matchingDetail = consumpDetails.find((detail) => {
      const parent = requestById.get(String(detail.requestID));
      return Boolean(
        parent &&
        parent.status === RequestStatus.APPROVED &&
        String(parent.roomID) === String(consumption.roomID) &&
        detail.reading === consumption.meterReading &&
        detail.capturedAt.getTime() === consumption.trackingTime.getTime()
      );
    });
    assert(matchingDetail, `Invoice ${String(invoice._id)} is missing its approved consumption request.`);

    assert.equal(invoice.waterBill, numberParameter(ParameterName.WATER_PRICE));
    assert.equal(invoice.wifiBill, numberParameter(ParameterName.WIFI_FEE));
    assert.equal(invoice.parkingBill, numberParameter(ParameterName.PARKING_FEE));
    assert.equal(invoice.otherBill, numberParameter(ParameterName.OTHER_FEES));
    assert.equal(invoice.electricityUnitPrice, numberParameter(ParameterName.ELECTRICITY_UNIT_PRICE));
    assert.equal(
      invoice.dueDate.getTime(),
      dueDateFor(invoice.createdDate).getTime(),
      `Invoice ${String(invoice._id)} dueDate does not match the backend billing rule.`,
    );
    assert.equal(
      invoice.totalBill,
      invoice.roomBill + invoice.electricalBill + invoice.waterBill + invoice.wifiBill + invoice.parkingBill + invoice.otherBill,
      `Invoice ${String(invoice._id)} total is inconsistent.`,
    );

    const approvedPaid = paidDetails.some((detail) => {
      const parent = requestById.get(String(detail.requestID));
      return String(detail.invoiceID) === String(invoice._id) && parent?.status === RequestStatus.APPROVED;
    });
    if (invoice.status === InvoiceStatus.PAID) {
      assert(invoice.paymentDate, `Paid invoice ${String(invoice._id)} has no paymentDate.`);
      assert(approvedPaid, `Paid invoice ${String(invoice._id)} has no approved payment request.`);
    } else {
      const roomHasActiveContract = activeContracts.some(
        (contract) => String(contract.roomID) === String(consumption.roomID),
      );
      assert(roomHasActiveContract, `Unpaid invoice ${String(invoice._id)} belongs to an expired tenancy.`);
    }

    const approvedLate = lateDetails.some((detail) => {
      const parent = requestById.get(String(detail.requestID));
      return String(detail.invoiceID) === String(invoice._id) && parent?.status === RequestStatus.APPROVED;
    });
    assert.equal(invoice.isRequestLate, approvedLate, `Invoice ${String(invoice._id)} late flag is inconsistent.`);
  }

  for (const detail of paidDetails) {
    const invoice = invoices.find((candidate) => String(candidate._id) === String(detail.invoiceID));
    const parent = requestById.get(String(detail.requestID));
    assert(invoice && parent, `Payment request ${String(detail._id)} has a broken relation.`);
    if (parent.status === RequestStatus.PENDING) {
      assert.equal(invoice.status, InvoiceStatus.NOT_PAID, 'Pending payment request must target an unpaid invoice.');
    }
  }

  const moveoutDetails = await MoveoutRequest.find().lean();
  const checkoutDetails = await CheckoutRequest.find().lean();
  for (const checkout of checkoutDetails) {
    const checkoutParent = requestById.get(String(checkout.requestID));
    const approvedMoveout = moveoutDetails.find((moveout) => {
      const moveoutParent = requestById.get(String(moveout.requestID));
      return String(moveout.contractID) === String(checkout.contractID) && moveoutParent?.status === RequestStatus.APPROVED;
    });
    assert(checkoutParent && approvedMoveout, `Checkout ${String(checkout._id)} has no approved move-out prerequisite.`);
    const moveoutParent = requestById.get(String(approvedMoveout.requestID));
    assert(
      checkoutParent.createDate.getTime() >= (moveoutParent?.resolveDate?.getTime() ?? Number.POSITIVE_INFINITY),
      `Checkout ${String(checkout._id)} was created before move-out approval.`,
    );
    await access(assetFile(checkout.finalImage));
  }

  for (const room of rooms) {
    for (const image of room.images) await access(assetFile(image));
  }
  for (const contract of contracts) await access(assetFile(contract.signature));
  for (const detail of consumpDetails) await access(assetFile(detail.image));
  for (const repair of await Repair.find().lean()) await access(assetFile(repair.facilityImage));
};

async function seed(): Promise<void> {
  await mongoose.connect(mongoUri!);
  try {
    console.log(`Seeding relative to ${seedNow.toISOString()}...`);
    await syncSeedAssets();
    await clearCollections();

    await Parameter.insertMany(
      [...parameterValues.entries()].map(([name, value]) => ({ name, value })),
    );

    const areaIds = new Map<string, Types.ObjectId>();
    for (const areaName of ['Building A', 'Building B', 'Building C']) {
      const area = await Area.create({ areaName });
      areaIds.set(areaName, objectId(area._id));
    }

    const roomIds = new Map<string, Types.ObjectId>();
    for (const roomSeed of roomSeeds) {
      const { areaName, imageSource, ...roomData } = roomSeed;
      const room = await Room.create({
        ...roomData,
        areaID: id(areaIds, areaName, 'Area'),
        images: roomImages(imageSource),
      });
      roomIds.set(room.roomCode, objectId(room._id));
    }

    const userIds = new Map<string, Types.ObjectId>();
    for (const { key, birthDate, placeOfResidence, ...userData } of userSeeds) {
      const user = await User.create({
        ...userData,
        DoB: new Date(`${birthDate}T00:00:00.000Z`),
        PoR: placeOfResidence,
      });
      userIds.set(key, objectId(user._id));
    }

    const [adminPassword, tenantPassword, temporaryPassword] = await Promise.all([
      bcrypt.hash('Admin@123', 10),
      bcrypt.hash('Tenant@123', 10),
      bcrypt.hash('Temp@123', 10),
    ]);
    await Account.create({
      username: 'admin',
      password: adminPassword,
      status: AccountStatus.ACTIVE,
      role: AccountRole.ADMIN,
      startDate: dateInBillingMonth(-24, 1),
    });

    const currentContractStart = dateInBillingMonth(-4, 1);
    for (const roomSeed of roomSeeds) {
      const isActive = activeRoomCodes.has(roomSeed.roomCode);
      const isPrepared = roomSeed.roomCode === 'C-302' || roomSeed.roomCode === 'C-401';
      await Account.create({
        roomID: id(roomIds, roomSeed.roomCode, 'Room'),
        username: roomSeed.roomCode,
        password: isActive ? tenantPassword : temporaryPassword,
        status: isActive ? AccountStatus.ACTIVE : isPrepared ? AccountStatus.INACTIVE : AccountStatus.BANNED,
        role: AccountRole.USER,
        startDate: isActive ? currentContractStart : addDays(seedNow, -30),
      });
    }

    const contractIds = new Map<string, Types.ObjectId>();
    const contractRent = new Map<string, number>();
    const historicalContractStart = dateInBillingMonth(-16, 1);
    const historicalContractEnd = addDays(dateInBillingMonth(-4, 1), -1);
    let signatureIndex = 0;

    for (const [roomCode, userKey] of historicalTenants) {
      const roomSeed = roomSeeds.find((candidate) => candidate.roomCode === roomCode);
      assert(roomSeed, `Missing seed room ${roomCode}.`);
      const rentPrice = roomSeed.price - 200000;
      const contractKey = `${roomCode}-old`;
      const contract = await Contract.create({
        userID: id(userIds, userKey, 'User'),
        roomID: id(roomIds, roomCode, 'Room'),
        startDate: historicalContractStart,
        expireDate: historicalContractEnd,
        propertyDeposit: rentPrice,
        rentPrice,
        status: ContractStatus.EXPIRED,
        signature: oldSignaturePaths[signatureIndex % oldSignaturePaths.length],
        signedAt: addHours(historicalContractStart, 2),
      });
      contractIds.set(contractKey, objectId(contract._id));
      contractRent.set(contractKey, rentPrice);
      signatureIndex += 1;
    }

    signatureIndex = 0;
    for (const [roomCode, userKey] of currentTenants) {
      const roomSeed = roomSeeds.find((candidate) => candidate.roomCode === roomCode);
      assert(roomSeed, `Missing seed room ${roomCode}.`);
      const years = roomCode === 'B-102' ? 2 : 1;
      const contract = await Contract.create({
        userID: id(userIds, userKey, 'User'),
        roomID: id(roomIds, roomCode, 'Room'),
        startDate: currentContractStart,
        expireDate: addYears(currentContractStart, years),
        propertyDeposit: roomSeed.deposit,
        rentPrice: roomSeed.price,
        status: ContractStatus.ACTIVE,
        signature: signaturePaths[signatureIndex % signaturePaths.length],
        signedAt: addHours(currentContractStart, 2),
      });
      contractIds.set(roomCode, objectId(contract._id));
      contractRent.set(roomCode, roomSeed.price);
      signatureIndex += 1;
    }

    const checkoutRoom = roomSeeds.find((candidate) => candidate.roomCode === 'C-102');
    assert(checkoutRoom, 'Missing checkout seed room C-102.');
    const checkoutContractStart = dateInBillingMonth(-13, 1);
    const checkoutContract = await Contract.create({
      userID: id(userIds, 'old-checkout', 'User'),
      roomID: id(roomIds, 'C-102', 'Room'),
      startDate: checkoutContractStart,
      expireDate: addYears(checkoutContractStart, 1),
      propertyDeposit: checkoutRoom.deposit,
      rentPrice: checkoutRoom.price,
      status: ContractStatus.EXPIRED,
      signature: '/uploads/signatures/1789795524531-signature.png',
      signedAt: addHours(checkoutContractStart, 2),
    });
    contractIds.set('C-102-checkout', objectId(checkoutContract._id));
    contractRent.set('C-102-checkout', checkoutRoom.price);

    const context: SeedContext = {
      roomIds,
      userIds,
      contractIds,
      contractRent,
      meterReadings: new Map<string, number>(),
    };

    let imageIndex = 0;
    let historyIndex = 0;
    for (const [roomCode, userKey] of historicalTenants) {
      const baseline = 500 + historyIndex * 120;
      await createMeterBaseline(context, roomCode, baseline, dateInBillingMonth(-8, 1), imageIndex);
      for (let period = -7; period <= -5; period += 1) {
        await seedBillingChain(context, {
          roomCode,
          userKey,
          contractKey: `${roomCode}-old`,
          capturedAt: dateInBillingMonth(period, 28, 9),
          usage: 105 + historyIndex * 11 + (period + 7) * 17,
          imageIndex,
          payment: 'paid',
        });
        imageIndex += 1;
      }
      historyIndex += 1;
    }

    let currentIndex = 0;
    for (const [roomCode, userKey] of currentTenants) {
      const baseline = 1200 + currentIndex * 160;
      await createMeterBaseline(context, roomCode, baseline, currentContractStart, imageIndex);
      for (let period = -3; period <= -1; period += 1) {
        await seedBillingChain(context, {
          roomCode,
          userKey,
          contractKey: roomCode,
          capturedAt: dateInBillingMonth(period, 28, 8 + (currentIndex % 4)),
          usage: 92 + currentIndex * 5 + (period + 3) * 13,
          imageIndex,
          payment: 'paid',
        });
        imageIndex += 1;
      }
      currentIndex += 1;
    }

    await createMeterBaseline(context, 'C-102', 910, dateInBillingMonth(-6, 1), imageIndex);
    for (let period = -5; period <= -3; period += 1) {
      await seedBillingChain(context, {
        roomCode: 'C-102',
        userKey: 'old-checkout',
        contractKey: 'C-102-checkout',
        capturedAt: dateInBillingMonth(period, 28, 10),
        usage: 110 + (period + 5) * 9,
        imageIndex,
        payment: 'paid',
      });
      imageIndex += 1;
    }

    await seedBillingChain(context, {
      roomCode: 'A-101',
      userKey: 'an',
      contractKey: 'A-101',
      capturedAt: currentCaptureAt,
      usage: 138,
      imageIndex: 0,
      payment: 'none',
      latePayment: 'pending',
    });
    await seedBillingChain(context, {
      roomCode: 'A-102',
      userKey: 'binh',
      contractKey: 'A-102',
      capturedAt: addHours(currentCaptureAt, 1),
      usage: 121,
      imageIndex: 1,
      payment: 'pending',
    });
    await seedBillingChain(context, {
      roomCode: 'B-101',
      userKey: 'chau',
      contractKey: 'B-101',
      capturedAt: addHours(currentCaptureAt, 2),
      usage: 164,
      imageIndex: 2,
      payment: 'paid',
    });
    await seedBillingChain(context, {
      roomCode: 'A-202',
      userKey: 'minh',
      contractKey: 'A-202',
      capturedAt: addHours(currentCaptureAt, 3),
      usage: 116,
      imageIndex: 3,
      payment: 'none',
      latePayment: 'approved',
    });

    const pendingConsumptionID = await createParentRequest(context, {
      type: RequestType.CONSUMP,
      roomCode: 'C-301',
      userKey: 'dung',
      createDate: addHours(currentCaptureAt, 4),
      status: RequestStatus.PENDING,
    });
    await ConsumpRequest.create({
      requestID: pendingConsumptionID,
      image: consumptionImages[3],
      reading: (context.meterReadings.get('C-301') ?? 0) + 147,
      capturedAt: addHours(currentCaptureAt, 4),
    });

    const pendingExtendID = await createParentRequest(context, {
      type: RequestType.EXTEND,
      roomCode: 'A-103',
      userKey: 'lan',
      createDate: addDays(seedNow, -2),
      status: RequestStatus.PENDING,
    });
    await ExtendRequest.create({
      requestID: pendingExtendID,
      contractID: id(contractIds, 'A-103', 'Contract'),
    });

    const approvedExtendCreateDate = dateInBillingMonth(-1, 12);
    const approvedExtendID = await createParentRequest(context, {
      type: RequestType.EXTEND,
      roomCode: 'B-102',
      userKey: 'ngan',
      createDate: approvedExtendCreateDate,
      resolveDate: addDays(approvedExtendCreateDate, 1),
      status: RequestStatus.APPROVED,
    });
    await ExtendRequest.create({
      requestID: approvedExtendID,
      contractID: id(contractIds, 'B-102', 'Contract'),
    });

    const pendingMoveoutID = await createParentRequest(context, {
      type: RequestType.MOVEOUT,
      roomCode: 'B-103',
      userKey: 'phuc',
      createDate: addDays(seedNow, -1),
      status: RequestStatus.PENDING,
    });
    await MoveoutRequest.create({
      requestID: pendingMoveoutID,
      contractID: id(contractIds, 'B-103', 'Contract'),
      requestMoveoutDate: addDays(seedNow, 30),
    });

    const approvedMoveoutB201Date = addDays(seedNow, -3);
    const approvedMoveoutB201ID = await createParentRequest(context, {
      type: RequestType.MOVEOUT,
      roomCode: 'B-201',
      userKey: 'quyen',
      createDate: approvedMoveoutB201Date,
      resolveDate: addDays(approvedMoveoutB201Date, 1),
      status: RequestStatus.APPROVED,
    });
    await MoveoutRequest.create({
      requestID: approvedMoveoutB201ID,
      contractID: id(contractIds, 'B-201', 'Contract'),
      requestMoveoutDate: moveoutApprovedDates.get('B-201'),
    });

    const approvedMoveoutC101Date = addDays(seedNow, -4);
    const approvedMoveoutC101ID = await createParentRequest(context, {
      type: RequestType.MOVEOUT,
      roomCode: 'C-101',
      userKey: 'son',
      createDate: approvedMoveoutC101Date,
      resolveDate: addDays(approvedMoveoutC101Date, 1),
      status: RequestStatus.APPROVED,
    });
    await MoveoutRequest.create({
      requestID: approvedMoveoutC101ID,
      contractID: id(contractIds, 'C-101', 'Contract'),
      requestMoveoutDate: moveoutApprovedDates.get('C-101'),
    });

    const pendingCheckoutID = await createParentRequest(context, {
      type: RequestType.CHECKOUT,
      roomCode: 'C-101',
      userKey: 'son',
      createDate: seedNow,
      status: RequestStatus.PENDING,
    });
    await CheckoutRequest.create({
      requestID: pendingCheckoutID,
      contractID: id(contractIds, 'C-101', 'Contract'),
      finalImage: '/uploads/checkout/old-c301.jpg',
      finalReading: (context.meterReadings.get('C-101') ?? 0) + 44,
    });

    const completedMoveoutCreateDate = dateInBillingMonth(-2, 5);
    const completedMoveoutResolveDate = addDays(completedMoveoutCreateDate, 1);
    const completedMoveoutID = await createParentRequest(context, {
      type: RequestType.MOVEOUT,
      roomCode: 'C-102',
      userKey: 'old-checkout',
      createDate: completedMoveoutCreateDate,
      resolveDate: completedMoveoutResolveDate,
      status: RequestStatus.APPROVED,
    });
    await MoveoutRequest.create({
      requestID: completedMoveoutID,
      contractID: id(contractIds, 'C-102-checkout', 'Contract'),
      requestMoveoutDate: dateInBillingMonth(-2, 20),
    });

    const completedCheckoutCreateDate = dateInBillingMonth(-2, 20, 8);
    const completedCheckoutID = await createParentRequest(context, {
      type: RequestType.CHECKOUT,
      roomCode: 'C-102',
      userKey: 'old-checkout',
      createDate: completedCheckoutCreateDate,
      resolveDate: addHours(completedCheckoutCreateDate, 2),
      status: RequestStatus.APPROVED,
    });
    await CheckoutRequest.create({
      requestID: completedCheckoutID,
      contractID: id(contractIds, 'C-102-checkout', 'Contract'),
      finalImage: '/uploads/checkout/old-c301.jpg',
      finalReading: (context.meterReadings.get('C-102') ?? 0) + 52,
    });

    const facilityTypeIds = new Map<string, Types.ObjectId>();
    const facilityTypeNames = ['Air conditioner', 'Water heater', 'Wardrobe', 'Bed', 'Bathroom tap'];
    for (const typeName of facilityTypeNames) {
      const facilityType = await FacilityType.create({ typeName });
      facilityTypeIds.set(typeName, objectId(facilityType._id));
    }

    const facilityIds = new Map<string, Types.ObjectId>();
    let facilityIndex = 0;
    for (const roomCode of activeRoomCodes) {
      const typeName = facilityTypeNames[facilityIndex % facilityTypeNames.length];
      const facility = await Facility.create({
        typeID: id(facilityTypeIds, typeName, 'Facility type'),
        roomID: id(roomIds, roomCode, 'Room'),
        lastModified: addDays(seedNow, -90 + facilityIndex),
      });
      facilityIds.set(roomCode, objectId(facility._id));
      facilityIndex += 1;
    }

    const createTicket = async (
      roomCode: string,
      ticketType: TicketType,
      status: TicketStatus,
      daysAgo: number,
    ): Promise<Types.ObjectId> => {
      const createDate = addDays(seedNow, -daysAgo);
      const ticket = await Ticket.create({
        roomID: id(roomIds, roomCode, 'Room'),
        ticketType,
        createDate,
        resolveDate: status === TicketStatus.DONE ? addDays(createDate, 2) : undefined,
        status,
      });
      return objectId(ticket._id);
    };

    const repairNeedActionID = await createTicket('A-101', TicketType.REPAIR, TicketStatus.NEED_ACTION, 3);
    const repairInProgressID = await createTicket('A-102', TicketType.REPAIR, TicketStatus.IN_PROGRESS, 8);
    const repairDoneID = await createTicket('B-101', TicketType.REPAIR, TicketStatus.DONE, 18);
    await Repair.insertMany([
      {
        ticketID: repairNeedActionID,
        facilityID: id(facilityIds, 'A-101', 'Facility'),
        description: 'Bathroom fixture is leaking and needs inspection.',
        facilityImage: '/uploads/repair/ticket-1001.jpg',
      },
      {
        ticketID: repairInProgressID,
        facilityID: id(facilityIds, 'A-102', 'Facility'),
        description: 'Water heater turns off after a few minutes.',
        facilityImage: '/uploads/repair/ticket-1002.jpg',
      },
      {
        ticketID: repairDoneID,
        facilityID: id(facilityIds, 'B-101', 'Facility'),
        description: 'Historical facility issue has been repaired.',
        facilityImage: '/uploads/repair/old-heater.jpg',
      },
    ]);

    const complainNeedActionID = await createTicket('B-103', TicketType.COMPLAIN, TicketStatus.NEED_ACTION, 2);
    const complainInProgressID = await createTicket('C-201', TicketType.COMPLAIN, TicketStatus.IN_PROGRESS, 6);
    const complainDoneID = await createTicket('C-202', TicketType.COMPLAIN, TicketStatus.DONE, 14);
    await Complain.insertMany([
      {
        ticketID: complainNeedActionID,
        areaID: id(areaIds, 'Building B', 'Area'),
        roomID: id(roomIds, 'B-103', 'Room'),
        description: 'Noise in the hallway after quiet hours.',
      },
      {
        ticketID: complainInProgressID,
        areaID: id(areaIds, 'Building C', 'Area'),
        roomID: id(roomIds, 'C-201', 'Room'),
        description: 'Shared laundry schedule is not being followed.',
      },
      {
        ticketID: complainDoneID,
        areaID: id(areaIds, 'Building C', 'Area'),
        roomID: id(roomIds, 'C-202', 'Room'),
        description: 'Resolved complaint about corridor lighting.',
      },
    ]);

    await validateSeedData();

    const [roomCount, activeContractCount, consumptionCount, invoiceCount, requestCount, ticketCount] = await Promise.all([
      Room.countDocuments(),
      Contract.countDocuments({ status: ContractStatus.ACTIVE }),
      Consumption.countDocuments(),
      Invoice.countDocuments(),
      RequestModel.countDocuments(),
      Ticket.countDocuments(),
    ]);
    console.log('Seed validation passed.');
    console.log(
      `Created ${roomCount} rooms, ${activeContractCount} active tenancies, ${consumptionCount} consumptions, ` +
      `${invoiceCount} invoices, ${requestCount} requests, and ${ticketCount} tickets.`,
    );
    console.log('Demo accounts: admin / Admin@123; active room code / Tenant@123; prepared room / Temp@123.');
  } finally {
    await mongoose.disconnect();
  }
}

seed().catch((error: unknown) => {
  console.error('Seeding failed:', error);
  process.exitCode = 1;
});

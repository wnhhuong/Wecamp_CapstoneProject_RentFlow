/**
 * Development seed for RentFlow.
 *
 * This script deliberately does not assign MongoDB _id values. Every relation
 * uses the ObjectId returned by Mongoose after the parent document is created.
 * Run with: npm run seed -- --reset
 */
import 'dotenv/config';
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
import TenantRequest from './models/Request.js';
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

const mongoUri = process.env.MONGO_URI;
const shouldReset = process.argv.includes('--reset');

if (!mongoUri) throw new Error('MONGO_URI is required. Add it to backend/.env before seeding.');
if (!shouldReset) {
  throw new Error('Refusing to delete data. Run npm run seed -- --reset only against a disposable development database.');
}

const id = (map: Map<string, Types.ObjectId>, key: string, label: string): Types.ObjectId => {
  const value = map.get(key);
  if (!value) throw new Error(`${label} not found for key "${key}".`);
  return value;
};

async function clearCollections(): Promise<void> {
  // Delete child records before their parents. MongoDB does not enforce foreign
  // keys, but this order prevents orphaned records when the script changes.
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
  await Promise.all([Invoice.deleteMany({}), TenantRequest.deleteMany({}), Ticket.deleteMany({})]);
  await Promise.all([Consumption.deleteMany({}), Facility.deleteMany({}), Contract.deleteMany({}), Account.deleteMany({})]);
  await Promise.all([Room.deleteMany({}), User.deleteMany({}), FacilityType.deleteMany({}), Area.deleteMany({}), Parameter.deleteMany({})]);
}

async function seed(): Promise<void> {
  await mongoose.connect(mongoUri!);
  try {
    console.log('Clearing development collections...');
    await clearCollections();

    console.log('Creating parameters...');
    await Parameter.insertMany([
      { name: ParameterName.ELECTRICITY_UNIT_PRICE, value: '3500' },
      { name: ParameterName.WATER_PRICE, value: '15000' },
      { name: ParameterName.WIFI_FEE, value: '100000' },
      { name: ParameterName.PARKING_FEE, value: '70000' },
      { name: ParameterName.OTHER_FEES, value: '30000' },
      // Existing validation requires start day < end day < payment due day.
      { name: ParameterName.METER_READING_START_DAY, value: '25' },
      { name: ParameterName.METER_READING_END_DAY, value: '30' },
      { name: ParameterName.PAYMENT_DUE_DAY, value: '05' },
      { name: ParameterName.YEAR_TO_EXTEND, value: '1' },
      { name: ParameterName.ADMIN_PHONE, value: '0901234567' },
      { name: ParameterName.ADMIN_FACEBOOK, value: 'https://facebook.com/rentflow' },
      { name: ParameterName.ADMIN_ZALO, value: '0901234567' },
      { name: ParameterName.ADDRESS, value: '12 Nguyễn Trãi, Thanh Xuân, Hà Nội' },
      { name: ParameterName.PROPERTY_NAME, value: 'RentFlow Residence' },
      { name: ParameterName.ADMIN_EMAIL, value: 'admin@rentflow.vn' },
      {
        name: ParameterName.CONTRACT_PLACEHOLDER,
        value: 'This Room Lease Agreement is made between Nguyễn Thị Bình (the Owner) and {fullName}, identity number {identityNo}, residing at {placeOfResidence} (the Tenant). The Tenant confirms that the personal information supplied during first login is accurate.\n\nThe Owner leases Room {roomCode} at Nhà trọ Bình An, 128 Đường số 7, Thủ Đức, to the Tenant from {startDate} until {expireDate}. The room is intended only for residential use by the registered Tenant.\n\nThe monthly rent is {rent}. A property deposit of {deposit} is recorded for this contract. Electricity is charged at ₫ 3.500 for each tenant-submitted meterReading approved by the Owner. Other monthly services are shown on the Tenant invoice.\n\nInvoices are issued monthly and must be paid by the displayed due date. If payment cannot be made on time, the Tenant may submit a late-payment request. A payment is recorded as paid only after the Owner confirms receipt.\n\nThe Tenant must use the room and shared areas responsibly, report repair needs through RentFlow, and compensate for damage caused by misuse. The Owner is responsible for maintaining the property facilities under their control.\n\nTo end the lease, the Tenant must first submit a move-out notice with a proposed date. On the approved checkout date, the Tenant must submit the final electricity image and final meterReading.\n\nBy signing electronically below, the Tenant confirms having read, understood and accepted this agreement. The electronic signature, timestamp and account identity will be associated with this agreement.',
      },
    ]);

    const areaIds = new Map<string, Types.ObjectId>();
    for (const areaName of ['Building A', 'Building B', 'Building C']) {
      const area = await Area.create({ areaName });
      areaIds.set(areaName, area._id);
    }

    const facilityTypeIds = new Map<string, Types.ObjectId>();
    for (const typeName of ['Air conditioner', 'Water heater', 'Wardrobe', 'Bed', 'Bathroom tap']) {
      const facilityType = await FacilityType.create({ typeName });
      facilityTypeIds.set(typeName, facilityType._id);
    }

    console.log('Creating rooms and tenants...');
    const roomIds = new Map<string, Types.ObjectId>();
    const rooms = [
      { areaName: 'Building A', status: RoomStatus.RENTED, maxPeople: 2, roomDetail: 'Bright corner room with private bathroom and balcony.', images: ['uploads/rooms/A-101-1.jpg', 'uploads/rooms/A-101-2.jpg', 'uploads/rooms/A-101-3.jpg', 'uploads/rooms/A-101-4.jpg'], roomCode: 'A-101', floor: 1, price: 3200000, deposit: 3200000, availableFrom: new Date('2024-09-01') },
      { areaName: 'Building A', status: RoomStatus.RENTED, maxPeople: 2, roomDetail: 'Quiet room near stair, suitable for student or office worker.', images: ['uploads/rooms/A-102-1.jpg', 'uploads/rooms/A-102-2.jpg', 'uploads/rooms/A-102-3.jpg', 'uploads/rooms/A-102-4.jpg'], roomCode: 'A-102', floor: 1, price: 3400000, deposit: 3400000, availableFrom: new Date('2024-09-01') },
      { areaName: 'Building A', status: RoomStatus.AVAILABLE_NOW, maxPeople: 1, roomDetail: 'Compact single room, fully furnished.', images: ['uploads/rooms/A-201-1.jpg', 'uploads/rooms/A-201-2.jpg', 'uploads/rooms/A-201-3.jpg', 'uploads/rooms/A-201-4.jpg'], roomCode: 'A-201', floor: 2, price: 2800000, deposit: 2800000, availableFrom: new Date('2024-09-15') },
      { areaName: 'Building A', status: RoomStatus.AVAILABLE_SOON, maxPeople: 2, roomDetail: 'Room will be available after cleaning and maintenance.', images: ['uploads/rooms/A-301-1.jpg', 'uploads/rooms/A-301-2.jpg', 'uploads/rooms/A-301-3.jpg', 'uploads/rooms/A-301-4.jpg'], roomCode: 'A-301', floor: 3, price: 3300000, deposit: 3300000, availableFrom: new Date('2026-10-05') },
      { areaName: 'Building B', status: RoomStatus.RENTED, maxPeople: 3, roomDetail: 'Large room for small family, close to parking area.', images: ['uploads/rooms/B-101-1.jpg', 'uploads/rooms/B-101-2.jpg', 'uploads/rooms/B-101-3.jpg', 'uploads/rooms/B-101-4.jpg'], roomCode: 'B-101', floor: 1, price: 3800000, deposit: 3800000, availableFrom: new Date('2024-08-01') },
      { areaName: 'Building B', status: RoomStatus.NOT_AVAILABLE, maxPeople: 2, roomDetail: 'Temporarily closed for bathroom renovation.', images: ['uploads/rooms/B-202-1.jpg', 'uploads/rooms/B-202-2.jpg', 'uploads/rooms/B-202-3.jpg', 'uploads/rooms/B-202-4.jpg'], roomCode: 'B-202', floor: 2, price: 3600000, deposit: 3600000, availableFrom: new Date('2024-11-01') },
      { areaName: 'Building C', status: RoomStatus.RENTED, maxPeople: 3, roomDetail: 'Premium room on high floor with city view.', images: ['uploads/rooms/C-301-1.jpg', 'uploads/rooms/C-301-2.jpg', 'uploads/rooms/C-301-3.jpg', 'uploads/rooms/C-301-4.jpg'], roomCode: 'C-301', floor: 3, price: 4200000, deposit: 4200000, availableFrom: new Date('2024-07-01') },
      { areaName: 'Building C', status: RoomStatus.AVAILABLE_NOW, maxPeople: 2, roomDetail: 'Newly painted room, close to laundry area.', images: ['uploads/rooms/C-302-1.jpg', 'uploads/rooms/C-302-2.jpg', 'uploads/rooms/C-302-3.jpg', 'uploads/rooms/C-302-4.jpg'], roomCode: 'C-302', floor: 3, price: 3500000, deposit: 3500000, availableFrom: new Date('2024-09-10') },
      { areaName: 'Building C', status: RoomStatus.AVAILABLE_NOW, maxPeople: 1, roomDetail: 'Small single room for edge-case account testing.', images: ['uploads/rooms/C-401-1.jpg', 'uploads/rooms/C-401-2.jpg', 'uploads/rooms/C-401-3.jpg', 'uploads/rooms/C-401-4.jpg'], roomCode: 'C-401', floor: 4, price: 2500000, deposit: 2500000, availableFrom: new Date('2024-01-15') },
      { areaName: 'Building C', status: RoomStatus.AVAILABLE_NOW, maxPeople: 4, roomDetail: 'Large room for testing higher occupancy limits.', images: ['uploads/rooms/C-402-1.jpg', 'uploads/rooms/C-402-2.jpg', 'uploads/rooms/C-402-3.jpg', 'uploads/rooms/C-402-4.jpg'], roomCode: 'C-402', floor: 4, price: 5000000, deposit: 5000000, availableFrom: new Date('2024-02-01') },
    ];
    const roomDescriptions: Record<string, string> = {
      'A-101': 'Bright corner room with a private bathroom and balcony. The room has two sleeping spaces, a wardrobe, study desk, air conditioner and good natural light throughout the day. The balcony faces the inner courtyard and provides additional ventilation.',
      'A-102': 'Quiet room near the stairwell, suitable for a student or office worker. It includes practical furniture, a private sleeping area, wardrobe, work desk and air conditioner. The room is positioned away from the main street and is generally calm during the day.',
      'A-201': 'Compact single room that is fully furnished and ready for one occupant. The layout includes a single bed, wardrobe, study desk, chair and wall-mounted air conditioner. It is an affordable option for someone who prefers a simple, easy-to-maintain private room.',
      'A-301': 'Two-person room that is scheduled to become available after final cleaning and minor maintenance. The room has two sleeping spaces, wardrobe, desk, air conditioner and a bright window. The owner will complete cleaning and check the fixtures before the expected availability date.',
      'B-101': 'Large room suitable for a small family or a group of up to three occupants. It has generous floor space, multiple storage units, practical sleeping arrangements and a shared table. The room is close to the parking area, making it convenient for residents who use motorbikes.',
      'B-202': 'This room is temporarily unavailable while the bathroom is being renovated. The room layout includes space for two occupants, but the bathroom fixtures and related plumbing work must be completed before it can be safely occupied. Availability will be updated after the renovation is inspected.',
      'C-301': 'Premium high-floor room with an open city view and more generous living space. It includes comfortable sleeping arrangements for up to three occupants, a large wardrobe, work area, air conditioner and bright windows. The room offers good ventilation and a quieter outlook than lower floors.',
      'C-302': 'Newly painted two-person room close to the shared laundry area. The room has two sleeping spaces, a wardrobe, study desk, air conditioner and clean tiled flooring. Fresh paint and good daylight make the room feel bright, while the nearby laundry area is convenient for regular washing.',
      'C-401': 'Small single room on the fourth floor, designed for one occupant who wants a private and affordable space. It includes a single bed, narrow wardrobe, study desk, chair and air conditioner. The compact layout is easy to keep tidy and receives natural light from the window.',
      'C-402': 'Large fourth-floor room with enough open space for up to four occupants. The room is arranged with four practical sleeping spaces, multiple wardrobes, a shared table and chairs, air conditioner and good ventilation. It is suitable for a small group that needs more storage and shared living space.',
    };
    for (const roomData of rooms) {
      const room = await Room.create({ ...roomData, roomDetail: roomDescriptions[roomData.roomCode] ?? roomData.roomDetail, areaID: id(areaIds, roomData.areaName, 'Area') });
      roomIds.set(roomData.roomCode, room._id);
    }

    const userIds = new Map<string, Types.ObjectId>();
    const users = [
      { key: 'an', fullName: 'Nguyễn Văn An', DoB: new Date('2002-06-14'), phoneNumber: '0901234501', identityNo: '001202000001', sex: Sex.MALE, nationality: 'Vietnamese', PoR: 'Hà Nội' },
      { key: 'binh', fullName: 'Trần Thị Bình', DoB: new Date('2001-11-20'), phoneNumber: '0901234502', identityNo: '001201000002', sex: Sex.FEMALE, nationality: 'Vietnamese', PoR: 'Nam Định' },
      { key: 'chau', fullName: 'Lê Minh Châu', DoB: new Date('1998-03-08'), phoneNumber: '0901234503', identityNo: '001198000003', sex: Sex.OTHER, nationality: 'Vietnamese', PoR: 'Đà Nẵng' },
      { key: 'dung', fullName: 'Phạm Hoàng Dũng', DoB: new Date('1995-09-02'), phoneNumber: '0901234504', identityNo: '001195000004', sex: Sex.MALE, nationality: 'Vietnamese', PoR: 'TP. Hồ Chí Minh' },
      { key: 'old-an', fullName: 'Ngô Quang Huy', DoB: new Date('1990-04-12'), phoneNumber: '0901234511', identityNo: '001190000011', sex: Sex.MALE, nationality: 'Vietnamese', PoR: 'Hải Phòng' },
      { key: 'old-binh', fullName: 'Đặng Thị Mai', DoB: new Date('1992-12-01'), phoneNumber: '0901234512', identityNo: '001192000012', sex: Sex.FEMALE, nationality: 'Vietnamese', PoR: 'Quảng Ninh' },
      { key: 'old-chau', fullName: 'Phan Gia Hân', DoB: new Date('1997-07-23'), phoneNumber: '0901234513', identityNo: '001197000013', sex: Sex.FEMALE, nationality: 'Vietnamese', PoR: 'Huế' },
      { key: 'old-dung', fullName: 'Bùi Đức Long', DoB: new Date('1993-02-18'), phoneNumber: '0901234514', identityNo: '001193000014', sex: Sex.MALE, nationality: 'Vietnamese', PoR: 'Nghệ An' },
    ];
    for (const { key, ...userData } of users) {
      const user = await User.create(userData);
      userIds.set(key, user._id);
    }

    const adminPassword = await bcrypt.hash('Admin@123', 10);
    const tenantPassword = await bcrypt.hash('Tenant@123', 10);
    const temporaryPassword = await bcrypt.hash('Temp@123', 10);
    await Account.create({ username: 'admin', password: adminPassword, status: AccountStatus.ACTIVE, role: AccountRole.ADMIN, startDate: new Date('2024-01-01') });
    for (const account of [
      { roomCode: 'A-101', password: tenantPassword, status: AccountStatus.ACTIVE, startDate: new Date('2024-09-01') },
      { roomCode: 'A-102', password: tenantPassword, status: AccountStatus.ACTIVE, startDate: new Date('2024-09-05') },
      { roomCode: 'B-101', password: tenantPassword, status: AccountStatus.ACTIVE, startDate: new Date('2024-08-01') },
      { roomCode: 'C-301', password: tenantPassword, status: AccountStatus.ACTIVE, startDate: new Date('2024-07-01') },
      { roomCode: 'C-302', password: temporaryPassword, status: AccountStatus.INACTIVE, startDate: new Date('2024-09-15') },
      { roomCode: 'C-401', password: temporaryPassword, status: AccountStatus.INACTIVE, startDate: new Date('2024-01-15') },
      { roomCode: 'C-402', password: temporaryPassword, status: AccountStatus.BANNED, startDate: new Date('2024-02-01') },
    ]) {
      await Account.create({ roomID: id(roomIds, account.roomCode, 'Room'), username: account.roomCode, password: account.password, status: account.status, role: AccountRole.USER, startDate: account.startDate });
    }

    const contractIds = new Map<string, Types.ObjectId>();
    // Historical contracts: one account per room remains current, while old tenants retain expired contracts.
    for (const contractData of [
      { roomCode: 'A-101', userKey: 'old-an', startDate: new Date('2023-09-01'), expireDate: new Date('2024-08-31'), propertyDeposit: 3000000, rentPrice: 3000000, signature: 'uploads/signatures/contract-old-a101.png', signedAt: new Date('2023-09-01T03:00:00.000Z') },
      { roomCode: 'A-102', userKey: 'old-binh', startDate: new Date('2023-09-05'), expireDate: new Date('2024-09-04'), propertyDeposit: 3200000, rentPrice: 3200000, signature: 'uploads/signatures/contract-old-a102.png', signedAt: new Date('2023-09-05T02:30:00.000Z') },
      { roomCode: 'B-101', userKey: 'old-chau', startDate: new Date('2023-08-01'), expireDate: new Date('2024-07-31'), propertyDeposit: 3600000, rentPrice: 3600000, signature: 'uploads/signatures/contract-old-b101.png', signedAt: new Date('2023-08-01T04:00:00.000Z') },
      { roomCode: 'C-301', userKey: 'old-dung', startDate: new Date('2023-07-01'), expireDate: new Date('2024-06-30'), propertyDeposit: 4000000, rentPrice: 4000000, signature: 'uploads/signatures/contract-old-c301.png', signedAt: new Date('2023-07-01T04:30:00.000Z') },
    ]) {
      const contract = await Contract.create({ ...contractData, roomID: id(roomIds, contractData.roomCode, 'Room'), userID: id(userIds, contractData.userKey, 'User'), status: ContractStatus.EXPIRED });
      contractIds.set(`${contractData.roomCode}-old`, contract._id);
    }
    for (const contractData of [
      { roomCode: 'A-101', userKey: 'an', startDate: new Date('2024-09-01'), expireDate: new Date('2026-10-01'), propertyDeposit: 3200000, rentPrice: 3200000, signature: 'uploads/signatures/contract-501.png', signedAt: new Date('2024-09-01T03:00:00.000Z') },
      { roomCode: 'A-102', userKey: 'binh', startDate: new Date('2024-09-05'), expireDate: new Date('2026-10-05'), propertyDeposit: 3400000, rentPrice: 3400000, signature: 'uploads/signatures/contract-502.png', signedAt: new Date('2024-09-05T02:30:00.000Z') },
      { roomCode: 'B-101', userKey: 'chau', startDate: new Date('2024-08-01'), expireDate: new Date('2026-10-01'), propertyDeposit: 3800000, rentPrice: 3800000, signature: 'uploads/signatures/contract-503.png', signedAt: new Date('2024-08-01T04:00:00.000Z') },
      { roomCode: 'C-301', userKey: 'dung', startDate: new Date('2024-07-01'), expireDate: new Date('2026-10-01'), propertyDeposit: 4200000, rentPrice: 4200000, signature: 'uploads/signatures/contract-504.png', signedAt: new Date('2024-07-01T04:30:00.000Z') },
    ]) {
      const contract = await Contract.create({ ...contractData, roomID: id(roomIds, contractData.roomCode, 'Room'), userID: id(userIds, contractData.userKey, 'User'), status: ContractStatus.ACTIVE });
      contractIds.set(contractData.roomCode, contract._id);
    }

    const facilityIds = new Map<string, Types.ObjectId>();
    for (const facilityData of [
      { roomCode: 'A-101', typeName: 'Air conditioner', lastModified: new Date('2024-09-01') },
      { roomCode: 'A-101', typeName: 'Bathroom tap', lastModified: new Date('2024-09-01') },
      { roomCode: 'A-102', typeName: 'Water heater', lastModified: new Date('2024-09-05') },
      { roomCode: 'B-101', typeName: 'Bed', lastModified: new Date('2024-08-01') },
      { roomCode: 'C-301', typeName: 'Wardrobe', lastModified: new Date('2024-07-01') },
    ]) {
      const facility = await Facility.create({ roomID: id(roomIds, facilityData.roomCode, 'Room'), typeID: id(facilityTypeIds, facilityData.typeName, 'Facility type'), lastModified: facilityData.lastModified });
      facilityIds.set(`${facilityData.roomCode}:${facilityData.typeName}`, facility._id);
    }

    const consumptionIds = new Map<string, Types.ObjectId>();
    for (const consumptionData of [
      { key: 'A-101-aug', roomCode: 'A-101', meterReading: 148, trackingTime: new Date('2026-08-28T08:10:00.000Z'), e_meterImage: 'uploads/consumption/A-101-202608.jpg' },
      { key: 'A-102-aug', roomCode: 'A-102', meterReading: 116, trackingTime: new Date('2026-08-28T08:20:00.000Z'), e_meterImage: 'uploads/consumption/A-102-202608.jpg' },
      { key: 'B-101-aug', roomCode: 'B-101', meterReading: 175, trackingTime: new Date('2026-08-28T08:30:00.000Z'), e_meterImage: 'uploads/consumption/B-101-202608.jpg' },
      { key: 'C-301-aug', roomCode: 'C-301', meterReading: 190, trackingTime: new Date('2026-08-28T08:40:00.000Z'), e_meterImage: 'uploads/consumption/C-301-202608.jpg' },
    ]) {
      const consumption = await Consumption.create({ ...consumptionData, roomID: id(roomIds, consumptionData.roomCode, 'Room') });
      consumptionIds.set(consumptionData.key, consumption._id);
    }

    // Fill every missing monthly period for current tenants through 2026-07.
    // The existing 2026-08 records above remain the latest approved readings.
    const generatedPeriods: Array<{ key: string; roomCode: string; meterReading: number; trackingTime: Date }> = [];
    const monthIndex = (year: number, month: number) => year * 12 + (month - 1);
    for (const config of [
      { roomCode: 'A-101', start: [2024, 9], baseline: [2024, 8], baselineReading: 132, endReading: 148, roomBill: 3200000, waterBill: 125000, wifiBill: 100000, parkingBill: 150000, otherBill: 0 },
      { roomCode: 'A-102', start: [2024, 9], baseline: [2024, 6], baselineReading: 76, endReading: 116, roomBill: 3400000, waterBill: 150000, wifiBill: 100000, parkingBill: 150000, otherBill: 30000 },
      { roomCode: 'B-101', start: [2024, 8], baseline: [2024, 6], baselineReading: 121, endReading: 175, roomBill: 3800000, waterBill: 150000, wifiBill: 100000, parkingBill: 0, otherBill: 30000 },
      { roomCode: 'C-301', start: [2024, 7], baseline: [2024, 5], baselineReading: 144, endReading: 190, roomBill: 4200000, waterBill: 175000, wifiBill: 100000, parkingBill: 150000, otherBill: 30000 },
    ]) {
      const startIndex = monthIndex(config.start[0], config.start[1]);
      const baselineIndex = monthIndex(config.baseline[0], config.baseline[1]);
      const endIndex = monthIndex(2026, 8);
      for (let cursor = startIndex; cursor < endIndex; cursor += 1) {
        const year = Math.floor(cursor / 12);
        const month = cursor % 12 + 1;
        const key = `${config.roomCode}-${year}${String(month).padStart(2, '0')}`;
        const ratio = (cursor - baselineIndex) / (endIndex - baselineIndex);
        const meterReading = Math.round(config.baselineReading + (config.endReading - config.baselineReading) * ratio);
        generatedPeriods.push({ key, roomCode: config.roomCode, meterReading, trackingTime: new Date(Date.UTC(year, month - 1, 28, 8, 0, 0)) });
      }
    }
    for (const consumptionData of generatedPeriods) {
      const consumption = await Consumption.create({ ...consumptionData, e_meterImage: `uploads/consumption/${consumptionData.roomCode}-${consumptionData.key.slice(-6)}.jpg`, roomID: id(roomIds, consumptionData.roomCode, 'Room') });
      consumptionIds.set(consumptionData.key, consumption._id);
    }

    // Historical meter readings are retained by room; user-facing services filter them by Account.startDate.
    for (const consumptionData of [
      { key: 'A-101-old-jun', roomCode: 'A-101', meterReading: 98, trackingTime: new Date('2024-06-28T08:10:00.000Z'), e_meterImage: 'uploads/consumption/A-101-202406.jpg' },
      { key: 'A-101-old-jul', roomCode: 'A-101', meterReading: 115, trackingTime: new Date('2024-07-28T08:10:00.000Z'), e_meterImage: 'uploads/consumption/A-101-202407.jpg' },
      { key: 'A-101-old-aug', roomCode: 'A-101', meterReading: 132, trackingTime: new Date('2024-08-28T08:10:00.000Z'), e_meterImage: 'uploads/consumption/A-101-202408.jpg' },
      { key: 'A-102-old-jun', roomCode: 'A-102', meterReading: 76, trackingTime: new Date('2024-06-28T08:20:00.000Z'), e_meterImage: 'uploads/consumption/A-102-202406.jpg' },
      { key: 'B-101-old-jun', roomCode: 'B-101', meterReading: 121, trackingTime: new Date('2024-06-28T08:30:00.000Z'), e_meterImage: 'uploads/consumption/B-101-202406.jpg' },
      { key: 'C-301-old-may', roomCode: 'C-301', meterReading: 144, trackingTime: new Date('2024-05-28T08:40:00.000Z'), e_meterImage: 'uploads/consumption/C-301-202405.jpg' },
    ]) {
      const consumption = await Consumption.create({ ...consumptionData, roomID: id(roomIds, consumptionData.roomCode, 'Room') });
      consumptionIds.set(consumptionData.key, consumption._id);
    }
    const invoiceIds = new Map<string, Types.ObjectId>();
    for (const invoiceData of [
      { key: 'A-101-aug', consumptionKey: 'A-101-aug', roomBill: 3200000, electricalBill: 3500, waterBill: 125000, wifiBill: 100000, parkingBill: 150000, otherBill: 0, totalBill: 3578500, createdDate: new Date('2026-09-01T01:20:00.000Z'), dueDate: new Date('2026-09-10'), isRequestLate: true, status: InvoiceStatus.NOT_PAID },
      { key: 'A-102-aug', consumptionKey: 'A-102-aug', roomBill: 3400000, electricalBill: 7000, waterBill: 150000, wifiBill: 100000, parkingBill: 150000, otherBill: 30000, totalBill: 3837000, createdDate: new Date('2026-09-01T01:25:00.000Z'), dueDate: new Date('2026-09-10'), isRequestLate: false, status: InvoiceStatus.NOT_PAID },
      { key: 'B-101-aug', consumptionKey: 'B-101-aug', roomBill: 3800000, electricalBill: 7000, waterBill: 150000, wifiBill: 100000, parkingBill: 0, otherBill: 30000, totalBill: 4087000, createdDate: new Date('2026-09-01T01:30:00.000Z'), paymentDate: new Date('2026-09-02T10:00:00.000Z'), dueDate: new Date('2026-09-10'), isRequestLate: false, status: InvoiceStatus.PAID },
      { key: 'C-301-aug', consumptionKey: 'C-301-aug', roomBill: 4200000, electricalBill: 7000, waterBill: 175000, wifiBill: 100000, parkingBill: 150000, otherBill: 30000, totalBill: 4662000, createdDate: new Date('2026-09-01T01:30:00.000Z'), dueDate: new Date('2026-09-10'), isRequestLate: false, status: InvoiceStatus.NOT_PAID },
    ]) {
      const invoice = await Invoice.create({ ...invoiceData, dueDate: new Date(new Date(invoiceData.dueDate).setUTCDate(5)), consumptionID: id(consumptionIds, invoiceData.consumptionKey, 'Consumption') });
      invoiceIds.set(invoiceData.key, invoice._id);
    }

    const generatedConfig = new Map([
      ['A-101', { roomBill: 3200000, waterBill: 125000, wifiBill: 100000, parkingBill: 150000, otherBill: 0 }],
      ['A-102', { roomBill: 3400000, waterBill: 150000, wifiBill: 100000, parkingBill: 150000, otherBill: 30000 }],
      ['B-101', { roomBill: 3800000, waterBill: 150000, wifiBill: 100000, parkingBill: 0, otherBill: 30000 }],
      ['C-301', { roomBill: 4200000, waterBill: 175000, wifiBill: 100000, parkingBill: 150000, otherBill: 30000 }],
    ]);
    for (const period of generatedPeriods) {
      const previous = await Consumption.findOne({ roomID: id(roomIds, period.roomCode, 'Room'), trackingTime: { $lt: period.trackingTime } }).sort({ trackingTime: -1 });
      const usage = period.meterReading - (previous?.meterReading ?? 0);
      const fees = generatedConfig.get(period.roomCode)!;
      const createdDate = new Date(Date.UTC(period.trackingTime.getUTCFullYear(), period.trackingTime.getUTCMonth() + 1, 1, 1, 0, 0));
      const dueDate = new Date(Date.UTC(createdDate.getUTCFullYear(), createdDate.getUTCMonth(), 5));
      const electricalBill = usage * 3500;
      const invoiceData = { key: period.key, consumptionKey: period.key, ...fees, electricalBill, totalBill: fees.roomBill + electricalBill + fees.waterBill + fees.wifiBill + fees.parkingBill + fees.otherBill, createdDate, dueDate, isRequestLate: false, status: InvoiceStatus.PAID, paymentDate: new Date(Date.UTC(createdDate.getUTCFullYear(), createdDate.getUTCMonth(), 4, 10, 0, 0)) };
      const invoice = await Invoice.create({ ...invoiceData, consumptionID: id(consumptionIds, period.key, 'Consumption') });
      invoiceIds.set(period.key, invoice._id);
    }

    for (const invoiceData of [
      { key: 'A-101-old-jun', consumptionKey: 'A-101-old-jun', roomBill: 3000000, electricalBill: 343000, waterBill: 125000, wifiBill: 100000, parkingBill: 0, otherBill: 0, totalBill: 3568000, createdDate: new Date('2024-07-01'), dueDate: new Date('2024-07-10'), isRequestLate: false, status: InvoiceStatus.PAID, paymentDate: new Date('2024-07-05') },
      { key: 'A-101-old-jul', consumptionKey: 'A-101-old-jul', roomBill: 3000000, electricalBill: 59500, waterBill: 125000, wifiBill: 100000, parkingBill: 0, otherBill: 0, totalBill: 3284500, createdDate: new Date('2024-08-01'), dueDate: new Date('2024-08-10'), isRequestLate: false, status: InvoiceStatus.PAID, paymentDate: new Date('2024-08-05') },
      { key: 'A-101-old-aug', consumptionKey: 'A-101-old-aug', roomBill: 3000000, electricalBill: 119000, waterBill: 125000, wifiBill: 100000, parkingBill: 0, otherBill: 0, totalBill: 3344000, createdDate: new Date('2024-09-01'), dueDate: new Date('2024-09-10'), isRequestLate: true, status: InvoiceStatus.NOT_PAID },
      { key: 'A-102-old-jun', consumptionKey: 'A-102-old-jun', roomBill: 3200000, electricalBill: 266000, waterBill: 150000, wifiBill: 100000, parkingBill: 70000, otherBill: 30000, totalBill: 3816000, createdDate: new Date('2024-07-01'), dueDate: new Date('2024-07-10'), isRequestLate: false, status: InvoiceStatus.PAID, paymentDate: new Date('2024-07-08') },
      { key: 'B-101-old-jun', consumptionKey: 'B-101-old-jun', roomBill: 3600000, electricalBill: 423500, waterBill: 150000, wifiBill: 0, parkingBill: 0, otherBill: 0, totalBill: 4173500, createdDate: new Date('2024-07-01'), dueDate: new Date('2024-07-10'), isRequestLate: false, status: InvoiceStatus.NOT_PAID },
      { key: 'C-301-old-may', consumptionKey: 'C-301-old-may', roomBill: 4000000, electricalBill: 504000, waterBill: 150000, wifiBill: 100000, parkingBill: 150000, otherBill: 30000, totalBill: 4934000, createdDate: new Date('2024-06-01'), dueDate: new Date('2024-06-10'), isRequestLate: false, status: InvoiceStatus.PAID, paymentDate: new Date('2024-06-04') },
    ]) {
      const invoice = await Invoice.create({ ...invoiceData, dueDate: new Date(new Date(invoiceData.dueDate).setUTCDate(5)), consumptionID: id(consumptionIds, invoiceData.consumptionKey, 'Consumption') });
      invoiceIds.set(invoiceData.key, invoice._id);
    }
    const requestIds = new Map<string, Types.ObjectId>();
    for (const requestData of [
      { key: 'late-A-101', type: RequestType.DELAY, roomCode: 'A-101', userKey: 'an', createDate: new Date('2026-09-11'), status: RequestStatus.PENDING },
      { key: 'paid-A-102', type: RequestType.PAID, roomCode: 'A-102', userKey: 'binh', createDate: new Date('2026-09-03'), status: RequestStatus.PENDING },
      { key: 'paid-old-A-101', type: RequestType.PAID, roomCode: 'A-101', userKey: 'old-an', createDate: new Date('2024-06-30'), resolveDate: new Date('2024-07-05'), status: RequestStatus.APPROVED },
      { key: 'moveout-old-B-101', type: RequestType.MOVEOUT, roomCode: 'B-101', userKey: 'old-chau', createDate: new Date('2024-07-15'), resolveDate: new Date('2024-07-16'), status: RequestStatus.APPROVED },
      { key: 'checkout-old-C-301', type: RequestType.CHECKOUT, roomCode: 'C-301', userKey: 'old-dung', createDate: new Date('2024-06-20'), resolveDate: new Date('2024-06-21'), status: RequestStatus.APPROVED },
    ]) {
      const request = await TenantRequest.create({ ...requestData, roomID: id(roomIds, requestData.roomCode, 'Room'), userID: id(userIds, requestData.userKey, 'User') });
      requestIds.set(requestData.key, request._id);
    }
    await LatePaymentRequest.create({ requestID: id(requestIds, 'late-A-101', 'Request'), invoiceID: id(invoiceIds, 'A-101-aug', 'Invoice') });
    await PaidRequest.create({ requestID: id(requestIds, 'paid-A-102', 'Request'), invoiceID: id(invoiceIds, 'A-102-aug', 'Invoice') });
    await PaidRequest.create({ requestID: id(requestIds, 'paid-old-A-101', 'Request'), invoiceID: id(invoiceIds, 'A-101-old-jun', 'Invoice') });
    await MoveoutRequest.create({ requestID: id(requestIds, 'moveout-old-B-101', 'Request'), contractID: id(contractIds, 'B-101-old', 'Contract'), requestMoveoutDate: new Date('2024-07-31') });
    await CheckoutRequest.create({ requestID: id(requestIds, 'checkout-old-C-301', 'Request'), contractID: id(contractIds, 'C-301-old', 'Contract'), finalImage: 'uploads/checkout/old-c301.jpg', finalReading: 166 });

    const ticketIds = new Map<string, Types.ObjectId>();
    for (const ticketData of [
      { key: 'repair-tap', roomCode: 'A-101', ticketType: TicketType.REPAIR, createDate: new Date('2024-09-18'), status: TicketStatus.NEED_ACTION },
      { key: 'repair-heater', roomCode: 'A-102', ticketType: TicketType.REPAIR, createDate: new Date('2024-09-12'), status: TicketStatus.IN_PROGRESS },
      { key: 'noise', roomCode: 'B-101', ticketType: TicketType.COMPLAIN, createDate: new Date('2024-09-10'), resolveDate: new Date('2024-09-13'), status: TicketStatus.DONE },
      { key: 'repair-old-tap', roomCode: 'A-101', ticketType: TicketType.REPAIR, createDate: new Date('2024-06-18'), resolveDate: new Date('2024-06-20'), status: TicketStatus.DONE },
      { key: 'repair-old-heater', roomCode: 'A-102', ticketType: TicketType.REPAIR, createDate: new Date('2024-08-12'), status: TicketStatus.IN_PROGRESS },
      { key: 'noise-old', roomCode: 'B-101', ticketType: TicketType.COMPLAIN, createDate: new Date('2024-07-10'), status: TicketStatus.NEED_ACTION },
    ]) {
      const ticket = await Ticket.create({ ...ticketData, roomID: id(roomIds, ticketData.roomCode, 'Room') });
      ticketIds.set(ticketData.key, ticket._id);
    }
    await Repair.create({ ticketID: id(ticketIds, 'repair-tap', 'Ticket'), facilityID: id(facilityIds, 'A-101:Bathroom tap', 'Facility'), description: 'Bathroom tap is leaking continuously.', facilityImage: 'uploads/repair/ticket-1001.jpg' });
    await Repair.create({ ticketID: id(ticketIds, 'repair-heater', 'Ticket'), facilityID: id(facilityIds, 'A-102:Water heater', 'Facility'), description: 'Water heater turns off after a few minutes.', facilityImage: 'uploads/repair/ticket-1002.jpg' });
    await Complain.create({ ticketID: id(ticketIds, 'noise', 'Ticket'), areaID: id(areaIds, 'Building B', 'Area'), roomID: id(roomIds, 'B-101', 'Room'), description: 'Noise after 23:00 near Building B hallway.' });
    await Repair.create({ ticketID: id(ticketIds, 'repair-old-tap', 'Ticket'), facilityID: id(facilityIds, 'A-101:Bathroom tap', 'Facility'), description: 'Historical leak repaired before current tenancy.', facilityImage: 'uploads/repair/old-tap.jpg' });
    await Repair.create({ ticketID: id(ticketIds, 'repair-old-heater', 'Ticket'), facilityID: id(facilityIds, 'A-102:Water heater', 'Facility'), description: 'Historical heater issue still in progress.', facilityImage: 'uploads/repair/old-heater.jpg' });
    await Complain.create({ ticketID: id(ticketIds, 'noise-old', 'Ticket'), areaID: id(areaIds, 'Building B', 'Area'), roomID: id(roomIds, 'B-101', 'Room'), description: 'Historical noise complaint from previous tenant.' });

    console.log('Seed complete: 3 areas, 10 rooms, 8 users, 8 contracts (including 4 historical), 105 consumption records, 105 invoices, 5 requests, and 6 tickets.');
    console.log('Login accounts: admin / Admin@123, or a room code such as A-101 / Tenant@123.');
  } finally {
    await mongoose.disconnect();
  }
}

seed().catch((error: unknown) => {
  console.error('Seeding failed:', error);
  process.exitCode = 1;
});

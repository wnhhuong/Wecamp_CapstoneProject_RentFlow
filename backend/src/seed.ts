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
} from './models/enums.js';

const mongoUri = process.env.MONGO_URI;
const shouldReset = process.argv.includes('--reset');

if (!mongoUri) throw new Error('MONGO_URI is required. Add it to backend/.env before seeding.');
if (!shouldReset) {
  throw new Error('Refusing to delete data. Run `npm run seed -- --reset` only against a disposable development database.');
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
        value: 'Hợp đồng thuê phòng số {contractID} giữa Bên A - RentFlow Residence và Bên B - {tenantName}. Phòng thuê: {roomCode}. Giá thuê: {rent} VND/tháng. Tiền cọc: {deposit} VND. Thời hạn: {startDate} đến {expireDate}.',
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
      { areaName: 'Building A', status: RoomStatus.RENTED, maxPeople: 2, roomDetail: 'Bright corner room with private bathroom and balcony.', images: ['uploads/rooms/A-101-1.jpg', 'uploads/rooms/A-101-2.jpg'], roomCode: 'A-101', floor: 1, price: 3200000, deposit: 3200000, availableFrom: new Date('2026-09-01') },
      { areaName: 'Building A', status: RoomStatus.RENTED, maxPeople: 2, roomDetail: 'Quiet room near stair, suitable for student or office worker.', images: ['uploads/rooms/A-102-1.jpg'], roomCode: 'A-102', floor: 1, price: 3400000, deposit: 3400000, availableFrom: new Date('2026-09-01') },
      { areaName: 'Building A', status: RoomStatus.AVAILABLE_NOW, maxPeople: 1, roomDetail: 'Compact single room, fully furnished.', images: ['uploads/rooms/A-201-1.jpg'], roomCode: 'A-201', floor: 2, price: 2800000, deposit: 2800000, availableFrom: new Date('2026-09-15') },
      { areaName: 'Building A', status: RoomStatus.AVAILABLE_SOON, maxPeople: 2, roomDetail: 'Room will be available after cleaning and maintenance.', images: ['uploads/rooms/A-301-1.jpg'], roomCode: 'A-301', floor: 3, price: 3300000, deposit: 3300000, availableFrom: new Date('2026-10-05') },
      { areaName: 'Building B', status: RoomStatus.RENTED, maxPeople: 3, roomDetail: 'Large room for small family, close to parking area.', images: ['uploads/rooms/B-101-1.jpg', 'uploads/rooms/B-101-2.jpg'], roomCode: 'B-101', floor: 1, price: 3800000, deposit: 3800000, availableFrom: new Date('2026-08-01') },
      { areaName: 'Building B', status: RoomStatus.NOT_AVAILABLE, maxPeople: 2, roomDetail: 'Temporarily closed for bathroom renovation.', images: ['uploads/rooms/B-202-1.jpg'], roomCode: 'B-202', floor: 2, price: 3600000, deposit: 3600000, availableFrom: new Date('2026-11-01') },
      { areaName: 'Building C', status: RoomStatus.RENTED, maxPeople: 3, roomDetail: 'Premium room on high floor with city view.', images: ['uploads/rooms/C-301-1.jpg', 'uploads/rooms/C-301-2.jpg'], roomCode: 'C-301', floor: 3, price: 4200000, deposit: 4200000, availableFrom: new Date('2026-07-01') },
      { areaName: 'Building C', status: RoomStatus.AVAILABLE_NOW, maxPeople: 2, roomDetail: 'Newly painted room, close to laundry area.', images: ['uploads/rooms/C-302-1.jpg'], roomCode: 'C-302', floor: 3, price: 3500000, deposit: 3500000, availableFrom: new Date('2026-09-10') },
    ];
    for (const roomData of rooms) {
      const room = await Room.create({ ...roomData, areaID: id(areaIds, roomData.areaName, 'Area') });
      roomIds.set(roomData.roomCode, room._id);
    }

    const userIds = new Map<string, Types.ObjectId>();
    const users = [
      { key: 'an', fullName: 'Nguyễn Văn An', DoB: new Date('2002-06-14'), phoneNumber: '0901234501', identityNo: '001202000001', sex: Sex.MALE, nationality: 'Vietnamese', PoR: 'Hà Nội' },
      { key: 'binh', fullName: 'Trần Thị Bình', DoB: new Date('2001-11-20'), phoneNumber: '0901234502', identityNo: '001201000002', sex: Sex.FEMALE, nationality: 'Vietnamese', PoR: 'Nam Định' },
      { key: 'chau', fullName: 'Lê Minh Châu', DoB: new Date('1998-03-08'), phoneNumber: '0901234503', identityNo: '001198000003', sex: Sex.OTHER, nationality: 'Vietnamese', PoR: 'Đà Nẵng' },
      { key: 'dung', fullName: 'Phạm Hoàng Dũng', DoB: new Date('1995-09-02'), phoneNumber: '0901234504', identityNo: '001195000004', sex: Sex.MALE, nationality: 'Vietnamese', PoR: 'TP. Hồ Chí Minh' },
    ];
    for (const { key, ...userData } of users) {
      const user = await User.create(userData);
      userIds.set(key, user._id);
    }

    const adminPassword = await bcrypt.hash('Admin@123', 10);
    const tenantPassword = await bcrypt.hash('Tenant@123', 10);
    const temporaryPassword = await bcrypt.hash('Temp@123', 10);
    await Account.create({ username: 'admin', password: adminPassword, status: AccountStatus.ACTIVE, role: AccountRole.ADMIN, startDate: new Date('2026-01-01') });
    for (const account of [
      { roomCode: 'A-101', password: tenantPassword, status: AccountStatus.ACTIVE, startDate: new Date('2026-09-01') },
      { roomCode: 'A-102', password: tenantPassword, status: AccountStatus.ACTIVE, startDate: new Date('2026-09-05') },
      { roomCode: 'B-101', password: tenantPassword, status: AccountStatus.ACTIVE, startDate: new Date('2026-08-01') },
      { roomCode: 'C-301', password: tenantPassword, status: AccountStatus.ACTIVE, startDate: new Date('2026-07-01') },
      { roomCode: 'C-302', password: temporaryPassword, status: AccountStatus.INACTIVE, startDate: new Date('2026-09-15') },
    ]) {
      await Account.create({ roomID: id(roomIds, account.roomCode, 'Room'), username: account.roomCode, password: account.password, status: account.status, role: AccountRole.USER, startDate: account.startDate });
    }

    const contractIds = new Map<string, Types.ObjectId>();
    for (const contractData of [
      { roomCode: 'A-101', userKey: 'an', startDate: new Date('2026-09-01'), expireDate: new Date('2027-09-01'), propertyDeposit: 3200000, rentPrice: 3200000, signature: 'uploads/signatures/contract-501.png', signedAt: new Date('2026-09-01T03:00:00.000Z') },
      { roomCode: 'A-102', userKey: 'binh', startDate: new Date('2026-09-05'), expireDate: new Date('2027-09-05'), propertyDeposit: 3400000, rentPrice: 3400000, signature: 'uploads/signatures/contract-502.png', signedAt: new Date('2026-09-05T02:30:00.000Z') },
      { roomCode: 'B-101', userKey: 'chau', startDate: new Date('2026-08-01'), expireDate: new Date('2027-08-01'), propertyDeposit: 3800000, rentPrice: 3800000, signature: 'uploads/signatures/contract-503.png', signedAt: new Date('2026-08-01T04:00:00.000Z') },
      { roomCode: 'C-301', userKey: 'dung', startDate: new Date('2026-07-01'), expireDate: new Date('2027-07-01'), propertyDeposit: 4200000, rentPrice: 4200000, signature: 'uploads/signatures/contract-504.png', signedAt: new Date('2026-07-01T04:30:00.000Z') },
    ]) {
      const contract = await Contract.create({ ...contractData, roomID: id(roomIds, contractData.roomCode, 'Room'), userID: id(userIds, contractData.userKey, 'User'), status: ContractStatus.ACTIVE });
      contractIds.set(contractData.roomCode, contract._id);
    }

    const facilityIds = new Map<string, Types.ObjectId>();
    for (const facilityData of [
      { roomCode: 'A-101', typeName: 'Air conditioner', lastModified: new Date('2026-09-01') },
      { roomCode: 'A-101', typeName: 'Bathroom tap', lastModified: new Date('2026-09-01') },
      { roomCode: 'A-102', typeName: 'Water heater', lastModified: new Date('2026-09-05') },
      { roomCode: 'B-101', typeName: 'Bed', lastModified: new Date('2026-08-01') },
      { roomCode: 'C-301', typeName: 'Wardrobe', lastModified: new Date('2026-07-01') },
    ]) {
      const facility = await Facility.create({ roomID: id(roomIds, facilityData.roomCode, 'Room'), typeID: id(facilityTypeIds, facilityData.typeName, 'Facility type'), lastModified: facilityData.lastModified });
      facilityIds.set(`${facilityData.roomCode}:${facilityData.typeName}`, facility._id);
    }

    const consumptionIds = new Map<string, Types.ObjectId>();
    for (const consumptionData of [
      { key: 'A-101-sep', roomCode: 'A-101', meterReading: 148, trackingTime: new Date('2026-09-28T08:10:00.000Z'), e_meterImage: 'uploads/consumption/A-101-202609.jpg' },
      { key: 'A-102-sep', roomCode: 'A-102', meterReading: 116, trackingTime: new Date('2026-09-28T08:20:00.000Z'), e_meterImage: 'uploads/consumption/A-102-202609.jpg' },
      { key: 'B-101-sep', roomCode: 'B-101', meterReading: 175, trackingTime: new Date('2026-09-28T08:30:00.000Z'), e_meterImage: 'uploads/consumption/B-101-202609.jpg' },
      { key: 'C-301-aug', roomCode: 'C-301', meterReading: 190, trackingTime: new Date('2026-08-28T08:40:00.000Z'), e_meterImage: 'uploads/consumption/C-301-202608.jpg' },
    ]) {
      const consumption = await Consumption.create({ ...consumptionData, roomID: id(roomIds, consumptionData.roomCode, 'Room') });
      consumptionIds.set(consumptionData.key, consumption._id);
    }

    const invoiceIds = new Map<string, Types.ObjectId>();
    for (const invoiceData of [
      { key: 'A-101-sep', consumptionKey: 'A-101-sep', roomBill: 3200000, electricalBill: 518000, waterBill: 125000, wifiBill: 100000, parkingBill: 150000, otherBill: 0, totalBill: 4093000, createdDate: new Date('2026-09-29T01:20:00.000Z'), dueDate: new Date('2026-10-10'), isRequestLate: true, status: InvoiceStatus.NOT_PAID },
      { key: 'A-102-sep', consumptionKey: 'A-102-sep', roomBill: 3400000, electricalBill: 406000, waterBill: 150000, wifiBill: 100000, parkingBill: 150000, otherBill: 30000, totalBill: 4236000, createdDate: new Date('2026-09-29T01:25:00.000Z'), dueDate: new Date('2026-10-10'), isRequestLate: false, status: InvoiceStatus.NOT_PAID },
      { key: 'B-101-sep', consumptionKey: 'B-101-sep', roomBill: 3800000, electricalBill: 612500, waterBill: 150000, wifiBill: 100000, parkingBill: 0, otherBill: 30000, totalBill: 4692500, createdDate: new Date('2026-09-29T01:30:00.000Z'), paymentDate: new Date('2026-10-02T10:00:00.000Z'), dueDate: new Date('2026-10-10'), isRequestLate: false, status: InvoiceStatus.PAID },
      { key: 'C-301-aug', consumptionKey: 'C-301-aug', roomBill: 4200000, electricalBill: 665000, waterBill: 175000, wifiBill: 100000, parkingBill: 150000, otherBill: 30000, totalBill: 5320000, createdDate: new Date('2026-08-29T01:30:00.000Z'), dueDate: new Date('2026-09-10'), isRequestLate: false, status: InvoiceStatus.NOT_PAID },
    ]) {
      const invoice = await Invoice.create({ ...invoiceData, comsumptionID: id(consumptionIds, invoiceData.consumptionKey, 'Consumption') });
      invoiceIds.set(invoiceData.key, invoice._id);
    }

    const requestIds = new Map<string, Types.ObjectId>();
    for (const requestData of [
      { key: 'late-A-101', type: RequestType.DELAY, roomCode: 'A-101', userKey: 'an', createDate: new Date('2026-09-30'), status: RequestStatus.PENDING },
      { key: 'paid-A-102', type: RequestType.PAID, roomCode: 'A-102', userKey: 'binh', createDate: new Date('2026-09-30'), status: RequestStatus.PENDING },
      { key: 'consump-A-102', type: RequestType.CONSUMP, roomCode: 'A-102', userKey: 'binh', createDate: new Date('2026-09-28'), status: RequestStatus.PENDING },
      { key: 'extend-A-101', type: RequestType.EXTEND, roomCode: 'A-101', userKey: 'an', createDate: new Date('2026-09-20'), status: RequestStatus.PENDING },
      { key: 'moveout-C-301', type: RequestType.MOVEOUT, roomCode: 'C-301', userKey: 'dung', createDate: new Date('2026-09-12'), resolveDate: new Date('2026-09-13'), status: RequestStatus.APPROVED },
      { key: 'checkout-C-301', type: RequestType.CHECKOUT, roomCode: 'C-301', userKey: 'dung', createDate: new Date('2026-09-30'), status: RequestStatus.PENDING },
    ]) {
      const request = await TenantRequest.create({ ...requestData, roomID: id(roomIds, requestData.roomCode, 'Room'), userID: id(userIds, requestData.userKey, 'User') });
      requestIds.set(requestData.key, request._id);
    }
    await LatePaymentRequest.create({ requestID: id(requestIds, 'late-A-101', 'Request'), invoiceID: id(invoiceIds, 'A-101-sep', 'Invoice') });
    await PaidRequest.create({ requestID: id(requestIds, 'paid-A-102', 'Request'), invoiceID: id(invoiceIds, 'A-102-sep', 'Invoice') });
    await ConsumpRequest.create({ requestID: id(requestIds, 'consump-A-102', 'Request'), image: 'uploads/consumption/request-703.jpg', reading: 121, capturedAt: new Date('2026-09-28T08:20:00.000Z') });
    await ExtendRequest.create({ requestID: id(requestIds, 'extend-A-101', 'Request'), contractID: id(contractIds, 'A-101', 'Contract') });
    await MoveoutRequest.create({ requestID: id(requestIds, 'moveout-C-301', 'Request'), contractID: id(contractIds, 'C-301', 'Contract'), requestMoveoutDate: new Date('2026-10-31') });
    await CheckoutRequest.create({ requestID: id(requestIds, 'checkout-C-301', 'Request'), contractID: id(contractIds, 'C-301', 'Contract'), finalImage: 'uploads/checkout/request-706.jpg', finalReading: 205 });

    const ticketIds = new Map<string, Types.ObjectId>();
    for (const ticketData of [
      { key: 'repair-tap', roomCode: 'A-101', ticketName: 'Repair bathroom tap', createDate: new Date('2026-09-18'), status: TicketStatus.NEED_ACTION },
      { key: 'repair-heater', roomCode: 'A-102', ticketName: 'Repair water heater', createDate: new Date('2026-09-12'), status: TicketStatus.IN_PROGRESS },
      { key: 'noise', roomCode: 'B-101', ticketName: 'Noise complaint', createDate: new Date('2026-09-10'), resolveDate: new Date('2026-09-13'), status: TicketStatus.DONE },
    ]) {
      const ticket = await Ticket.create({ ...ticketData, roomID: id(roomIds, ticketData.roomCode, 'Room') });
      ticketIds.set(ticketData.key, ticket._id);
    }
    await Repair.create({ ticketID: id(ticketIds, 'repair-tap', 'Ticket'), facilityID: id(facilityIds, 'A-101:Bathroom tap', 'Facility'), description: 'Bathroom tap is leaking continuously.', facilityImage: 'uploads/repair/ticket-1001.jpg' });
    await Repair.create({ ticketID: id(ticketIds, 'repair-heater', 'Ticket'), facilityID: id(facilityIds, 'A-102:Water heater', 'Facility'), description: 'Water heater turns off after a few minutes.', facilityImage: 'uploads/repair/ticket-1002.jpg' });
    await Complain.create({ ticketID: id(ticketIds, 'noise', 'Ticket'), areaID: id(areaIds, 'Building B', 'Area'), roomID: id(roomIds, 'B-101', 'Room'), description: 'Noise after 23:00 near Building B hallway.' });

    console.log('Seed complete: 3 areas, 8 rooms, 5 tenant accounts, 4 contracts, 4 invoices, 6 requests, and 3 tickets.');
    console.log('Login accounts: admin / Admin@123, or a room code such as A-101 / Tenant@123.');
  } finally {
    await mongoose.disconnect();
  }
}

seed().catch((error: unknown) => {
  console.error('Seeding failed:', error);
  process.exitCode = 1;
});

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import Room from '../models/Room.js';
import Account from '../models/Account.js';
import Area from '../models/Area.js';
import Contract from '../models/Contract.js';
import User from '../models/User.js';
import Invoice from '../models/Invoice.js';
import Consumption from '../models/Consumption.js';
import Parameter from '../models/Parameter.js';
import { AccountRole, AccountStatus, RoomStatus, ParameterName, ContractStatus, InvoiceStatus,} from '../models/enums.js';

export interface ICreateRoomDTO {
  areaID: string;
  roomCode: string;
  floor: number;
  maxPeople: number;
  roomDetail: string;
  price: number;
  deposit: number;
  images: string[];
}

export interface IPrepareAccountDTO {
  roomID: string;
  newPassword: string;
}

export interface IGetRoomsQuery {
  search?: string;
  areaID?: string;
  status?: string;
  maxPeople?: number;
  owed?: 'owed' | 'not_owed';
  page?: number;
  limit?: number;
}

export interface IUpdateRoomDTO {
  roomCode?: string;
  floor?: number;
  maxPeople?: number;
  roomDetail?: string;
  price?: number;
  deposit?: number;
  images?: string[];
}

export class RoomService {

  public static async updateRoom(roomID: string, dto: IUpdateRoomDTO) {
    if (!mongoose.Types.ObjectId.isValid(roomID)) {
      const error: any = new Error('Invalid roomID format.');
      error.statusCode = 400;
      throw error;
    }

    const room = await Room.findById(roomID);
    if (!room) {
      const error: any = new Error('Room not found.');
      error.statusCode = 404;
      throw error;
    }

    // 1. Kiểm tra unique roomCode nếu có yêu cầu đổi mã phòng (AC2)
    if (dto.roomCode && dto.roomCode.trim() !== room.roomCode) {
      const trimmedCode = dto.roomCode.trim();
      const duplicate = await Room.findOne({
        roomCode: trimmedCode,
        _id: { $ne: room._id },
      });

      if (duplicate) {
        const error: any = new Error(`Room with code "${trimmedCode}" already exists.`);
        error.statusCode = 409;
        throw error;
      }

      // Cập nhật cả roomCode và đồng bộ username của Account phòng
      room.roomCode = trimmedCode;
      const normalizedUsername = trimmedCode.replace(/\s+/g, '');
      await Account.updateOne({ roomID: room._id }, { username: normalizedUsername });
    }

    // 2. Cập nhật các trường thông tin cho phép (AC1)
    if (dto.floor !== undefined && !isNaN(dto.floor)) {
      room.floor = dto.floor;
    }
    if (dto.maxPeople !== undefined && !isNaN(dto.maxPeople)) {
      room.maxPeople = dto.maxPeople;
    }
    if (dto.roomDetail !== undefined && dto.roomDetail.trim().length > 0) {
      room.roomDetail = dto.roomDetail.trim();
    }
    // AC4: Cập nhật room.price nhưng tuyệt đối KHÔNG đụng vào Contract
    if (dto.price !== undefined && !isNaN(dto.price)) {
      room.price = dto.price;
    }
    if (dto.deposit !== undefined && !isNaN(dto.deposit)) {
      room.deposit = dto.deposit;
    }
    if (dto.images && Array.isArray(dto.images) && dto.images.length > 0) {
      room.images = dto.images;
    }

    // Lưu lại Room (status giữ nguyên tuyệt đối theo AC3)
    await room.save();

    return {
      room: {
        roomID: String(room._id),
        areaID: String(room.areaID),
        roomCode: room.roomCode,
        floor: room.floor,
        maxPeople: room.maxPeople,
        roomDetail: room.roomDetail,
        price: room.price,
        deposit: room.deposit,
        status: room.status,
        availableFrom: room.availableFrom
          ? new Date(room.availableFrom).toISOString().split('T')[0]
          : null,
        images: room.images,
      },
      message: 'Room updated successfully',
    };
  }
  
  public static async getAdminRooms(query: IGetRoomsQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 12));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (query.areaID && mongoose.Types.ObjectId.isValid(query.areaID)) {
      filter.areaID = new mongoose.Types.ObjectId(query.areaID);
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.maxPeople && !isNaN(query.maxPeople)) {
      filter.maxPeople = Number(query.maxPeople);
    }

    const [paramStart, paramEnd] = await Promise.all([
      Parameter.findOne({ name: ParameterName.METER_READING_START_DAY }).lean(),
      Parameter.findOne({ name: ParameterName.METER_READING_END_DAY }).lean(),
    ]);

    const now = new Date();
    const startDate = paramStart ? new Date(paramStart.value) : null;
    const endDate = paramEnd ? new Date(paramEnd.value) : null;

    const pipeline: any[] = [];

    if (Object.keys(filter).length > 0) {
      pipeline.push({ $match: filter });
    }

    pipeline.push(
      {
        $lookup: {
          from: 'areas',
          localField: 'areaID',
          foreignField: '_id',
          as: 'areaData',
        },
      },
      {
        $addFields: {
          areaName: { $ifNull: [{ $arrayElemAt: ['$areaData.areaName', 0] }, 'N/A'] },
        },
      },
      {
        $lookup: {
          from: 'accounts',
          localField: '_id',
          foreignField: 'roomID',
          as: 'accountData',
        },
      },
      {
        $addFields: {
          roomAccount: { $arrayElemAt: ['$accountData', 0] },
        },
      },
      {
        $lookup: {
          from: 'contracts',
          let: { rId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$roomID', '$$rId'] },
                    { $eq: ['$status', 'active'] },
                  ],
                },
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
          ],
          as: 'activeContractData',
        },
      },
      {
        $addFields: {
          activeContract: { $arrayElemAt: ['$activeContractData', 0] },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'activeContract.userID',
          foreignField: '_id',
          as: 'tenantData',
        },
      },
      {
        $addFields: {
          mainTenant: { $arrayElemAt: ['$tenantData', 0] },
        },
      },
      {
        $lookup: {
          from: 'invoices',
          let: { rId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$roomID', '$$rId'] },
                    { $in: ['$status', ['not_paid', 'pending']] },
                  ],
                },
              },
            },
          ],
          as: 'unpaidInvoices',
        },
      },
      {
        $addFields: {
          stillOwed: {
            $sum: '$unpaidInvoices.totalBill',
          },
        },
      }
    );

    if (query.search && query.search.trim().length > 0) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      pipeline.push({
        $match: {
          $or: [
            { roomCode: { $regex: searchRegex } },
            { 'mainTenant.fullName': { $regex: searchRegex } },
            { 'roomAccount.username': { $regex: searchRegex } },
          ],
        },
      });
    }

    if (query.owed === 'owed') {
      pipeline.push({ $match: { stillOwed: { $gt: 0 } } });
    } else if (query.owed === 'not_owed') {
      pipeline.push({ $match: { stillOwed: { $eq: 0 } } });
    }

    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await Room.aggregate(countPipeline);
    const totalItems = countResult.length > 0 ? countResult[0].total : 0;
    const totalPages = Math.ceil(totalItems / limit) || 1;

    pipeline.push(
      { $sort: { roomCode: 1 } },
      { $skip: skip },
      { $limit: limit }
    );

    const rawRooms = await Room.aggregate(pipeline);

    const roomIds = rawRooms.map((r) => r._id);
    const latestConsumptions = await Consumption.find({
      roomID: { $in: roomIds },
    })
      .sort({ trackingTime: -1 })
      .lean();

    const consumptionMap = new Map<string, any>();
    latestConsumptions.forEach((c) => {
      const idStr = String(c.roomID);
      if (!consumptionMap.has(idStr)) {
        consumptionMap.set(idStr, c);
      }
    });

    const items = rawRooms.map((r) => {
      const rIdStr = String(r._id);
      const isRented = r.status === 'rented' || r.status === RoomStatus.RENTED;
      const lastConsump = consumptionMap.get(rIdStr);

      let electricityState: 'checked' | 'waiting_admin' | 'late' | 'not_applicable' = 'not_applicable';

      if (!isRented) {
        electricityState = 'not_applicable';
      } else {
        const hasReadingInCycle =
          lastConsump &&
          startDate &&
          endDate &&
          new Date(lastConsump.trackingTime) >= startDate;

        if (hasReadingInCycle) {
          electricityState = 'checked';
        } else if (startDate && endDate) {
          if (now < startDate) {
            electricityState = 'waiting_admin';
          } else if (now >= startDate && now <= endDate) {
            electricityState = 'waiting_admin';
          } else if (now > endDate) {
            electricityState = 'late';
          }
        } else {
          electricityState = 'waiting_admin';
        }
      }

      return {
        roomID: String(r._id),
        roomCode: r.roomCode,
        areaName: r.areaName,
        floor: r.floor,
        price: r.price,
        maxPeople: r.maxPeople,
        status: r.status,
        electricityState,
        tenantName: r.mainTenant ? r.mainTenant.fullName : null,
        contractExpireDate: r.activeContract?.expireDate
          ? new Date(r.activeContract.expireDate).toISOString().split('T')[0]
          : null,
        stillOwed: r.stillOwed || 0,
      };
    });

    return {
      items,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    };
  }

  public static async getAdminRoomDetail(roomID: string) {
    if (!mongoose.Types.ObjectId.isValid(roomID)) {
      const error: any = new Error('Invalid roomID format.');
      error.statusCode = 400;
      throw error;
    }

    const room = await Room.findById(roomID).lean();
    if (!room) {
      const error: any = new Error('Room not found.');
      error.statusCode = 404;
      throw error;
    }

    const area = await Area.findById(room.areaID).lean();

    const activeContract = await Contract.findOne({
      roomID: room._id,
      status: ContractStatus.ACTIVE,
    })
      .sort({ createdAt: -1 })
      .lean();

    let tenant: any = null;
    if (activeContract && activeContract.userID) {
      tenant = await User.findById(activeContract.userID).lean();
    }

    const account = await Account.findOne({ roomID: room._id })
      .select('-password')
      .lean();

    const unpaidInvoices = await Invoice.find({
      roomID: room._id,
      status: { $in: [InvoiceStatus.NOT_PAID, InvoiceStatus.PENDING] },
    }).lean();

    const stillOwed = unpaidInvoices.reduce((sum, inv) => sum + (inv.totalBill || 0), 0);

    return {
      room: {
        roomID: String(room._id),
        roomCode: room.roomCode,
        floor: room.floor,
        maxPeople: room.maxPeople,
        roomDetail: room.roomDetail,
        price: room.price,
        deposit: room.deposit,
        status: room.status,
        availableFrom: room.availableFrom
          ? new Date(room.availableFrom).toISOString().split('T')[0]
          : null,
        images: room.images || [],
      },
      area: area
        ? {
            areaID: String(area._id),
            areaName: area.areaName,
          }
        : null,
      activeContract: activeContract
        ? {
            contractID: String(activeContract._id),
            userID: String(activeContract.userID),
            roomID: String(activeContract.roomID),
            startDate: activeContract.startDate
              ? new Date(activeContract.startDate).toISOString().split('T')[0]
              : null,
            expireDate: activeContract.expireDate
              ? new Date(activeContract.expireDate).toISOString().split('T')[0]
              : null,
            deposit: (activeContract as any).propertyDeposit ?? (activeContract as any).deposit ?? room.deposit,
            rent: (activeContract as any).rent ?? (activeContract as any).rentPrice ?? room.price,
            status: activeContract.status,
            signature: (activeContract as any).signature || null,
            signedAt: (activeContract as any).signedAt || null,
          }
        : null,
      tenant: tenant
        ? {
            userID: String(tenant._id),
            fullName: tenant.fullName,
            phoneNumber: tenant.phoneNumber,
            identityNo: tenant.identityNo,
            dob: tenant.DoB ? new Date(tenant.DoB).toISOString().split('T')[0] : null,
            sex: tenant.sex,
            nationality: tenant.nationality,
            por: tenant.PoR,
          }
        : null,
      account: account
        ? {
            accountID: String(account._id),
            username: account.username,
            role: account.role,
            status: account.status,
            startDate: account.startDate
              ? new Date(account.startDate).toISOString().split('T')[0]
              : null,
          }
        : null,
      stillOwed,
    };
  }
  
  public static async createRoomWithAccount(dto: ICreateRoomDTO) {
    const areaExists = await Area.findById(dto.areaID);
    if (!areaExists) {
      const error: any = new Error('Selected Area does not exist.');
      error.statusCode = 404;
      throw error;
    }

    const existingRoom = await Room.findOne({ roomCode: dto.roomCode });
    if (existingRoom) {
      const error: any = new Error(`Room with code "${dto.roomCode}" already exists.`);
      error.statusCode = 409;
      throw error;
    }

    const normalizedUsername = dto.roomCode.replace(/\s+/g, '');
    const existingAccount = await Account.findOne({ username: normalizedUsername });
    if (existingAccount) {
      const error: any = new Error(`An account with username "${normalizedUsername}" already exists.`);
      error.statusCode = 409;
      throw error;
    }

    // Khởi tạo Transaction Session
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Tạo Room: Luôn có status = AVAILABLE_NOW theo đúng AC
      const roomDoc = new Room({
        areaID: new mongoose.Types.ObjectId(dto.areaID),
        roomCode: dto.roomCode,
        floor: dto.floor,
        maxPeople: dto.maxPeople,
        roomDetail: dto.roomDetail,
        price: dto.price,
        deposit: dto.deposit,
        status: RoomStatus.AVAILABLE_NOW,
        availableFrom: new Date(),
        images: dto.images,
      });

      const newRoom = await roomDoc.save({ session });

      // 2. Tạo Account: Luôn có status = BANNED theo đúng AC
      const rawPassword = process.env.DEFAULT_ROOM_PASSWORD!;
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(rawPassword, salt);

      const accountDoc = new Account({
        roomID: newRoom._id,
        username: normalizedUsername,
        password: passwordHash,
        status: AccountStatus.BANNED,
        role: AccountRole.USER,
        startDate: new Date(),
      });

      await accountDoc.save({ session });

      // Transaction commit cả Room + Account
      await session.commitTransaction();
      session.endSession();

      return {
        roomID: String(newRoom._id),
        areaID: String(newRoom.areaID),
        roomCode: newRoom.roomCode,
        floor: newRoom.floor,
        maxPeople: newRoom.maxPeople,
        roomDetail: newRoom.roomDetail,
        price: newRoom.price,
        deposit: newRoom.deposit,
        status: newRoom.status,
        availableFrom: newRoom.availableFrom,
        images: newRoom.images,
      };
    } catch (err) {
      // Rollback toàn bộ nếu Account creation hoặc bất kỳ bước nào fail
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }
  // Task: Admin prepares Room Account for Tenant (#31)
  public static async prepareRoomAccount(dto: IPrepareAccountDTO) {
    const { roomID, newPassword } = dto;

    // 1. Kiểm tra Room có tồn tại không
    const room = await Room.findById(roomID);
    if (!room) {
      const error: any = new Error('Room not found.');
      error.statusCode = 404;
      throw error;
    }

    // 2. Tìm Account gắn với roomID
    const account = await Account.findOne({ roomID: new mongoose.Types.ObjectId(roomID) });
    if (!account) {
      const error: any = new Error('Room Account not found for this room.');
      error.statusCode = 404;
      throw error;
    }

    // 3. AC: Chỉ Room Account đang BANNED mới được chuẩn bị
    if (account.status !== AccountStatus.BANNED) {
      const error: any = new Error(
        `Only room accounts with BANNED status can be prepared for a new tenant. Current status is "${account.status}".`
      );
      error.statusCode = 400;
      throw error;
    }

    // 4. Hash mật khẩu do Admin nhập
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword.trim(), salt);

    // 5. Cập nhật mật khẩu, chuyển BANNED -> INACTIVE và reset startDate
    account.password = hashedPassword;
    account.status = AccountStatus.INACTIVE;
    account.startDate = new Date();

    await account.save();

    // 6. Trả về đúng schema spec #31 (không trả password)
    return {
      accountID: String(account._id),
      roomID: String(room._id),
      username: account.username,
      status: account.status, // "inactive"
    };
  }
}
import Contract, { IContract } from '../models/Contract.js';
import Room, { IRoom } from '../models/Room.js';
import Parameter from '../models/Parameter.js';
import { ContractStatus, ParameterName } from '../models/enums.js';
import { buildContractDisplayID } from '../utils/displayId.js';

export interface ActiveContractResponse {
  contractID: string;      // ID thật
  displayID: string;       // ID hiển thị UI
  roomID: string;
  roomCode: string;
  startDate: string;
  expireDate: string;
  rentPrice: number;
  propertyDeposit: number;
  status: ContractStatus;
  signature: string | null;
  signedAt: string | null;
  terms: {
    contractPlaceholder: string;
    electricityUnitPrice: number;
    waterPrice: number;
    wifiFee: number;
    otherFees: number;
  };
}

export interface SignatureResponse {
  contractID: string;      // ID thật
  displayID: string;       // ID hiển thị UI
  signature: string | null;
  signedAt: string | null;
}

export class ContractService {
  /**
   * Lấy ACTIVE Contract của chính Tenant hiện tại
   */
  static async getCurrentActiveContract(
    userID: string,
    roomID: string
  ): Promise<ActiveContractResponse | null> {
    const contract = await Contract.findOne({
      userID,
      roomID,
      status: ContractStatus.ACTIVE,
    }).lean<IContract>();

    if (!contract) {
      return null;
    }

    const room = await Room.findById(roomID).select('roomCode').lean<IRoom>();
    const roomCode = room ? room.roomCode : '';

    const parameters = await Parameter.find({
      name: {
        $in: [
          ParameterName.CONTRACT_PLACEHOLDER,
          ParameterName.ELECTRICITY_UNIT_PRICE,
          ParameterName.WATER_PRICE,
          ParameterName.WIFI_FEE,
          ParameterName.OTHER_FEES,
        ],
      },
    }).lean();

    const paramMap = new Map<string, string>();
    parameters.forEach((p) => paramMap.set(p.name, p.value));

    const formatDateOnly = (d: Date | string): string => {
      const date = new Date(d);
      return date.toISOString().split('T')[0];
    };

    // Sinh mã displayID bằng util dùng chung của dự án
    const displayID = buildContractDisplayID(roomCode, new Date(contract.startDate));

    return {
      contractID: contract._id.toString(), // ID thật dùng cho các mutation API sau này
      displayID,                          // Mã ngắn gọn UI bind lên view
      roomID: contract.roomID.toString(),
      roomCode,
      startDate: formatDateOnly(contract.startDate),
      expireDate: formatDateOnly(contract.expireDate),
      rentPrice: contract.rentPrice,
      propertyDeposit: contract.propertyDeposit,
      status: contract.status,
      signature: contract.signature || null,
      signedAt: contract.signedAt ? new Date(contract.signedAt).toISOString() : null,
      terms: {
        contractPlaceholder: paramMap.get(ParameterName.CONTRACT_PLACEHOLDER) || '',
        electricityUnitPrice: Number(paramMap.get(ParameterName.ELECTRICITY_UNIT_PRICE) || 0),
        waterPrice: Number(paramMap.get(ParameterName.WATER_PRICE) || 0),
        wifiFee: Number(paramMap.get(ParameterName.WIFI_FEE) || 0),
        otherFees: Number(paramMap.get(ParameterName.OTHER_FEES) || 0),
      },
    };
  }

  /**
   * Lấy chữ ký đã lưu kèm định danh hiển thị
   */
  static async getStoredSignature(
    userID: string,
    roomID: string
  ): Promise<SignatureResponse | null> {
    const contract = await Contract.findOne({
      userID,
      roomID,
      status: ContractStatus.ACTIVE,
    })
      .select('_id startDate signature signedAt')
      .lean<IContract>();

    if (!contract) {
      return null;
    }

    const room = await Room.findById(roomID).select('roomCode').lean<IRoom>();
    const roomCode = room ? room.roomCode : '';
    const displayID = buildContractDisplayID(roomCode, new Date(contract.startDate));

    return {
      contractID: contract._id.toString(),
      displayID,
      signature: contract.signature || null,
      signedAt: contract.signedAt ? new Date(contract.signedAt).toISOString() : null,
    };
  }
}
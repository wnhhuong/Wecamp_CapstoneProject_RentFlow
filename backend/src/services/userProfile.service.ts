import mongoose from 'mongoose';
import User from '../models/User.js';
import Contract from '../models/Contract.js';
import Account from '../models/Account.js';
import { ContractStatus } from '../models/enums.js';

export interface IUpdateProfileDTO {
  fullName?: string;
  dob?: string;
  phoneNumber?: string;
  identityNo?: string;
  sex?: 'male' | 'female' | 'other';
  nationality?: string;
  por?: string;
}

export class UserProfileService {
  /**
   * Lấy Profile của Tenant hiện tại
   */
  public static async getTenantProfile(authContext: any) {
    console.log('[DEBUG Profile Context]:', authContext);

    // 1. Ưu tiên lấy trực tiếp userID từ token context
    let resolvedUserID =
      authContext?.userID ||
      authContext?.user?.userID ||
      authContext?.user?._id ||
      authContext?.user?.id;

    // 2. Fallback: Nếu không có userID, tìm thông qua Account và Contract ACTIVE
    if (!resolvedUserID) {
      const accountID =
        authContext?.accountID ||
        authContext?.user?.accountID ||
        authContext?.account?._id ||
        authContext?.account?.accountID;

      if (accountID && mongoose.Types.ObjectId.isValid(accountID)) {
        const account = await Account.findById(accountID);
        if (account && account.roomID) {
          const activeContract = await Contract.findOne({
            roomID: account.roomID,
            status: ContractStatus.ACTIVE,
          });
          if (activeContract) {
            resolvedUserID = String(activeContract.userID);
          }
        }
      }
    }

    if (!resolvedUserID || !mongoose.Types.ObjectId.isValid(resolvedUserID)) {
      const error: any = new Error('Profile not found.');
      error.statusCode = 404;
      throw error;
    }

    const user = await User.findById(resolvedUserID);
    if (!user) {
      const error: any = new Error('User profile record does not exist.');
      error.statusCode = 404;
      throw error;
    }

    return {
      userID: String(user._id),
      fullName: user.fullName,
      dob: user.DoB ? new Date(user.DoB).toISOString().split('T')[0] : null,
      phoneNumber: user.phoneNumber,
      identityNo: user.identityNo,
      sex: user.sex,
      nationality: user.nationality,
      por: user.PoR,
    };
  }

  /**
   * Cập nhật thông tin Profile có ownership check và CCCD uniqueness
   */
  public static async updateTenantProfile(
    authContext: { accountID?: string; userID?: string },
    dto: IUpdateProfileDTO
  ) {
    let currentUserID = authContext.userID;

    if (!currentUserID && authContext.accountID) {
      const account = await Account.findById(authContext.accountID);
      if (!account || !account.roomID) {
        const error: any = new Error('Tenant room account not found.');
        error.statusCode = 404;
        throw error;
      }

      const activeContract = await Contract.findOne({
        roomID: account.roomID,
        status: ContractStatus.ACTIVE,
      });

      if (!activeContract) {
        const error: any = new Error('Active lease contract not found for this tenant.');
        error.statusCode = 404;
        throw error;
      }

      currentUserID = String(activeContract.userID);
    }

    if (!currentUserID || !mongoose.Types.ObjectId.isValid(currentUserID)) {
      const error: any = new Error('User not found.');
      error.statusCode = 404;
      throw error;
    }

    const currentUser = await User.findById(currentUserID);
    if (!currentUser) {
      const error: any = new Error('User profile record not found.');
      error.statusCode = 404;
      throw error;
    }

    // Kiểm tra CCCD uniqueness nếu có thay đổi identityNo
    if (dto.identityNo && dto.identityNo.trim() !== currentUser.identityNo) {
      const trimmedCCCD = dto.identityNo.trim();
      const existingUserWithCCCD = await User.findOne({ identityNo: trimmedCCCD });

      if (existingUserWithCCCD && String(existingUserWithCCCD._id) !== String(currentUser._id)) {
        const error: any = new Error('Identity number (CCCD) is already in use by another user.');
        error.statusCode = 409;
        throw error;
      }

      currentUser.identityNo = trimmedCCCD;
    }

    // Update các trường được phép
    if (dto.fullName !== undefined) currentUser.fullName = dto.fullName.trim();
    if (dto.dob !== undefined) {
      const parsedDate = new Date(dto.dob);
      if (isNaN(parsedDate.getTime())) {
        const error: any = new Error('Invalid date format for dob (YYYY-MM-DD required).');
        error.statusCode = 400;
        throw error;
      }
      currentUser.DoB = parsedDate;
    }
    if (dto.phoneNumber !== undefined) currentUser.phoneNumber = dto.phoneNumber.trim();
    if (dto.sex !== undefined) currentUser.sex = dto.sex as any;
    if (dto.nationality !== undefined) currentUser.nationality = dto.nationality.trim();
    if (dto.por !== undefined) currentUser.PoR = dto.por.trim();

    await currentUser.save();

    return {
      userID: String(currentUser._id),
      fullName: currentUser.fullName,
      dob: currentUser.DoB ? new Date(currentUser.DoB).toISOString().split('T')[0] : null,
      phoneNumber: currentUser.phoneNumber,
      identityNo: currentUser.identityNo,
      sex: currentUser.sex,
      nationality: currentUser.nationality,
      por: currentUser.PoR,
    };
  }
}
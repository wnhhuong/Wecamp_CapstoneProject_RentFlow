import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import Parameter from '../../models/Parameter.js';
import { ParameterName } from '../../models/enums.js';
import { sendSuccess, sendError } from '../../utils/response.js';

const VN_PHONE_REGEX = /^(03|05|07|08|09)\d{8}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^(https?:\/\/)[^\s/$.?#].[^\s]*$/i;
const BANK_ACCOUNT_REGEX = /^\d{6,20}$/;

/**
 * Validate định dạng và giá trị của từng loại parameter theo AC3
 */
const parseFiniteNumber = (value: string): number | null => {
  if (!value) return null;

  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const validateParameterValue = (name: ParameterName | string, rawValue: unknown): { isValid: boolean; message?: string } => {
  if (typeof rawValue !== 'string') {
    return { isValid: false, message: 'The "value" field must be a string.' };
  }

  const value = rawValue.trim();

  switch (name) {
    case ParameterName.ELECTRICITY_UNIT_PRICE:
    case ParameterName.WATER_PRICE:
    case ParameterName.WIFI_FEE:
    case ParameterName.PARKING_FEE:
    case ParameterName.OTHER_FEES: {
      const num = parseFiniteNumber(value);
      if (num === null || num < 0) {
        return { isValid: false, message: `${name} must be a valid number greater than or equal to 0.` };
      }
      return { isValid: true };
    }

    case ParameterName.YEAR_TO_EXTEND: {
      const num = parseFiniteNumber(value);
      if (num === null || !Number.isInteger(num) || num <= 0) {
        return { isValid: false, message: 'yearToExtend must be an integer greater than 0.' };
      }
      return { isValid: true };
    }

    case ParameterName.ADMIN_PHONE: {
      if (!VN_PHONE_REGEX.test(value)) {
        return { isValid: false, message: 'adminPhone must be a valid Vietnamese phone number (10 digits starting with 03, 05, 07, 08, 09).' };
      }
      return { isValid: true };
    }

    case ParameterName.ADMIN_EMAIL: {
      if (!EMAIL_REGEX.test(value)) {
        return { isValid: false, message: 'adminEmail must be a valid email address.' };
      }
      return { isValid: true };
    }

    case ParameterName.ADMIN_FACEBOOK: {
      if (value === '') {
        return { isValid: true };
      }
      if (!URL_REGEX.test(value)) {
        return { isValid: false, message: 'adminFacebook must be a valid URL or empty string.' };
      }
      return { isValid: true };
    }

    case ParameterName.ADMIN_ZALO: {
      if (!value) {
        return { isValid: false, message: 'adminZalo must not be empty.' };
      }
      const isPhone = VN_PHONE_REGEX.test(value);
      const isUrl = URL_REGEX.test(value);
      if (!isPhone && !isUrl) {
        return { isValid: false, message: 'adminZalo must be a valid Vietnamese phone number or URL.' };
      }
      return { isValid: true };
    }

    case ParameterName.BANK_ACCOUNT_NUMBER: {
      if (!BANK_ACCOUNT_REGEX.test(value)) {
        return { isValid: false, message: 'bankAccountNumber must be 6 to 20 digits.' };
      }
      return { isValid: true };
    }

    case ParameterName.BANK_QR_IMAGE: {
      // Chỉ ghi qua endpoint upload, không gõ tay. Chưa có ảnh thì KHÔNG seed bản ghi
      // này: PARAMETER.value là required nên Mongoose coi chuỗi rỗng là thiếu.
      if (!value.startsWith('/uploads/')) {
        return { isValid: false, message: 'bankQrImage must be an uploaded image path.' };
      }
      return { isValid: true };
    }

    case ParameterName.ADDRESS:
    case ParameterName.PROPERTY_NAME:
    case ParameterName.BANK_ACCOUNT_HOLDER:
    case ParameterName.BANK_NAME:
    case ParameterName.CONTRACT_PLACEHOLDER: {
      if (!value) {
        return { isValid: false, message: `${name} must not be empty.` };
      }
      return { isValid: true };
    }

    case ParameterName.METER_READING_START_DAY:
    case ParameterName.METER_READING_END_DAY:
    case ParameterName.PAYMENT_DUE_DAY: {
      const day = parseFiniteNumber(value);
      if (day === null || !Number.isInteger(day) || day < 1 || day > 31) {
        return { isValid: false, message: `${name} must be a valid day of the month (integer from 1 to 31).` };
      }
      return { isValid: true };
    }

    default:
      return { isValid: true };
  }
};

const dateParamEnums: ParameterName[] = [
  ParameterName.METER_READING_START_DAY,
  ParameterName.METER_READING_END_DAY,
  ParameterName.PAYMENT_DUE_DAY,
];

const validateMeterReadingOrder = async (overrides: Map<ParameterName, string>): Promise<{ isValid: boolean; message?: string }> => {
  const relatedDateParams = await Parameter.find({
    name: { $in: dateParamEnums },
  }).lean();

  const daysMap: Record<string, number> = {};
  relatedDateParams.forEach((p: any) => {
    daysMap[p.name] = Number(p.value);
  });

  overrides.forEach((value, name) => {
    daysMap[name] = Number(value.trim());
  });

  const startDay = daysMap[ParameterName.METER_READING_START_DAY];
  const endDay = daysMap[ParameterName.METER_READING_END_DAY];

  if (startDay !== undefined && endDay !== undefined && startDay > endDay) {
    return {
      isValid: false,
      message: `Cross-date validation failed: meterReadingStartDay (${startDay}) must be earlier than or equal to meterReadingEndDay (${endDay}).`,
    };
  }

  return { isValid: true };
};

/**
 * #41new: GET /api/admin/parameters
 */
export const getAllParameters = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parameters = await Parameter.find().sort({ createdAt: 1 }).lean();

    const formattedData = parameters.map((param: any) => ({
      id: param._id ? String(param._id) : '',
      name: param.name,
      value: param.value,
    }));

    sendSuccess(res, formattedData, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/parameters
 */
export const updateParameters = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const session = await mongoose.startSession();

  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      sendError(res, 400, 'The "updates" field must be a non-empty array.');
      return;
    }

    const seenIds = new Set<string>();
    const ids: string[] = [];

    for (const update of updates) {
      if (!update || typeof update !== 'object') {
        sendError(res, 400, 'Each update must be an object with parameterID and value.');
        return;
      }

      const { parameterID, value } = update;
      if (typeof parameterID !== 'string' || !mongoose.Types.ObjectId.isValid(parameterID)) {
        sendError(res, 404, `Parameter with ID ${parameterID} not found.`);
        return;
      }

      if (seenIds.has(parameterID)) {
        sendError(res, 400, `Duplicate update for parameter ID ${parameterID}.`);
        return;
      }

      if (typeof value !== 'string') {
        sendError(res, 400, 'Each update "value" field must be a string.');
        return;
      }

      seenIds.add(parameterID);
      ids.push(parameterID);
    }

    const parameters = await Parameter.find({ _id: { $in: ids } });
    if (parameters.length !== ids.length) {
      sendError(res, 404, 'One or more parameters were not found.');
      return;
    }

    const valueByID = new Map<string, string>(
      updates.map((update: { parameterID: string; value: string }) => [
        update.parameterID,
        update.value.trim(),
      ]),
    );
    const dateOverrides = new Map<ParameterName, string>();

    for (const parameter of parameters) {
      const value = valueByID.get(String(parameter._id));
      const ruleCheck = validateParameterValue(parameter.name, value);

      if (!ruleCheck.isValid) {
        sendError(res, 400, ruleCheck.message || 'Validation failed for parameter value.');
        return;
      }

      if (dateParamEnums.includes(parameter.name)) {
        dateOverrides.set(parameter.name, value ?? '');
      }
    }

    if (dateOverrides.size > 0) {
      const orderCheck = await validateMeterReadingOrder(dateOverrides);
      if (!orderCheck.isValid) {
        sendError(res, 422, orderCheck.message || 'Cross-date validation failed.');
        return;
      }
    }

    let updatedParameters: typeof parameters = [];

    await session.withTransaction(async () => {
      updatedParameters = [];

      for (const parameter of parameters) {
        parameter.value = valueByID.get(String(parameter._id)) ?? parameter.value;
        await parameter.save({ session });
        updatedParameters.push(parameter);
      }
    });

    sendSuccess(
      res,
      updatedParameters.map((parameter) => ({
        id: parameter._id ? String(parameter._id) : '',
        name: parameter.name,
        value: parameter.value,
      })),
      200
    );
  } catch (error) {
    next(error);
  } finally {
    await session.endSession();
  }
};

/**
 * #42new: PATCH /api/admin/parameters/:parameterID
 */
export const updateParameter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { parameterID } = req.params;
    const id = Array.isArray(parameterID) ? parameterID[0] : parameterID;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      sendError(res, 404, `Parameter with ID ${id} not found.`);
      return;
    }

    // Strict body: chỉ nhận duy nhất field 'value'
    const bodyKeys = Object.keys(req.body);
    if (!bodyKeys.includes('value') || bodyKeys.length !== 1) {
      sendError(res, 400, 'Only the "value" field is allowed. Extra fields or modifying name/id is strictly rejected.');
      return;
    }

    const { value } = req.body;

    const currentParam = await Parameter.findById(id);
    if (!currentParam) {
      sendError(res, 404, `Parameter with ID ${id} not found.`);
      return;
    }

    // Validate theo enum type
    const ruleCheck = validateParameterValue(currentParam.name, value);
    if (!ruleCheck.isValid) {
      sendError(res, 400, ruleCheck.message || 'Validation failed for parameter value.');
      return;
    }

    // Cross-row Date Validation (HTTP 422)
    // Cross-row Day Validation (HTTP 422)
    if (dateParamEnums.includes(currentParam.name)) {
      const orderCheck = await validateMeterReadingOrder(
        new Map([[currentParam.name, (value as string).trim()]]),
      );

      if (!orderCheck.isValid) {
        sendError(res, 422, orderCheck.message || 'Cross-date validation failed.');
        return;
      }
    }

    // Cập nhật và lưu vào MongoDB
    currentParam.value = (value as string).trim();
    await currentParam.save();

    sendSuccess(
      res,
      {
        id: currentParam._id ? String(currentParam._id) : '',
        name: currentParam.name,
        value: currentParam.value,
      },
      200
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/parameters/bank-qr
 * Nhận ảnh QR chuyển khoản, lưu path vào Parameter bankQrImage. Ảnh cũ bị xoá
 * khỏi đĩa để thư mục không phình theo mỗi lần chủ trọ đổi mã.
 */
export const uploadBankQrImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      sendError(res, 400, 'An image file is required.');
      return;
    }

    const imagePath = `/uploads/bank-qr/${file.filename}`;

    const parameter = await Parameter.findOneAndUpdate(
      { name: ParameterName.BANK_QR_IMAGE },
      { value: imagePath },
      { new: true, upsert: true },
    );

    const previousPath = (req as any).previousBankQrPath as string | undefined;
    if (previousPath && previousPath !== imagePath && previousPath.startsWith('/uploads/')) {
      await fs.promises
        .unlink(path.join(process.cwd(), previousPath.replace(/^\//, '')))
        .catch(() => undefined);
    }

    sendSuccess(res, {
      id: parameter ? String(parameter._id) : '',
      name: ParameterName.BANK_QR_IMAGE,
      value: imagePath,
    }, 200);
  } catch (error) {
    next(error);
  }
};

/** Đọc path cũ TRƯỚC khi multer ghi đè, để controller còn biết mà xoá. */
export const rememberBankQrPath = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await Parameter.findOne({ name: ParameterName.BANK_QR_IMAGE }).lean();
    (req as any).previousBankQrPath = existing?.value ?? '';
  } catch {
    (req as any).previousBankQrPath = '';
  }
  next();
};

import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Parameter from '../../models/Parameter.js';
import { ParameterName } from '../../models/enums.js';
import { sendSuccess, sendError } from '../../utils/response.js';

const VN_PHONE_REGEX = /^(03|05|07|08|09)\d{8}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^(https?:\/\/)[^\s/$.?#].[^\s]*$/i;

/**
 * Validate định dạng và giá trị của từng loại parameter theo AC3
 */
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
      const num = Number(value);
      if (isNaN(num) || num < 0) {
        return { isValid: false, message: `${name} must be a valid number greater than or equal to 0.` };
      }
      return { isValid: true };
    }

    case ParameterName.YEAR_TO_EXTEND: {
      const num = Number(value);
      if (isNaN(num) || !Number.isInteger(num) || num <= 0) {
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

    case ParameterName.ADDRESS:
    case ParameterName.PROPERTY_NAME:
    case ParameterName.CONTRACT_PLACEHOLDER: {
      if (!value) {
        return { isValid: false, message: `${name} must not be empty.` };
      }
      return { isValid: true };
    }

    case ParameterName.METER_READING_START_DAY:
    case ParameterName.METER_READING_END_DAY:
    case ParameterName.PAYMENT_DUE_DAY: {
      const day = Number(value);
      if (isNaN(day) || !Number.isInteger(day) || day < 1 || day > 31) {
        return { isValid: false, message: `${name} must be a valid day of the month (integer from 1 to 31).` };
      }
      return { isValid: true };
    }

    default:
      return { isValid: true };
  }
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
    const dateParamEnums: ParameterName[] = [
      ParameterName.METER_READING_START_DAY,
      ParameterName.METER_READING_END_DAY,
      ParameterName.PAYMENT_DUE_DAY,
    ];

    if (dateParamEnums.includes(currentParam.name)) {
      const relatedDateParams = await Parameter.find({
        name: { $in: dateParamEnums },
      }).lean();

      const daysMap: Record<string, number> = {};
      relatedDateParams.forEach((p: any) => {
        daysMap[p.name] = Number(p.value);
      });

      daysMap[currentParam.name] = Number((value as string).trim());

      const startDay = daysMap[ParameterName.METER_READING_START_DAY];
      const endDay = daysMap[ParameterName.METER_READING_END_DAY];

      // Kiểm tra: StartDay <= EndDay
      if (startDay !== undefined && endDay !== undefined && startDay > endDay) {
        sendError(
          res,
          422,
          `Cross-date validation failed: meterReadingStartDay (${startDay}) must be earlier than or equal to meterReadingEndDay (${endDay}).`
        );
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

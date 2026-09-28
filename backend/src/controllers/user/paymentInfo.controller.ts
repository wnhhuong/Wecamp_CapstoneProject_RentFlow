import { NextFunction, Request, Response } from "express";

import Parameter from "../../models/Parameter.js";
import { ParameterName } from "../../models/enums.js";
import { sendError, sendSuccess } from "../../utils/response.js";

/**
 * Thông tin nhận chuyển khoản, cho màn thanh toán của tenant.
 * Cố ý KHÔNG nằm trong /guest/parameters: chỉ người đang thuê mới cần số tài khoản.
 */
// GET /api/user/parameters
export const getPaymentInfo = async (
    _req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const [holder, bank, accountNumber, qrImage] = await Promise.all([
            Parameter.findOne({ name: ParameterName.BANK_ACCOUNT_HOLDER }).lean(),
            Parameter.findOne({ name: ParameterName.BANK_NAME }).lean(),
            Parameter.findOne({ name: ParameterName.BANK_ACCOUNT_NUMBER }).lean(),
            Parameter.findOne({ name: ParameterName.BANK_QR_IMAGE }).lean(),
        ]);

        if (!holder || !bank || !accountNumber) {
            sendError(res, 404, "Bank transfer parameters are not configured");
            return;
        }

        sendSuccess(res, {
            bankAccountHolder: holder.value,
            bankName: bank.value,
            bankAccountNumber: accountNumber.value,
            bankQrImage: qrImage?.value || null,
        }, 200);
    } catch (error) {
        next(error);
    }
};

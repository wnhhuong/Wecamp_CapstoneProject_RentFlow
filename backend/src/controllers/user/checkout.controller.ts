import fs from 'fs';
import { NextFunction, Response } from 'express';
import { UserAuthRequest } from '../../middlewares/auth.middleware.js';
import { sendError, sendSuccess } from '../../utils/response.js';
import { createCheckoutRequest, RequestServiceError } from '../../services/request.service.js';

export const createCheckoutRequestController = async (
  req: UserAuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const file = req.file;
  const cleanupFile = () => {
    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  };

  try {
    const { finalReading } = req.body;
    const finalReadingNumber = Number(finalReading);

    if (!file) {
      sendError(res, 400, 'Final meter image is required.');
      return;
    }

    if (
      finalReading === undefined ||
      !Number.isInteger(finalReadingNumber) ||
      finalReadingNumber < 0
    ) {
      cleanupFile();
      sendError(res, 400, 'finalReading must be an integer >= 0.');
      return;
    }

    const result = await createCheckoutRequest({
      auth: req.auth,
      finalImage: `/uploads/checkout/${file.filename}`,
      finalReading: finalReadingNumber,
    });

    sendSuccess(res, result, 201);
  } catch (error) {
    cleanupFile();

    if (error instanceof RequestServiceError) {
      sendError(res, error.statusCode, error.message);
      return;
    }

    next(error);
  }
};

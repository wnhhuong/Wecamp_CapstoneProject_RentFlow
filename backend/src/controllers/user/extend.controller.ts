import { NextFunction, Response } from 'express';
import { UserAuthRequest } from '../../middlewares/auth.middleware.js';
import { sendError, sendSuccess } from '../../utils/response.js';
import { createExtendRequest, RequestServiceError } from '../../services/request.service.js';

export const createExtendRequestController = async (
  req: UserAuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await createExtendRequest({ auth: req.auth });
    sendSuccess(res, result, 201);
  } catch (error) {
    if (error instanceof RequestServiceError) {
      sendError(res, error.statusCode, error.message);
      return;
    }

    next(error);
  }
};

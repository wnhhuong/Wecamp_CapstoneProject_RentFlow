import { Request, Response, NextFunction } from 'express';
import {
  approveRequest,
  listRequests,
  getRequestDetail,
  RequestServiceError,
} from '../../services/request.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';

/**
 * #38 — GET /api/admin/requests
 * Task "Approve Consumption": AC "Admin xem được pending Consumption Request"
 * -> dùng ?type=consump&status=pending khi gọi endpoint này.
 */
export const listRequestsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { search, type, status, page, limit } = req.query;
    const data = await listRequests({
      search: search as string | undefined,
      type: type as string | undefined,
      status: status as string | undefined,
      page: page as string | undefined,
      limit: limit as string | undefined,
    });
    sendSuccess(res, data, 200);
  } catch (error) {
    if (error instanceof RequestServiceError) {
      sendError(res, error.statusCode, error.message);
      return;
    }
    next(error);
  }
};

/**
 * #39 — GET /api/admin/requests/:requestID
 * Task "Approve Consumption": AC "Admin xem meter image, current reading và previous/base reading".
 */
export const getRequestDetailController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { requestID } = req.params;
    const id = Array.isArray(requestID) ? requestID[0] : requestID;
    const data = await getRequestDetail(id as string);
    sendSuccess(res, data, 200);
  } catch (error) {
    if (error instanceof RequestServiceError) {
      sendError(res, error.statusCode, error.message);
      return;
    }
    next(error);
  }
};

/**
 * #40 — PATCH /api/admin/requests/:requestID/approve
 * Xử lý atomic cho type=consump. Xem chi tiết trong request.service.ts.
 */
export const approveRequestController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { requestID } = req.params;
    const id = Array.isArray(requestID) ? requestID[0] : requestID;

    const result = await approveRequest(id as string);

    sendSuccess(res, result, 200);
  } catch (error) {
    if (error instanceof RequestServiceError) {
      sendError(res, error.statusCode, error.message);
      return;
    }
    next(error);
  }
};
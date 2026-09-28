import { Response } from 'express';
import { ContractService } from '../../services/contract.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { AuthRequest } from '../../middlewares/auth.middleware.js';

export class TenantContractController {
  /**
   * GET /api/user/contract (#19)
   */
  public static async getActiveContract(
    req: AuthRequest,
    res: Response
  ): Promise<void> {
    try {
      if (
        !req.auth ||
        req.auth.role !== 'user' ||
        !req.auth.userID ||
        !req.auth.roomID
      ) {
        sendError(res, 401, 'Unauthorized');
        return;
      }

      const contractData = await ContractService.getCurrentActiveContract(
        req.auth.userID,
        req.auth.roomID
      );

      if (!contractData) {
        sendError(res, 404, 'No active contract found for the current tenancy.');
        return;
      }

      sendSuccess(res, contractData, 200);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.statusCode, error.message);
        return;
      }

      sendError(res, 500, error.message || 'Internal server error');
    }
  }

  /**
   * GET /api/user/contract/signature (#20)
   */
  public static async getContractSignature(
    req: AuthRequest,
    res: Response
  ): Promise<void> {
    try {
      if (
        !req.auth ||
        req.auth.role !== 'user' ||
        !req.auth.userID ||
        !req.auth.roomID
      ) {
        sendError(res, 401, 'Unauthorized');
        return;
      }

      const signatureData = await ContractService.getStoredSignature(
        req.auth.userID,
        req.auth.roomID
      );

      if (!signatureData) {
        sendError(res, 404, 'No active contract signature found for the current tenancy.');
        return;
      }

      sendSuccess(res, signatureData, 200);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.statusCode, error.message);
        return;
      }

      sendError(res, 500, error.message || 'Internal server error');
    }
  }
}
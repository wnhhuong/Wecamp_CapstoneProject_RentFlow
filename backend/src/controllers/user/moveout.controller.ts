import { Response } from 'express';
import { createMoveoutRequest } from '../../services/request.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { AuthRequest } from '../../middlewares/auth.middleware.js';

export class TenantMoveoutController {
    /**
    * POST /api/user/moveout-requests (#21)
    */

    public static async createMoveoutRequest(
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

        const { requestMoveoutDate } = req.body;
        if (
            !requestMoveoutDate ||
            typeof requestMoveoutDate !== 'string' ||
            !requestMoveoutDate.trim()
        ) {
            sendError(res, 400, 'requestMoveoutDate is required.');
            return;
        }

        const moveoutData = await createMoveoutRequest({
        auth: req.auth,
        requestMoveoutDate: requestMoveoutDate.trim(),
      });

      if (!moveoutData) {
        sendError(res, 400, 'Failed to create move-out request.');
        return;
      }

      sendSuccess(res, moveoutData, 201);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.statusCode, error.message);
        return;
      }

      sendError(res, 500, error.message || 'Internal server error');
    }
  }
}

import { Response } from 'express';
import { UserProfileService } from '../../services/userProfile.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { AuthRequest } from '../../middlewares/auth.middleware.js';

export class UserProfileController {
  /**
   * GET /api/user/profile (#17)
   */
  public static async getProfile(
    req: AuthRequest,
    res: Response
  ): Promise<void> {
    try {
      if (!req.auth) {
        sendError(res, 401, 'Unauthorized');
        return;
      }

      const authContext = {
        accountID: req.auth.accountID,
        userID: req.auth.role === 'user' ? req.auth.userID : undefined,
      };

      const profile = await UserProfileService.getTenantProfile(authContext);

      sendSuccess(res, profile, 200);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.statusCode, error.message);
        return;
      }

      sendError(res, 500, error.message || 'Internal server error');
    }
  }

  /**
   * PUT /api/user/profile hoặc PATCH /api/user/profile
   */
  public static async updateProfile(
    req: AuthRequest,
    res: Response
  ): Promise<void> {
    try {
      if (!req.auth) {
        sendError(res, 401, 'Unauthorized');
        return;
      }

      const { fullName, dob, phoneNumber, identityNo, sex, nationality, por } =
        req.body;

      if (identityNo && !/^\d{9,12}$/.test(identityNo.trim())) {
        sendError(
          res,
          400,
          'Invalid identity number format (CCCD must be 9-12 digits).'
        );
        return;
      }

      if (sex && !['male', 'female', 'other'].includes(sex)) {
        sendError(res, 400, 'Sex must be one of: male, female, other.');
        return;
      }

      if (phoneNumber && !/^[0-9+]{9,15}$/.test(phoneNumber.trim())) {
        sendError(res, 400, 'Invalid phone number format.');
        return;
      }

      const authContext = {
        accountID: req.auth.accountID,
        userID: req.auth.role === 'user' ? req.auth.userID : undefined,
      };

      const updatedProfile = await UserProfileService.updateTenantProfile(
        authContext,
        {
          fullName,
          dob,
          phoneNumber,
          identityNo,
          sex,
          nationality,
          por,
        }
      );

      sendSuccess(res, updatedProfile, 200);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.statusCode, error.message);
        return;
      }

      sendError(res, 500, error.message || 'Internal server error');
    }
  }
}

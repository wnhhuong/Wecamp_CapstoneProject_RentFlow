import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../../services/dashboard.service.js';
import { sendSuccess } from '../../utils/response.js';

export class AdminDashboardController {
    public static async getDashboardSummary(
        _req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const dashboardData = await DashboardService.getAdminDashboardSummary();
            sendSuccess(res, dashboardData);
        } catch (error) {
            next(error);
        }
    }
}
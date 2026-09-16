import { Router } from 'express';
import { AdminDashboardController } from '../../controllers/admin/dashboard.controller.js';
import { protect, adminOnly } from '../../middlewares/auth.middleware.js';

const router = Router();

// Toàn bộ route trong này yêu cầu xác thực JWT và vai trò Admin
router.use(protect, adminOnly);

//@route GET /api/admin/dashboard (#25)
router.get('/', AdminDashboardController.getDashboardSummary);

export default router;
import { Router } from 'express';
import { TenantMoveoutController } from '../../controllers/user/moveout.controller.js';
import { protect, userOnly } from '../../middlewares/auth.middleware.js';

const router = Router();

// Toàn bộ API move-out yêu cầu tenant đăng nhập
router.use(protect, userOnly);

// POST /api/user/moveout-requests (#21)
router.post('/', TenantMoveoutController.createMoveoutRequest);

export default router;

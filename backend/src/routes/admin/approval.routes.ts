import { Router } from 'express';
import {
  listRequestsController,
  getRequestDetailController,
  approveRequestController,
} from '../../controllers/admin/request.controller.js';
import { protect, adminOnly } from '../../middlewares/auth.middleware.js';

const router = Router();

// Toàn bộ route admin requests yêu cầu đăng nhập và role ADMIN
router.use(protect, adminOnly);

// #38 — GET /api/admin/requests?type=consump&status=pending
router.get('/', listRequestsController);

// #39 — GET /api/admin/requests/:requestID
router.get('/:requestID', getRequestDetailController);

// #40 — PATCH /api/admin/requests/:requestID/approve
router.patch('/:requestID/approve', approveRequestController);

export default router;
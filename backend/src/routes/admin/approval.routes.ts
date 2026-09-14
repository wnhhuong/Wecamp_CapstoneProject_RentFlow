import { Router } from 'express';
import { protect, adminOnly } from '../../middlewares/auth.middleware';
import * as requestController from '../../controllers/request.controller';

const router = Router();

router.use(protect, adminOnly);

// GET /api/requests?type=consump&status=pending
router.get('/', requestController.list);

// GET /api/requests/:requestId
router.get('/:requestId', requestController.getDetail);

// PATCH /api/requests/:requestId/approve
router.patch('/:requestId/approve', requestController.approve);

// PATCH /api/requests/:requestId/reject
router.patch('/:requestId/reject', requestController.reject);

export default router;
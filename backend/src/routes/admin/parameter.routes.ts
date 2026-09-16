import { Router } from 'express';
import { getAllParameters, updateParameter, updateParameters } from '../../controllers/admin/parameter.controller.js';
import { protect, adminOnly } from '../../middlewares/auth.middleware.js';

const router = Router();

// Toàn bộ route admin parameters yêu cầu đăng nhập và role ADMIN
router.use(protect, adminOnly);

// #41new: GET /api/admin/parameters
router.get('/', getAllParameters);

router.patch('/', updateParameters);

// #42new: PATCH /api/admin/parameters/:parameterID
router.patch('/:parameterID', updateParameter);

export default router;

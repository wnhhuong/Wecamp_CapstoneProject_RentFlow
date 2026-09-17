import { Router } from 'express';
import { UserProfileController } from '../../controllers/user/profile.controller.js';
import { protect, userOnly } from '../../middlewares/auth.middleware.js';

const router = Router();

// Toàn bộ API profile yêu cầu đăng nhập
router.use(protect, userOnly);

// #17: GET /api/user/profile
router.get('/', UserProfileController.getProfile);

// PATCH & PUT /api/user/profile
router.patch('/', UserProfileController.updateProfile);
router.put('/', UserProfileController.updateProfile);

export default router;
import { Router } from 'express';
import { AdminRoomController } from '../../controllers/admin/room.controller.js';
import { protect, adminOnly } from '../../middlewares/auth.middleware.js';
import upload from '../../middlewares/upload.middleware.js';

const router = Router();

// Middleware bảo vệ route admin
router.use(protect, adminOnly);

router.post(
  '/',
  upload("rooms").array('images', 4),
  AdminRoomController.createRoom
);

router.patch(
  '/:roomID/account/password',
  AdminRoomController.prepareRoomAccount
);

export default router;
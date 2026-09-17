import { Router } from 'express';
import { TenantContractController } from '../../controllers/user/contract.controller.js';
import { protect, userOnly } from '../../middlewares/auth.middleware.js';

const router = Router();

// Toàn bộ API contract yêu cầu đăng nhập
router.use(protect, userOnly);

// #19: GET /api/user/contract
router.get('/', TenantContractController.getActiveContract);    

// #20: GET /api/user/contract/signature
router.get('/signature', TenantContractController.getContractSignature);

export default router;
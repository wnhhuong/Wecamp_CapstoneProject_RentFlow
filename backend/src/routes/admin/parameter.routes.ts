import { Router } from 'express';
import { getAllParameters, rememberBankQrPath, updateParameter, updateParameters, uploadBankQrImage } from '../../controllers/admin/parameter.controller.js';
import upload from '../../middlewares/upload.middleware.js';
import { protect, adminOnly } from '../../middlewares/auth.middleware.js';

const router = Router();

// Toàn bộ route admin parameters yêu cầu đăng nhập và role ADMIN
router.use(protect, adminOnly);

// #41new: GET /api/admin/parameters
router.get('/', getAllParameters);

router.patch('/', updateParameters);

// POST /api/admin/parameters/bank-qr — đặt TRƯỚC ':parameterID' để không bị nuốt
router.post('/bank-qr', rememberBankQrPath, upload('bank-qr').single('image'), uploadBankQrImage);

// #42new: PATCH /api/admin/parameters/:parameterID
router.patch('/:parameterID', updateParameter);

export default router;

import { Router } from 'express';
import { getAdminInvoiceList, getAdminInvoiceDetail } from '../../controllers/admin/invoice.controller.js';
import { protect, adminOnly } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(protect, adminOnly);

// #34 — GET /api/admin/invoices
router.get('/', getAdminInvoiceList);

// #35 — GET /api/admin/invoices/:invoiceID
router.get('/:invoiceID', getAdminInvoiceDetail);

export default router;
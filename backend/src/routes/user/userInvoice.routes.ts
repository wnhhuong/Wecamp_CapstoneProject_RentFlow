import { Router } from "express";
import { protect, userOnly, withUserAuth } from "../../middlewares/auth.middleware.js";
import { getInvoiceDetail, getInvoiceList } from "../../controllers/user/invoice.controller.js";

const userInvoiceRouter = Router();
userInvoiceRouter.use(protect);
userInvoiceRouter.use(userOnly);

userInvoiceRouter.get('/invoices', withUserAuth(getInvoiceList));
userInvoiceRouter.get('/invoices/:invoiceID', withUserAuth(getInvoiceDetail));

export default userInvoiceRouter;
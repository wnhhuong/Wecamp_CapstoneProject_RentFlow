import { Router } from "express";
import { protect, userOnly, withUserAuth } from "../../middlewares/auth.middleware.js";
import { getInvoiceDetail, getInvoiceList, submitPaidRequest } from "../../controllers/user/invoice.controller.js";

const userInvoiceRouter = Router();
userInvoiceRouter.use(protect);
userInvoiceRouter.use(userOnly);

userInvoiceRouter.get('/', withUserAuth(getInvoiceList));
userInvoiceRouter.get('/:invoiceID', withUserAuth(getInvoiceDetail));
userInvoiceRouter.post('/:invoiceID/paid-request', withUserAuth(submitPaidRequest));

export default userInvoiceRouter;
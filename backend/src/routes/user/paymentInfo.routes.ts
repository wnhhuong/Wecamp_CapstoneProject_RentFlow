import { Router } from "express";

import { getPaymentInfo } from "../../controllers/user/paymentInfo.controller.js";
import { protect, userOnly } from "../../middlewares/auth.middleware.js";

const userParameterRouter = Router();
userParameterRouter.use(protect);
userParameterRouter.use(userOnly);

userParameterRouter.get('/', getPaymentInfo);

export default userParameterRouter;

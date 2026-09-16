import { Router } from "express";
import { protect, userOnly, withUserAuth } from "../../middlewares/auth.middleware.js";
import { getRequestDetails, getRequestList } from "../../controllers/user/viewRequest.controller.js";

const userRequestRouter = Router();
userRequestRouter.use(protect);
userRequestRouter.use(userOnly);

userRequestRouter.get('/', withUserAuth(getRequestList));
userRequestRouter.get('/:requestID', withUserAuth(getRequestDetails));

export default userRequestRouter;
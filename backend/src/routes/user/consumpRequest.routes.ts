import { Router } from "express";
import { protect, userOnly, withUserAuth } from "../../middlewares/auth.middleware.js";
import { consumpContext, createConsumpRequest, viewConsumpRequest } from "../../controllers/user/consumpRequest.controller.js";
import upload from "../../middlewares/upload.middleware.js";

const consumpRequestRouter = Router();
consumpRequestRouter.use(protect);
consumpRequestRouter.use(userOnly);

consumpRequestRouter.get('/consumption-requests/context', withUserAuth(consumpContext));
consumpRequestRouter.post('/consumption-requests', upload("consumption").single("image"), withUserAuth(createConsumpRequest));
consumpRequestRouter.get('/consumption-requests/:requestID', withUserAuth(viewConsumpRequest));

export default consumpRequestRouter;
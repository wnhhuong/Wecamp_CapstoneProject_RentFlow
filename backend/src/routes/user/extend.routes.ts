import { Router } from 'express';
import { protect, userOnly, withUserAuth } from '../../middlewares/auth.middleware.js';
import { createExtendRequestController } from '../../controllers/user/extend.controller.js';

const extendRouter = Router();

extendRouter.use(protect, userOnly);
extendRouter.post('/', withUserAuth(createExtendRequestController));

export default extendRouter;

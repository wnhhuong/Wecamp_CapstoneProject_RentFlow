import { Router } from 'express';
import { protect, userOnly, withUserAuth } from '../../middlewares/auth.middleware.js';
import upload from '../../middlewares/upload.middleware.js';
import { createCheckoutRequestController } from '../../controllers/user/checkout.controller.js';

const checkoutRouter = Router();

checkoutRouter.use(protect, userOnly);
checkoutRouter.post('/', upload('checkout').single('finalImage'), withUserAuth(createCheckoutRequestController));

export default checkoutRouter;

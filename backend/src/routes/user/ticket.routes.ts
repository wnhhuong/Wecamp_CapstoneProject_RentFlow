import { Router } from "express";
import { protect, userOnly, withUserAuth } from "../../middlewares/auth.middleware.js";
import { createRepairTicket, getAllTickets, getRepairOptions } from "../../controllers/user/ticket.controller.js";
import upload from "../../middlewares/upload.middleware.js";

const userTicketRouter = Router();
userTicketRouter.use(protect);
userTicketRouter.use(userOnly);

userTicketRouter.get('/', withUserAuth(getAllTickets));
userTicketRouter.get('/repair/options', withUserAuth(getRepairOptions));
userTicketRouter.post('/repair', upload("repair").single("image"), withUserAuth(createRepairTicket));


export default userTicketRouter;
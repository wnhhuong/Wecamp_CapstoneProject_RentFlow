import { Router } from "express";
import { protect, userOnly, withUserAuth } from "../../middlewares/auth.middleware.js";
import { createComplainTicket, createRepairTicket, getAllTickets, getComplainOptions, getRepairOptions } from "../../controllers/user/ticket.controller.js";
import upload from "../../middlewares/upload.middleware.js";

const userTicketRouter = Router();
userTicketRouter.use(protect);
userTicketRouter.use(userOnly);

userTicketRouter.get('/', withUserAuth(getAllTickets));
userTicketRouter.get('/repairs/options', withUserAuth(getRepairOptions));
userTicketRouter.post('/repairs', upload("repair").single("image"), withUserAuth(createRepairTicket));
userTicketRouter.get('/complains/options', withUserAuth(getComplainOptions));
userTicketRouter.post('/complains', withUserAuth(createComplainTicket));


export default userTicketRouter;
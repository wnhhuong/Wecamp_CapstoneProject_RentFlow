import { Router } from "express";
import { protect, userOnly, withUserAuth } from "../../middlewares/auth.middleware.js";
import { getAllTickets } from "../../controllers/user/ticket.controller.js";

const userTicketRouter = Router();
userTicketRouter.use(protect);
userTicketRouter.use(userOnly);

userTicketRouter.get('/', withUserAuth(getAllTickets));

export default userTicketRouter;
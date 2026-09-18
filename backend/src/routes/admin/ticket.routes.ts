import { Router } from "express";
import { getAllTicketsAdmin, updateTicketStatus } from "../../controllers/admin/ticket.controller.js";
import { protect, adminOnly, withAdminAuth } from "../../middlewares/auth.middleware.js";

const adminTicketRouter = Router();

adminTicketRouter.get("/", protect, adminOnly, withAdminAuth(getAllTicketsAdmin));
adminTicketRouter.patch("/:ticketID/status", protect, adminOnly, withAdminAuth(updateTicketStatus));

export default adminTicketRouter;
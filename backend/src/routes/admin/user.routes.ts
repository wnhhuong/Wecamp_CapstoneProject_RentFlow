import { Router } from "express";
import { getUsers } from "../../controllers/admin/user.controller.js";
import { protect, adminOnly, withAdminAuth } from "../../middlewares/auth.middleware.js";

const adminUserRouter = Router();

adminUserRouter.get("/", protect, adminOnly, withAdminAuth(getUsers));

export default adminUserRouter;
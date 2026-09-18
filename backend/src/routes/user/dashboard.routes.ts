import { Router } from "express";
import { protect, userOnly, withUserAuth } from "../../middlewares/auth.middleware.js";
import { getDashboard } from "../../controllers/user/dashboard.controller.js";

const userDashboard = Router();
userDashboard.use(protect);
userDashboard.use(userOnly);

userDashboard.get('/', withUserAuth(getDashboard));

export default userDashboard;
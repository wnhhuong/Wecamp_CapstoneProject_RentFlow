import { Router } from "express";
import { firstLoginProfile, loginUser } from "../controllers/auth.controller.js";
import { onboardingOnly } from "../middlewares/auth.middleware.js";

const authRouter = Router();

authRouter.post("/login", loginUser);
authRouter.post("/first-login/profile", onboardingOnly, firstLoginProfile);


export default authRouter;
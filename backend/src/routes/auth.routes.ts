import { Router } from "express";
import { contractPreview, firstLoginProfile, loginUser } from "../controllers/auth.controller.js";
import { onboardingOnly } from "../middlewares/auth.middleware.js";

const authRouter = Router();

authRouter.post("/login", loginUser);
authRouter.post("/first-login/profile", onboardingOnly, firstLoginProfile);
authRouter.get("/first-login/contract-preview", onboardingOnly, contractPreview);


export default authRouter;
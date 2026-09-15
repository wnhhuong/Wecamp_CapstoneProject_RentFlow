import { Router } from "express";
import { contractPreview, createContract, firstLoginProfile, loginUser } from "../controllers/auth.controller.js";
import { onboardingOnly } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";

const authRouter = Router();

authRouter.post("/login", loginUser);
authRouter.post("/first-login/profile", onboardingOnly, firstLoginProfile);
authRouter.get("/first-login/contract-preview", onboardingOnly, contractPreview);
authRouter.post("/first-login/contract", onboardingOnly, upload("signatures").single("signature"), createContract);


export default authRouter;
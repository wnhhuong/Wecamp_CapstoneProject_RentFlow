import { Router } from "express";
import { getParameters, getPublicRoom } from "../controllers/guest.controller.js";

const guessRouter = Router();

guessRouter.get("/parameters", getParameters)
guessRouter.get("/rooms", getPublicRoom)
// guessRouter.get("/rooms/:roomID", getPublicRoomDetails)

export default guessRouter;
import { Router } from "express";
import { getParameters, getPublicRoom, getPublicRoomDetails } from "../controllers/guest.controller.js";

const guestRouter = Router();

guestRouter.get("/parameters", getParameters)
guestRouter.get("/rooms", getPublicRoom)
guestRouter.get("/rooms/:roomID", getPublicRoomDetails)

export default guestRouter;
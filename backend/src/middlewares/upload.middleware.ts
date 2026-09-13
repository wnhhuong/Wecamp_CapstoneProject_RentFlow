import multer from "multer";
import { createStorage, MAX_FILE_SIZE } from "../config/multer.js";

const upload = (folder: string) => multer({
    storage: createStorage(folder),
    limits: {
        fileSize: MAX_FILE_SIZE
    }
});

export default upload;
// To use in route
// router.post(route, upload("folder_name").single("image"), controller)
// eg: roomRouter.post("/rooms", upload("rooms").single("image"), createRoom)
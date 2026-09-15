import multer from "multer";
import { createStorage, MAX_FILE_SIZE } from "../config/multer.js";

const upload = (folder: string) =>
  multer({
    storage: createStorage(folder),
    limits: {
      fileSize: MAX_FILE_SIZE,
    },
    fileFilter: (_req, file, cb) => {
      const allowedMimes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Only image files (PNG, JPG, JPEG, WEBP) are allowed!"));
      }
    },
  });

export default upload;
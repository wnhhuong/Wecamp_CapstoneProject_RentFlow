import multer from "multer";
import path from "path";
import fs from "fs";

export const createStorage = (folder: string) => {
    return multer.diskStorage({
        destination: (_req, _file, cb) => {
            
            const uploadPath = path.join("uploads", folder);
            fs.mkdirSync(uploadPath, { recursive: true });

            cb(null, uploadPath);
        },

        filename: (_req, file, cb) => {
            cb(null, `${Date.now()}-${file.originalname}`);
        }
    });
};

export const MAX_FILE_SIZE = 5 * 1024 * 1024;

import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../utils/response.js";

// Global Error Handler
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error(`[Unhandled Error] ${req.method} ${req.originalUrl}:`, err);

  res.status(500).json({
    success: false,
    data: null,
    message: "Internal server error",
  } satisfies ApiResponse<null>);
};

// To use: in the last catch block of each try-catch controller, use next(error)
// eg:
// export const loginUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//   try {
//     // ... logic & predicted error
//   } catch (error) {
//     next(error); // other error - global handle
//   }
// };
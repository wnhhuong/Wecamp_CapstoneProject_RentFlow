import { Response } from "express";

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string | null;
}

export const sendSuccess = <T>(res: Response, data: T, status = 200) => {
  res.status(status).json({ success: true, data, message: null } satisfies ApiResponse<T>);
};

export const sendError = (res: Response, status: number, message: string) => {
  res.status(status).json({ success: false, data: null, message } satisfies ApiResponse<null>);
};
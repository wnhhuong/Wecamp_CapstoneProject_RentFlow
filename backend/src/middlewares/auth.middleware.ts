// middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { sendError } from "../utils/response.js";

// ---- payload shape khớp với utils/token.ts ----
type AccessPayload =
  | { role: "admin"; accountID: string }
  | { role: "user"; accountID: string; roomID: string; contractID: string; userID: string; startDate: string };

type OnboardingPayload = {
  accountID: string;
  userID?: string;
};

// ---- request đã "gắn thêm" field ----
export interface AuthRequest extends Request {
  auth?: AccessPayload;
}

export interface OnboardingRequest extends Request {
  onboarding?: OnboardingPayload;
}

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.split(" ")[1];
}

function verify(token: string): any {
  return jwt.verify(token, process.env.JWT_SECRET as string);
}

// ---- access token: đã login xong ----
export const protect = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const token = extractBearer(req);
    if (!token) { sendError(res, 401, "Not authorized, not token"); return; }

    try {
        const payload = verify(token);
        if (payload.type !== "access") { sendError(res, 401, "Invalid token type"); return; }

        req.auth = payload.role === "admin"
        ? { role: "admin", accountID: payload.accountID }
        : {
            role: "user",
            accountID: payload.accountID,
            roomID: payload.roomID,
            contractID: payload.contractID,
            userID: payload.userID,
            startDate: payload.startDate,
            };
        next();
    } catch {
        sendError(res, 401, "Invalid or expired token");
    }
};

export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (req.auth?.role !== "admin") { sendError(res, 403, "Admin access required"); return; }
    next();
};

export const userOnly = (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (req.auth?.role !== "user") { sendError(res, 403, "User access required"); return; }
    next();
};

// ---- onboarding token: đang trong flow first-login ----
export const onboardingOnly = (req: OnboardingRequest, res: Response, next: NextFunction): void => {
    const token = extractBearer(req);
    if (!token) { sendError(res, 401, "No onboarding token"); return; }

    try {
        const payload = verify(token);
        if (payload.type !== "onboarding") { sendError(res, 401, "Invalid token type"); return; }

        req.onboarding = { accountID: payload.accountID, userID: payload.userID };
        next();
    } catch {
        sendError(res, 401, "Onboarding session expired, please login again");
    }
};

export const requireProfileDone = (req: OnboardingRequest, res: Response, next: NextFunction): void => {
  if (!req.onboarding?.userID) {
    sendError(res, 400, "Please complete your profile first");
    return;
  }
  next();
};
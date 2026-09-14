import jwt from "jsonwebtoken";
import type { StringValue } from "ms";

type AccessPayload = 
  | { role: "admin"; accountID: string }
  | {
      role: "user";
      accountID: string;
      roomID: string;
      contractID: string;
      userID: string;
      startDate: string;
    };

export const generateAccessToken = (payload: AccessPayload) => {
  return jwt.sign({ ...payload, type: "access" }, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRES_IN as StringValue,
  });
};

type OnboardingPayload = {
  type: "onboarding";
  accountID: string;
  userID?: string; // chưa có ở bước login, có sau bước profile
};

export const generateOnboardingToken = (accountID: string, userID?: string) => {
  return jwt.sign(
    { accountID, userID, type: "onboarding" } satisfies OnboardingPayload,
    process.env.JWT_SECRET as string,
    { expiresIn: process.env.ONBOARDING_TOKEN_EXPIRES_IN as StringValue }
  );
};
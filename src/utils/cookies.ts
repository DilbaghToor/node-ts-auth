import { CookieOptions, Response } from "express";
import { fifteenMintuesFromNow, thirtyDaysFromNow } from "./date";

const secure = process.env.NODE_ENV === "development";

export const REFRESH_TOKEN = "/auth/refresh";

const defaults: CookieOptions = {
  sameSite: "strict",
  httpOnly: true,
  secure,
};

const getAccessTokenCookieOptions = (): CookieOptions => ({
  ...defaults,
  expires: fifteenMintuesFromNow(),
});

const getRefreshTokenCookieOptions = (): CookieOptions => ({
  ...defaults,
  expires: thirtyDaysFromNow(),
  path: REFRESH_TOKEN,
});

type Param = {
  res: Response;
  accessToken: string;
  refreshToken: string;
};

export const setAuthCookies = ({ res, accessToken, refreshToken }: Param) =>
  res
    .cookie("accessToken", accessToken, getAccessTokenCookieOptions())
    .cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions());


  
export const clearAuthCookie = (res: Response) => res.clearCookie("accessToken").clearCookie("refreshToken", {
  path: REFRESH_TOKEN
});

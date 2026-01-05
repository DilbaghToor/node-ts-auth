import { APP_ORIGIN, JWT_REFRESH_SECRET, JWT_SECRET } from "../constants/env";
import {
  CONFLICT,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  TOO_MANY_REQUESTS,
  UNAUTHORIZED,
} from "../constants/http";
import VerificationCodeType from "../constants/verification.code.types";
import { SessionModel } from "../models/session.model";
import { User } from "../models/user.model";
import { VerificationCodeModel } from "../models/verification.code.model";
import appAssert from "../utils/appAssert";
import { fiveMinutesAgo, ONE_DAY_MS, oneHourFromNow, oneYearFromNow, thirtyDaysFromNow } from "../utils/date";
import jwt from "jsonwebtoken";
import {
  RefreshTokenPayload,
  refreshTokenSignOptions,
  signToken,
  verifyToken,
} from "../utils/jwt";
import { sendEmail } from "../utils/send.mail";
import { getPasswordResetTemplate, getVerifyEmailTemplate } from "../utils/email.template";
import { hashValue } from "../utils/bcrypt";

export type CreateAccountParams = {
  name: string;
  email: string;
  password: string;
  userAgent?: string;
};

export const createAccount = async (data: CreateAccountParams) => {
  /** verify existing user does not exist */
  const existingUser = await User.exists({
    email: data.email,
  });

  appAssert(!existingUser, CONFLICT, "Email already exist");

  /** create user */
  const user = await User.create({
    name: data.name,
    email: data.email,
    password: data.password,
  });

  /** create verification code */
  const verificationCode = await VerificationCodeModel.create({
    userId: user._id,
    type: VerificationCodeType.EmailVerification,
    expiresAt: oneYearFromNow(),
  });

  /** send verification  email */
  const url = `${APP_ORIGIN}/auth/email/verified/${verificationCode._id}`;

  const { error } = await sendEmail({
    to: user.email,
    ...getVerifyEmailTemplate(url),
  });

  if (error) {
    console.log(error);
  }

  /** create sessions */
  const session = await SessionModel.create({
    userId: user._id,
    userAgent: data.userAgent,
  });

  /** sign access token & refresh token */
  const refreshToken = signToken(
    { sessionId: session._id },
    refreshTokenSignOptions
  );

  const accessToken = signToken({ userId: user._id, sessionId: session._id });

  /** return user & token */
  return { user: user.omitPassword(), accessToken, refreshToken };
};

export type LoginParams = {
  email: string;
  password: string;
  userAgent?: string;
};

export const loginUser = async ({
  email,
  password,
  userAgent,
}: LoginParams) => {
  /** get the user by email */
  const user = await User.findOne({ email });

  appAssert(user, UNAUTHORIZED, "Invalid Email or password");

  /** validate password from the request */
  const isValid = user.comparePassword(password);

  appAssert(isValid, UNAUTHORIZED, "Invalid email or password");

  const userId = user._id;

  /** create a session */
  const session = await SessionModel.create({
    userId,
    userAgent,
  });

  const sessionInfo = {
    sessionId: session._id,
  };

  /** sign access token & refresh token */
  const refreshToken = signToken(sessionInfo, refreshTokenSignOptions);

  jwt.sign(sessionInfo, JWT_REFRESH_SECRET, {
    audience: ["user"],
    expiresIn: "30d",
  });

  const accessToken = signToken({
    ...sessionInfo,
    userId: user._id,
  });

  /** return user & token */
  return {
    user: user.omitPassword(),
    accessToken,
    refreshToken,
  };
};

export const refreshUserAccessToken = async (refreshToken: string) => {
  const { payload } = verifyToken<RefreshTokenPayload>(refreshToken, {
    secret: refreshTokenSignOptions.secret,
  });

  appAssert(payload, UNAUTHORIZED, "Invalid refesh Token");

  const session = await SessionModel.findById(payload.sessionId);

  appAssert(
    session && session.expiresAt.getTime() > Date.now(),
    UNAUTHORIZED,
    "Session expired"
  );

  /**refresh the session if it expires in next 24 hours */
  const sessionNeedsRefresh =
    session.expiresAt.getTime() - Date.now() <= ONE_DAY_MS;

  if (sessionNeedsRefresh) {
    session.expiresAt = thirtyDaysFromNow();
    session.save();
  }

  const newRefreshToken = sessionNeedsRefresh
    ? signToken(
        {
          sessionId: session._id,
        },
        refreshTokenSignOptions
      )
    : undefined;

  const accessToken = signToken({
    userId: session.userId,
    sessionId: session._id,
  });

  return {
    accessToken,
    newRefreshToken,
  };
};

export const verifyEmail = async (code: string) => {
  //get the verification code
  const validCode = await VerificationCodeModel.findOne({
    _id: code,
    type: VerificationCodeType.EmailVerification,
    expiresAt: { $gt: new Date() },
  });

  appAssert(validCode, NOT_FOUND, "Invalid or Expired code");

  //get user by id
  const updateUser = await User.findByIdAndUpdate(
    validCode.userId,
    {
      verified: true,
    },
    { new: true }
  );

  appAssert(updateUser, INTERNAL_SERVER_ERROR, "Failed to verify email");

  await validCode.deleteOne();

  return updateUser.omitPassword();
};

export const sendPasswordResetEmail = async (email: string) => {
  // get user by email
  const user = await User.findOne({email});

  appAssert(user, NOT_FOUND, "User not found");

  const fiveMintsAgo = fiveMinutesAgo();

  //check email rate limit
  const count = await VerificationCodeModel.countDocuments({
    userId: user._id,
    type: VerificationCodeType.PasswordReset,
    expiresAt: { $gt: fiveMintsAgo}
  })


  appAssert(count <= 1, TOO_MANY_REQUESTS, "Too many request. please try again later");
 
  //create verification code
  const expiresAt = oneHourFromNow();

  const verifyCode = await VerificationCodeModel.create({
    userId: user._id,
    type: VerificationCodeType.PasswordReset,
    expiresAt
  });

  //send verification email
  const url = `${APP_ORIGIN}/password/reset?code=${verifyCode._id}&exp=${expiresAt.getTime()}`;

  const {data, error } = await sendEmail({
    to: user.email,
    ...getPasswordResetTemplate(url)
  });

  appAssert(data?.id, INTERNAL_SERVER_ERROR, `${error?.name} - ${error?.message}`);

  return {
    url,
    emailId: data.id,
  }
};

type ResetPasswordParams = {
  verificationCode: string,
  password: string
}

export const resetPassword = async ({password, verificationCode} : ResetPasswordParams) => {

  /** verify code */
  const validCode = await VerificationCodeModel.findOne({
    _id: verificationCode,
    type: VerificationCodeType.PasswordReset,
    expiresAt: { $gt: Date.now( )}
  });

  appAssert(validCode, NOT_FOUND, "Invalid or expired verification code");

  /** update password */
  const updateUser = await User.findByIdAndUpdate(validCode.userId, {
    password: await hashValue(password)
  });

  appAssert(updateUser, INTERNAL_SERVER_ERROR, "Failed to reset password");

  await validCode.deleteOne();


  await SessionModel.deleteMany({
    userId: updateUser._id
  });

  return {
    user: updateUser.omitPassword(),
  }




}





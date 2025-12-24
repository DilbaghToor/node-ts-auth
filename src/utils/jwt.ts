import jwt, { SignOptions } from "jsonwebtoken";
import { SessionDoc } from "../models/session.model";
import { UserDoc } from "../interface/user.interface";
import { JWT_REFRESH_SECRET, JWT_SECRET } from "../constants/env";



export type RefreshTokenPayload = {
    sessionId : SessionDoc['_id'];
}

export type AccessTokenPayload = {
    sessionId : SessionDoc['_id'];
    userId : UserDoc["_id"];
}

type SignOptionsAndSecret = SignOptions & {
    secret : string;
}

const defaults : SignOptions = {
    audience : ["user"]
}

const accessTokenSignOptions :  SignOptionsAndSecret = {
    expiresIn : "15m",
    secret : JWT_SECRET
}

export const refreshTokenSignOptions : SignOptionsAndSecret = {
    expiresIn : "30m",
    secret : JWT_REFRESH_SECRET
}

export const signToken = (
    payload: AccessTokenPayload | RefreshTokenPayload,
    options?: SignOptionsAndSecret
) => {
    const { secret, ...signOpts } = options || accessTokenSignOptions;
    return jwt.sign(payload, secret, {
        ...defaults,
        ...signOpts,
    });
}





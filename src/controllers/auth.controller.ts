import { verify } from "node:crypto";
import { CREATED, OK } from "../constants/http";
import { createAccount, loginUser } from "../services/auth.service";
import catchErrors from "../utils/catch.errors";
import { clearAuthCookie, setAuthCookies } from "../utils/cookies";
import { loginSchema, registerSchema } from "./auth.schemas";
import { verifyToken } from "../utils/jwt";
import { SessionModel } from "../models/session.model";



export const registerHandler = catchErrors( async (req, res) => {
        /** validate request */
        const request = registerSchema.parse({
            ...req.body,
            userAgent: req.headers["user-agent"],
        });

        /** service call */
        const { user, accessToken, refreshToken } = await createAccount(request);

        /** set response auth cookiess */
        return setAuthCookies({res, accessToken, refreshToken })
        .status(CREATED).json(user);
});

export const loginHandler = catchErrors( async(req , res) => {
    const request = loginSchema.parse({
        ...req.body, 
        userAgent: req.headers["user-agent"], 
        });

    const  { user, accessToken, refreshToken} = await loginUser(request);

    return setAuthCookies({res, accessToken, refreshToken}).status(OK).json(user);
});


export const logoutHandler = catchErrors(async (req, res) => {

        const accessToken = req.cookies.accessToken as string || undefined;
        const { payload } = verifyToken(accessToken || "");

        if(payload) {
            SessionModel.findByIdAndDelete(payload.sessionId);
        }

        return clearAuthCookie(res).status(OK).json({
            message : "Logout Successfully"
        })

});








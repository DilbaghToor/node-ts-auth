
import { NOT_FOUND, OK } from "../constants/http";
import { User } from "../models/user.model";
import appAssert from "../utils/appAssert";
import catchErrors from "../utils/catch.errors";

export const getUserHandler = catchErrors(async(req, res) => {
    const user = await User.findById(req.userId);

    appAssert(user, NOT_FOUND, "User not found");

   return res.status(OK).json(user.omitPassword());
});
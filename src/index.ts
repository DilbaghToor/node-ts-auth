import * as dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import connectToDatabase from "./config/db";
import { APP_ORIGIN, NODE_ENV } from "./constants/env";
import cookieParser from "cookie-parser";
import errorHandler from "./middleware/error.handler";
import catchErrors from "./utils/catch.errors";
import { OK } from "./constants/http";
import authRoutes from "./routes/auth.routes";
import authenticate from "./middleware/authenticate";
import userRoutes from "./routes/user.routes";

const app = express();
const port = process.env.PORT || 8000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: APP_ORIGIN,
    credentials: true,
  })
);
app.use(cookieParser());

app.get("/", (req, res, next) => {
  return res.status(OK).json({ status: "healthly" });
});

/** auth routes */
app.use("/auth", authRoutes);

/** protected routes */
app.use("/user", authenticate, userRoutes);

app.use(errorHandler);

app.listen(port, async () => {
  console.log(`Server is running on port ${port} in ${NODE_ENV} environment.`);
  connectToDatabase();
});

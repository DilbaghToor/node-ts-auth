 import mongoose from "mongoose";
 import VerificationCodeType from "../constants/verification.code.types";

 export interface VerificationCodeDoc extends  mongoose.Document {
    userId: mongoose.Types.ObjectId;
    type: VerificationCodeType;
    expiresAt: Date;
    createdAt: Date;
 }

 const verificationCodeSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    type: { type: String, required: true},
    createdAt: {type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true},
 });

 export const VerificationCodeModel = mongoose.model<VerificationCodeDoc>(
    "VerificationCode",
    verificationCodeSchema,
    "verification_codes"
 );

 
import mongoose from "mongoose";


export interface UserDoc extends mongoose.Document {
    name: string,
    email: string,
    password: string,
    verified: boolean,
    createdAt: Date,
    updatedAt: Date,
    comparePassword(val: string): Promise<boolean>;
    omitPassword(): Pick <UserDoc,
    "_id" | "email" | "createdAt" | "updatedAt"
    >;

}

export interface UserModal extends mongoose.Model<UserDoc> {}
import mongoose from "mongoose";
import { hashValue, compareValue } from "../utils/bcrypt";
import { UserDoc, UserModal } from "../interface/user.interface";

const schema = new mongoose.Schema({
    email: { type: String, unique:true, required:true},
    name: { type:String, required: true},
    password: {type:String, required: true },
    verified: { type: Boolean, required: true, default: false},
   

},
{
    timestamps: true
}
);


schema.pre("save", async function() {

    if(!this.isModified("password")) {
        return;
    }

    this.password = await hashValue(this.password);
});

schema.methods.comparePassword = async function(val: string) {
    return compareValue(val, this.password);
}

schema.methods.omitPassword = function () {
    const user = this.toObject();
    delete user.password;
    return user;
}

export const User = mongoose.model<UserDoc, UserModal>("User", schema);
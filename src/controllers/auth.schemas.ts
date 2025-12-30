import { z } from "zod";

const emailSchema =  z.string().email().max(255);
const passwordSchema = z.string().min(6).max(255);
const userAgentSchema = z.string().optional();

export const loginSchema = z.object({
    email : emailSchema,
    password : passwordSchema,
    userAgent : userAgentSchema
});



export const registerSchema = loginSchema.extend({
    name:  z.string().min(1).max(255),
    confirmPassword: passwordSchema,
}).refine(
    (data) => data.password === data.confirmPassword, {
        message: "Password do not match",
        path: ["confirmPassword"],
    });
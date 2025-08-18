import { verify } from "crypto";
import "dotenv/config";
import process from "process";

export const config = {
    PORT: process.env.PORT || 3008,
    provider: process.env.provider,
    jwtToken: process.env.jwtToken,
    numberId: process.env.numberId,
    verifyToken: process.env.verifyToken,
    version: "v20.0",

    openAiKey: process.env.openAi,
    assistaint: process.env.assistaint
    
}
import crypto from "crypto";
import { Config } from "../config/Config";

export class Utilities
{
    public static id(prefix: string): string
    {
        return `${prefix}_${crypto.randomBytes(Config.ID_BYTE_LENGTH).toString("hex")}`;
    }
}
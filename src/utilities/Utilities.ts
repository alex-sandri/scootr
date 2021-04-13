import crypto from "crypto";
import { ILocation } from "../common/ILocation";
import { Config } from "../config/Config";

export class Utilities
{
    public static id(prefix: string): string
    {
        return `${prefix}_${crypto.randomBytes(Config.ID_BYTE_LENGTH).toString("hex")}`;
    }

    public static formatLocationForDatabase(location: ILocation): string
    {
        return `srid=4326;point(${location.longitude} ${location.latitude})`;
    }

    public static parseLocationFromDatabase(location: string): ILocation
    {
        return {
            latitude: parseFloat(location.split(";")[1]),
            longitude: parseFloat(location.split(";")[0]),
        };
    }
}
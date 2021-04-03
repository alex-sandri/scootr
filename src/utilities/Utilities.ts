import cuid from "cuid";

export class Utilities
{
    public static id(prefix: string): string
    {
        return `${prefix}_${cuid()}`;
    }
}
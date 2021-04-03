import Stripe from "stripe";

export class Config
{
    public static readonly USER_MIN_AGE = 18;

    public static readonly ID_PREFIXES = {
        USER: "usr",
    } as const;

    public static readonly STRIPE = new Stripe(process.env.STRIPE_SECRET_API_KEY ?? "", { apiVersion: "2020-08-27" });
}
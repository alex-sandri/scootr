import Stripe from "stripe";

export class Config
{
    public static readonly IS_PRODUCTION = process.env.NODE_ENV === "production";

    public static readonly ID_PREFIXES = {
        USER: "usr",
        WALLET: "wlt",
        PAYMENT_METHOD: "pmt",
        VEHICLE: "vcl",
        RIDE: "rid",
        SESSION: "ses",
        SIGN_IN_REQUEST: "sir",
    } as const;

    public static readonly ID_BYTE_LENGTH = 30;

    /**
     * @default
     * 
     * 30 days
     */
    public static readonly SESSION_DURATION = 60 * 60 * 24 * 30;

    public static readonly RIDE_FIXED_COST = 1;
    public static readonly RIDE_COST_PER_MINUTE = 0.2;
    public static readonly WALLET_MIN_BALANCE_TO_START_RIDE = 5;

    public static readonly STRIPE = new Stripe(process.env.STRIPE_SECRET_API_KEY ?? "", { apiVersion: "2020-08-27" });

    public static readonly API_HOST = Config.IS_PRODUCTION
        ? "https://api.example.com"
        : `http://localhost:${process.env.PORT}`;

    public static readonly CLIENT_HOST = Config.IS_PRODUCTION
        ? "https://example.com"
        : "https://localhost:4200";

}
import Stripe from "stripe";

export class Config
{
    public static readonly IS_PRODUCTION = process.env.NODE_ENV === "production";

    /**
     * @default
     * 
     * 30 days
     */
    public static readonly SESSION_DURATION = 60 * 60 * 24 * 30;

    /**
     * @default
     * 
     * 5 minutes
     */
    public static readonly SIGN_IN_REQUEST_DURATION = 60 * 5;

    public static readonly SIGN_IN_REQUEST_TOKEN_BYTES = 60;

    public static readonly USER_MIN_AGE = 18;

    public static readonly ID_PREFIXES = {
        USER: "usr",
        WALLET: "wlt",
        PAYMENT_METHOD: "pmt",
        VEHICLE: "vcl",
        RIDE: "rid",
        SESSION: "ses",
        SIGN_IN_REQUEST: "sir",
    } as const;

    public static readonly STRIPE = new Stripe(process.env.STRIPE_SECRET_API_KEY ?? "", { apiVersion: "2020-08-27" });

    public static readonly API_HOST = Config.IS_PRODUCTION
        ? "https://api.example.com"
        : `http://localhost:${process.env.PORT}`;

    public static readonly CLIENT_HOST = Config.IS_PRODUCTION
        ? "https://example.com"
        : "https://localhost:4200";

}
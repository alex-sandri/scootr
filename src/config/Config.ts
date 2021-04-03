import Stripe from "stripe";

export class Config
{
    public static readonly PREFISSI_ID = {
        UTENTE: "usr",
    } as const;

    public static readonly STRIPE = new Stripe(process.env.STRIPE_SECRET_API_KEY ?? "", { apiVersion: "2020-08-27" });
}
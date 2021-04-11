import Boom from "@hapi/boom";
import Joi from "joi";
import { Schema } from "../config/Schema";
import Database from "../utilities/Database";
import { ISerializedWallet, Wallet } from "./Wallet";

interface IDatabasePaymentMethod
{
    id: string,
    type: string,
    data: any,
    wallet: string,
    stripe_id: string,
}

export interface ISerializedPaymentMethod
{
    id: string,
    type: string,
    data: any,
    wallet: ISerializedWallet,
}

export class PaymentMethod
{
    private constructor
    (
        public readonly id: string,
        public readonly type: string,
        public readonly data: any,
        public readonly wallet: Wallet,
        public readonly stripe_id: string,
    )
    {}

    //////////
    // CRUD //
    //////////

    public static async retrieve(id: string): Promise<PaymentMethod>
    {
        const result = await Database.pool
            .query(
                `select * from "payment_methods" where "id" = $1`,
                [ id ],
            );

        if (result.rowCount === 0)
        {
            throw Boom.notFound();
        }

        return PaymentMethod.deserialize(result.rows[0]);
    }

    ///////////////
    // UTILITIES //
    ///////////////

    public static async retrieveWithStripeId(id: string): Promise<PaymentMethod>
    {
        const result = await Database.pool
            .query(
                `select * from "payment_methods" where "stripe_id" = $1`,
                [ id ],
            );

        if (result.rowCount === 0)
        {
            throw Boom.notFound();
        }

        return PaymentMethod.deserialize(result.rows[0]);
    }

    public static async retrieveDefault(wallet: Wallet): Promise<PaymentMethod | null>
    {
        const result = await Database.pool
            .query(
                `
                select "p".*
                from
                    "default_payment_methods" as "dp"
                    inner join
                    "payment_methods" as "p"
                    on "p"."id" = "dp"."payment_method"
                where
                    "p"."wallet" = $1
                `,
                [ wallet.id ],
            );

        if (result.rowCount === 0)
        {
            return null;
        }

        return PaymentMethod.deserialize(result.rows[0]);
    }

    public static async forWallet(wallet: Wallet): Promise<PaymentMethod[]>
    {
        const result = await Database.pool
            .query(
                `select * from "payment_methods" where "wallet" = $1`,
                [ wallet.id ],
            );

        return Promise.all(result.rows.map(PaymentMethod.deserialize));
    }

    ///////////////////
    // SERIALIZATION //
    ///////////////////

    public serialize(): ISerializedPaymentMethod
    {
        return {
            id: this.id,
            type: this.type,
            data: this.data,
            wallet: this.wallet.serialize(),
        };
    }

    private static async deserialize(data: IDatabasePaymentMethod): Promise<PaymentMethod>
    {
        const wallet = await Wallet.retrieve(data.wallet);

        return new PaymentMethod(
            data.id,
            data.type,
            data.data,
            wallet,
            data.stripe_id,
        );
    }

    /////////////
    // SCHEMAS //
    /////////////

    public static readonly SCHEMA = {
        OBJ: Joi.object({
            id: Schema.ID.PAYMENT_METHOD.required(),
            type: Schema.STRING.required(),
            data: Joi.object().required(),
            wallet: Wallet.SCHEMA.OBJ.required(),
            __metadata: Joi.object({
                is_default: Joi.boolean().required(),
            }).optional(),
        }),
    } as const;
}

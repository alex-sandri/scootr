import Joi from "joi";
import { Schema } from "../config/Schema";
import Database from "../utilities/Database";
import { ISerializedWallet, Wallet } from "./Wallet";

interface IDatabaseSubscription
{
    id: string,
    amount: number,
    wallet: string,
    status: string,
    current_period_end: Date,
    cancel_at_period_end: boolean,
    deleted: boolean,
    stripe_id: string,
}

export interface ISerializedSubscription
{
    id: string,
    amount: number,
    wallet: ISerializedWallet,
    status: string,
    current_period_end: string,
    cancel_at_period_end: boolean,
    deleted: boolean,
}

export class Subscription
{
    private constructor
    (
        public readonly id: string,
        public readonly amount: number,
        public readonly wallet: Wallet,
        public readonly status: string,
        public readonly current_period_end: Date,
        public readonly cancel_at_period_end: boolean,
        public readonly deleted: boolean,
        public readonly stripe_id: string,
    )
    {}

    //////////
    // CRUD //
    //////////

    public static async retrieve(id: string): Promise<Subscription>
    {
        const result = await Database.pool
            .query(
                ` select * from "subscriptions" where "id" = $1`,
                [ id ],
            );

        return Subscription.deserialize(result.rows[0]);
    }

    ///////////////
    // UTILITIES //
    ///////////////

    public static async forWallet(wallet: Wallet): Promise<Subscription[]>
    {
        const result = await Database.pool
            .query(
                `select * from "subscriptions" where "wallet" = $1`,
                [ wallet.id ],
            );

        return Promise.all(result.rows.map(Subscription.deserialize));
    }

    ///////////////////
    // SERIALIZATION //
    ///////////////////

    public serialize(): ISerializedSubscription
    {
        return {
            id: this.id,
            amount: this.amount,
            wallet: this.wallet.serialize(),
            status: this.status,
            current_period_end: this.current_period_end.toISOString(),
            cancel_at_period_end: this.cancel_at_period_end,
            deleted: this.deleted,
        };
    }

    private static async deserialize(data: IDatabaseSubscription): Promise<Subscription>
    {
        const wallet = await Wallet.retrieve(data.wallet);

        return new Subscription(
            data.id,
            data.amount,
            wallet,
            data.status,
            data.current_period_end,
            data.cancel_at_period_end,
            data.deleted,
            data.stripe_id,
        );
    }

    /////////////
    // SCHEMAS //
    /////////////

    public static readonly SCHEMA = {
        OBJ: Joi.object({
            id: Schema.ID.TRANSACTION.required(),
            amount: Schema.MONEY.required(),
            wallet: Wallet.SCHEMA.OBJ.required(),
            status: Schema.STRING.required(),
            current_period_end: Schema.DATETIME.required(),
            cancel_at_period_end: Schema.BOOLEAN.required(),
            deleted: Schema.BOOLEAN.required(),
        }),
    } as const;
}

import Joi from "joi";
import { Schema } from "../config/Schema";
import Database from "../utilities/Database";
import { ISerializedWallet, Wallet } from "./Wallet";

interface IDatabaseTransaction
{
    id: string,
    amount: number,
    timestamp: Date,
    wallet: string,
    reason: string,
    external_id: string | null,
}

export interface ISerializedTransaction
{
    id: string,
    amount: number,
    timestamp: string,
    wallet: ISerializedWallet,
    reason: string,
    external_id: string | null,
}

export class Transaction
{
    private constructor
    (
        public readonly id: string,
        public readonly amount: number,
        public readonly timestamp: Date,
        public readonly wallet: Wallet,
        public readonly reason: string,
        public readonly external_id: string | null,
    )
    {}

    //////////
    // CRUD //
    //////////

    public static async retrieve(id: string): Promise<Transaction>
    {
        const result = await Database.pool
            .query(
                ` select * from "transactions" where "id" = $1`,
                [ id ],
            );

        return Transaction.deserialize(result.rows[0]);
    }

    ///////////////
    // UTILITIES //
    ///////////////

    public static async forWallet(wallet: Wallet): Promise<Transaction[]>
    {
        const result = await Database.pool
            .query(
                `select * from "transactions" where "wallet" = $1`,
                [ wallet.id ],
            );

        return Promise.all(result.rows.map(Transaction.deserialize));
    }

    ///////////////////
    // SERIALIZATION //
    ///////////////////

    public serialize(): ISerializedTransaction
    {
        return {
            id: this.id,
            amount: this.amount,
            timestamp: this.timestamp.toISOString(),
            wallet: this.wallet.serialize(),
            reason: this.reason,
            external_id: this.external_id,
        };
    }

    private static async deserialize(data: IDatabaseTransaction): Promise<Transaction>
    {
        const wallet = await Wallet.retrieve(data.wallet);

        return new Transaction(
            data.id,
            parseFloat(data.amount.toString()),
            data.timestamp,
            wallet,
            data.reason,
            data.external_id,
        );
    }

    /////////////
    // SCHEMAS //
    /////////////

    public static readonly SCHEMA = {
        OBJ: Joi.object({
            id: Schema.ID.TRANSACTION.required(),
            amount: Schema.MONEY.required(),
            timestamp: Schema.DATETIME.required(),
            wallet: Wallet.SCHEMA.OBJ.required(),
            reason: Schema.STRING.required(),
            external_id: Schema.STRING.allow(null).required(),
        }),
    } as const;
}

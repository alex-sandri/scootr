import Boom from "@hapi/boom";
import Joi from "joi";
import { Config } from "../config/Config";
import { Schema } from "../config/Schema";
import Database from "../utilities/Database";
import { Utilities } from "../utilities/Utilities";
import { PaymentMethod } from "./PaymentMethod";
import { ISerializedUser, User } from "./User";

interface IDatabaseWallet
{
    id: string,
    name: string,
    balance: number,
    user: string,
}

interface ICreateWallet
{
    name: string,
}

interface IUpdateWallet
{
    name?: string,
}

export interface ISerializedWallet
{
    id: string,
    name: string,
    balance: number,
    user: ISerializedUser,
}

export class Wallet
{
    private constructor
    (
        public readonly id: string,
        private _name: string,
        public readonly balance: number,
        public readonly user: User,
        public readonly default_payment_method: PaymentMethod | null,
    )
    {}

    public get name(): string
    {
        return this._name;
    }

    //////////
    // CRUD //
    //////////

    public static async create(data: ICreateWallet, user: User): Promise<Wallet>
    {
        const result = await Database.pool
            .query(
                `
                insert into "wallets"
                    ("id", "name", "balance", "user")
                values
                    ($1, $2, $3, $4)
                returning *
                `,
                [
                    Utilities.id(Config.ID_PREFIXES.WALLET),
                    data.name,
                    0,
                    user.id,
                ],
            )
            .catch(() =>
            {
                throw Boom.badRequest();
            });

        return Wallet.deserialize(result.rows[0]);
    }

    public static async retrieve(id: string): Promise<Wallet>
    {
        const result = await Database.pool
            .query(
                `select * from "wallets" where "id" = $1`,
                [ id ],
            );

        if (result.rowCount === 0)
        {
            throw Boom.notFound();
        }

        return Wallet.deserialize(result.rows[0]);
    }

    public async update(data: IUpdateWallet): Promise<void>
    {
        this._name = data.name ?? this.name;

        await Database.pool
            .query(
                `
                update "wallets"
                set
                    "name" = $1
                where
                    "id" = $2
                `,
                [
                    this.name,
                    this.id,
                ],
            )
            .catch(() =>
            {
                throw Boom.badRequest();
            });
    }

    public async delete(): Promise<void>
    {
        await Database.pool
            .query(
                `delete from "wallets" where "id" = $1`,
                [ this.id, ],
            );
    }

    ///////////////
    // UTILITIES //
    ///////////////

    public static async retrieveDefault(userId: string): Promise<Wallet | null>
    {
        const result = await Database.pool
            .query(
                `select * from "default_wallets" where "user" = $1`,
                [ userId ],
            );

        if (result.rowCount === 0)
        {
            return null;
        }

        return Wallet.deserialize(result.rows[0]);
    }

    public static async forUser(user: User): Promise<Wallet[]>
    {
        const result = await Database.pool
            .query(
                `select * from "wallets" where "user" = $1`,
                [ user.id ],
            );

        return Promise.all(result.rows.map(Wallet.deserialize));
    }

    public async setDefaultPaymentMethod(paymentMethod: any): Promise<void>
    {
        throw Boom.notImplemented();
    }

    ///////////////////
    // SERIALIZATION //
    ///////////////////

    public serialize(): ISerializedWallet
    {
        return {
            id: this.id,
            name: this.name,
            balance: this.balance,
            user: this.user.serialize(),
        };
    }

    private static async deserialize(data: IDatabaseWallet): Promise<Wallet>
    {
        const user = await User.retrieve(data.user);

        const defaultPaymentMethod = await PaymentMethod.retrieveDefault(data.id);

        return new Wallet(
            data.id,
            data.name,
            data.balance,
            user,
            defaultPaymentMethod,
        );
    }

    /////////////
    // SCHEMAS //
    /////////////

    public static readonly SCHEMA = {
        OBJ: Joi.object({
            id: Schema.ID.WALLET.required(),
            name: Schema.STRING.max(30).required(),
            balance: Schema.MONEY.required(),
            user: User.SCHEMA.OBJ.required(),
        }),
        CREATE: Joi.object({
            name: Schema.STRING.max(30).required(),
        }),
        UPDATE: Joi.object({
            name: Schema.STRING.max(30).optional(),
        }),
    } as const;
}

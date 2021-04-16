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
    user: string,
    stripe_customer_id: string | null,
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
        public readonly stripe_customer_id: string | null,
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
        if (await Wallet.existsWithNameAndUser(data.name, user))
        {
            throw Boom.conflict(undefined, [
                {
                    field: "name",
                    error: `Un portafoglio con nome '${data.name}' esiste già`,
                },
            ]);
        }

        const client = await Database.pool.connect();

        await client.query("begin");

        const result = await client
            .query(
                `
                insert into "wallets"
                    ("id", "name", "user")
                values
                    ($1, $2, $3)
                returning *
                `,
                [
                    Utilities.id(Config.ID_PREFIXES.WALLET),
                    data.name,
                    user.id,
                ],
            )
            .catch(async () =>
            {
                await client.query("rollback");

                throw Boom.badRequest();
            });

        await Config.STRIPE.customers
            .create({
                name: `${user.first_name} ${user.last_name}`,
                email: user.email,
                preferred_locales: [ "it" ],
                metadata: {
                    wallet_id: result.rows[0].id,
                },
            })
            .catch(async () =>
            {
                await client.query("rollback");

                throw Boom.badImplementation();
            });

        await client.query("commit");

        client.release();

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
        if (!this.stripe_customer_id)
        {
            throw Boom.badImplementation();
        }

        const client = await Database.pool.connect();

        await client.query("begin");

        await client
            .query(
                `delete from "wallets" where "id" = $1`,
                [ this.id, ],
            )
            .catch(async () =>
            {
                await client.query("rollback");

                throw Boom.badImplementation();
            });

        await Config.STRIPE.customers
            .del(this.stripe_customer_id)
            .catch(async () =>
            {
                await client.query("rollback");

                throw Boom.badImplementation();
            });

        await client.query("commit");

        client.release();
    }

    ///////////////
    // UTILITIES //
    ///////////////

    public static async retrieveDefault(user: User): Promise<Wallet | null>
    {
        const result = await Database.pool
            .query(
                `
                select "w".*
                from
                    "default_wallets" as "dw"
                    inner join
                    "wallets" as "w"
                    on "w"."id" = "dw"."wallet"
                where
                    "w"."user" = $1
                `,
                [ user.id ],
            );

        if (result.rowCount === 0)
        {
            return null;
        }

        return Wallet.deserialize(result.rows[0]);
    }

    public static async existsWithNameAndUser(name: string, user: User): Promise<boolean>
    {
        const result = await Database.pool
            .query(
                `
                select count(*) as "count"
                from "wallets" as "w"
                where
                    "name" = $1
                    and
                    "user" = $2
                limit 1
                `,
                [
                    name,
                    user.id,
                ],
            );

        return result.rows[0].count > 0;
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

    public async setDefaultPaymentMethod(paymentMethod: PaymentMethod | null): Promise<void>
    {
        const client = await Database.pool.connect();

        await client.query("begin");

        await client
            .query(
                `delete from "default_payment_methods" where "wallet" = $1`,
                [ this.id ],
            )
            .catch(() =>
            {
                throw Boom.badImplementation();
            });

        if (paymentMethod !== null)
        {
            await client
                .query(
                    `insert into "default_payment_methods" ("wallet", "payment_method") values ($1, $2)`,
                    [ this.id, paymentMethod.id ],
                )
                .catch(() =>
                {
                    throw Boom.badImplementation();
                });
        }

        await client.query("commit");

        client.release();
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

        const balanceResult = await Database.pool
            .query(
                `
                select coalesce(sum("amount"), 0) as "balance"
                from "transactions"
                where "wallet" = $1
                `,
                [ data.id ],
            );

        return new Wallet(
            data.id,
            data.name,
            balanceResult.rows[0].balance,
            user,
            data.stripe_customer_id,
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
            __metadata: Joi.object({
                is_default: Schema.BOOLEAN.required(),
            }).optional(),
        }),
        CREATE: Joi.object({
            name: Schema.STRING.max(30).required(),
        }),
        UPDATE: Joi.object({
            name: Schema.STRING.max(30).optional(),
        }),
    } as const;
}

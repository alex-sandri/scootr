import Boom from "@hapi/boom";
import { differenceInYears } from "date-fns";
import Joi from "joi";
import { Config } from "../config/Config";
import { Schema } from "../config/Schema";
import Database from "../utilities/Database";
import { Utilities } from "../utilities/Utilities";

interface IDatabaseUser
{
    id: string,
    first_name: string,
    last_name: string,
    email: string,
    birth_date: Date,
    fiscal_number: string,
    stripe_customer_id: string | null,
}

interface ICreateUser
{
    first_name: string,
    last_name: string,
    email: string,
    birth_date: Date,
    fiscal_number: string,
}

interface IUpdateUser
{
    email?: string,
}

export interface ISerializedUser
{
    id: string,
    first_name: string,
    last_name: string,
    email: string,
    birth_date: string,
    fiscal_number: string,
}

export class User
{
    private constructor
    (
        public readonly id: string,
        public readonly first_name: string,
        public readonly last_name: string,
        private _email: string,
        public readonly birth_date: Date,
        public readonly fiscal_number: string,
        public readonly stripe_customer_id: string | null,
    )
    {}

    public get email(): string
    {
        return this._email;
    }

    //////////
    // CRUD //
    //////////

    public static async crea(data: ICreateUser): Promise<User>
    {
        if (differenceInYears(new Date(), data.birth_date) < Config.USER_MIN_AGE)
        {
            throw Boom.tooEarly(undefined, [
                {
                    field: "birth_date",
                    error: `Per potersi registrare si deve avere almeno ${Config.USER_MIN_AGE} anni compiuti`,
                },
            ]);
        }

        const client = await Database.pool.connect();

        await client.query("begin");

        const result = await client
            .query(
                `
                insert into "users"
                    ("id", "first_name", "last_name", "email", "birth_date", "fiscal_number")
                values
                    ($1, $2, $3, $4, $5, $6)
                returning *
                `,
                [
                    Utilities.id(Config.ID_PREFIXES.USER),
                    data.first_name,
                    data.last_name,
                    data.email,
                    data.birth_date.toISOString(),
                    data.fiscal_number,
                ],
            )
            .catch(async () =>
            {
                await client.query("rollback");

                throw Boom.badRequest();
            });

        await Config.STRIPE.customers
            .create({
                name: `${data.first_name} ${data.last_name}`,
                email: data.email,
                metadata: {
                    user_id: result.rows[0].id,
                },
            })
            .catch(async () =>
            {
                await client.query("rollback");

                throw Boom.badImplementation();
            });

        await client.query("commit");

        client.release();

        return User.deserialize(result.rows[0]);
    }

    public static async retrieve(id: string): Promise<User>
    {
        const result = await Database.pool
            .query(
                `select * from "users" where "id" = $1`,
                [ id ],
            );

        return User.deserialize(result.rows[0]);
    }

    public async update(data: IUpdateUser): Promise<void>
    {
        if (!this.stripe_customer_id)
        {
            throw Boom.expectationFailed();
        }

        this._email = data.email ?? this.email;

        const client = await Database.pool.connect();

        await client.query("begin");

        await client
            .query(
                `
                update "users"
                set
                    "email" = $1
                where
                    "id" = $2
                `,
                [
                    this.email,
                    this.id,
                ],
            )
            .catch(async () =>
            {
                await client.query("rollback");

                throw Boom.badRequest();
            });

        await Config.STRIPE.customers
            .update(
                this.stripe_customer_id,
                {
                    email: data.email,
                },
            )
            .catch(async () =>
            {
                await client.query("rollback");

                throw Boom.badImplementation();
            });

        await client.query("commit");

        client.release();
    }

    public async delete(): Promise<void>
    {
        const client = await Database.pool.connect();

        await client.query("begin");

        await Database.pool
            .query(
                `delete from "users" where "id" = $1`,
                [ this.id, ],
            );

        if (this.stripe_customer_id)
        {
            await Config.STRIPE.customers
                .del(this.stripe_customer_id)
                .catch(async () =>
                {
                    await client.query("rollback");
    
                    throw Boom.badImplementation();
                });
        }

        await client.query("commit");

        client.release();
    }

    ///////////////////
    // SERIALIZATION //
    ///////////////////

    public serializza(): ISerializedUser
    {
        return {
            id: this.id,
            first_name: this.first_name,
            last_name: this.last_name,
            email: this.email,
            birth_date: this.birth_date.toISOString(),
            fiscal_number: this.fiscal_number,
        };
    }

    private static deserialize(data: IDatabaseUser): User
    {
        return new User(
            data.id,
            data.first_name,
            data.last_name,
            data.email,
            data.birth_date,
            data.fiscal_number,
            data.stripe_customer_id,
        );
    }

    /////////////
    // SCHEMAS //
    /////////////

    public static readonly SCHEMA = {
        CREATE: Joi.object({
            first_name: Schema.STRING.required(),
            last_name: Schema.STRING.required(),
            email: Schema.EMAIL.required(),
            birth_date: Schema.DATE.max("now").required(),
            fiscal_number: Schema.FISCAL_NUMBER.required(),
        }),
        UPDATE: Joi.object({
            email: Schema.EMAIL.optional(),
        }),
    } as const;
}

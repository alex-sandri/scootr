import Boom from "@hapi/boom";
import Joi from "joi";
import { Config } from "../config/Config";
import { Schema } from "../config/Schema";
import Database from "../utilities/Database";

interface IDatabaseUser
{
    id: string,
    type: "admin" | "user",
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
        public readonly type: "admin" | "user",
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

    public static async retrieve(id: string): Promise<User>
    {
        const result = await Database.pool
            .query(
                `select * from "users" where "id" = $1`,
                [ id ],
            );

        if (result.rowCount === 0)
        {
            throw Boom.notFound();
        }

        return User.deserialize(result.rows[0]);
    }

    public async delete(): Promise<void>
    {
        const client = await Database.pool.connect();

        await client.query("begin");

        await client
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

    ///////////////
    // UTILITIES //
    ///////////////

    public static async retrieveWithEmail(email: string): Promise<User>
    {
        const result = await Database.pool
            .query(
                `select * from "users" where "email" = $1`,
                [ email ],
            );

        if (result.rowCount === 0)
        {
            throw Boom.notFound();
        }

        return User.deserialize(result.rows[0]);
    }

    ///////////////////
    // SERIALIZATION //
    ///////////////////

    public serialize(): ISerializedUser
    {
        return {
            id: this.id,
            first_name: this.first_name,
            last_name: this.last_name,
            email: this.email,
            birth_date: this.birth_date.toISOString().split("T")[0],
            fiscal_number: this.fiscal_number,
        };
    }

    private static deserialize(data: IDatabaseUser): User
    {
        return new User(
            data.id,
            data.type,
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
        OBJ: Joi.object({
            id: Schema.ID.USER.required(),
            first_name: Schema.STRING.required(),
            last_name: Schema.STRING.required(),
            email: Schema.EMAIL.required(),
            birth_date: Schema.DATE.max("now").required(),
            fiscal_number: Schema.FISCAL_NUMBER.required(),
        }),
    } as const;
}

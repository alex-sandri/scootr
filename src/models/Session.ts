import Boom from "@hapi/boom";
import Joi from "joi";
import { Config } from "../config/Config";
import { Schema } from "../config/Schema";
import Database from "../utilities/Database";
import { Utilities } from "../utilities/Utilities";
import { ISerializedUser, User } from "./User";

interface IDatabaseSession
{
    id: string,
    user: string,
    expires_at: Date,
}

export interface ISerializedSession
{
    id: string,
    user: ISerializedUser,
    expires_at: string,
}

export class Session
{
    private constructor
    (
        public readonly id: string,
        public readonly user: User,
        public readonly expires_at: Date,
    )
    {}

    //////////
    // CRUD //
    //////////

    public static async create(user: User): Promise<Session>
    {
        const expires = new Date();
        expires.setSeconds(new Date().getSeconds() + Config.SESSION_DURATION);

        const result = await Database.pool
            .query(
                `
                insert into "sessions"
                    ("id", "user", "expires_at")
                values
                    ($1, $2, $3)
                returning *
                `,
                [
                    Utilities.id(Config.ID_PREFIXES.SESSION),
                    user.id,
                    expires,
                ],
            )
            .catch(() =>
            {
                throw Boom.badRequest();
            });

        return Session.deserialize(result.rows[0]);
    }

    public static async retrieve(id: string): Promise<Session>
    {
        const result = await Database.pool
            .query(
                `select * from "sessions" where "id" = $1`,
                [ id ],
            );

        if (result.rowCount === 0)
        {
            throw Boom.notFound();
        }

        return Session.deserialize(result.rows[0]);
    }

    public async delete(): Promise<void>
    {
        await Database.pool
            .query(
                `delete from "sessions" where "id" = $1`,
                [ this.id, ],
            );
    }

    ///////////////
    // UTILITIES //
    ///////////////

    public hasExpired(): boolean
    {
        return this.expires_at < new Date();
    }

    ///////////////////
    // SERIALIZATION //
    ///////////////////

    public serialize(): ISerializedSession
    {
        return {
            id: this.id,
            user: this.user.serialize(),
            expires_at: this.expires_at.toISOString(),
        };
    }

    private static async deserialize(data: IDatabaseSession): Promise<Session>
    {
        const user = await User.retrieve(data.user);

        return new Session(
            data.id,
            user,
            data.expires_at,
        );
    }

    /////////////
    // SCHEMAS //
    /////////////

    public static readonly SCHEMA = {
        OBJ: Joi.object({
            id: Schema.ID.SESSION.required(),
            user: User.SCHEMA.OBJ.required(),
            expires_at: Schema.DATETIME.required(),
        }),
    } as const;
}

import Boom from "@hapi/boom";
import Joi from "joi";
import { Config } from "../config/Config";
import { Schema } from "../config/Schema";
import Database from "../utilities/Database";
import { Utilities } from "../utilities/Utilities";
import { ISerializedUser, User } from "./User";

interface IDatabaseExport
{
    id: string,
    user: string,
    data: any,
    created_at: Date,
    completed_at: Date | null,
    expires_at: Date | null,
}

export interface ISerializedExport
{
    id: string,
    user: ISerializedUser,
    data: any,
    created_at: string,
    completed_at: string | null,
    expires_at: string | null,
}

export class Export
{
    private constructor
    (
        public readonly id: string,
        public readonly user: User,
        public readonly data: any,
        public readonly created_at: Date,
        public readonly completed_at: Date | null,
        public readonly expires_at: Date | null,
    )
    {}

    //////////
    // CRUD //
    //////////

    public static async create(user: User): Promise<Export>
    {
        // TODO:
        // Block user from creating an export if one is still in the process of being completed

        const result = await Database.pool
            .query(
                `
                insert into "exports"
                    ("id", "user", "data")
                values
                    ($1, $2, $3)
                returning *
                `,
                [
                    Utilities.id(Config.ID_PREFIXES.EXPORT),
                    user.id,
                    {},
                ],
            )
            .catch(() =>
            {
                throw Boom.badRequest();
            });

        return Export.deserialize(result.rows[0]);
    }

    public static async retrieve(id: string): Promise<Export>
    {
        const result = await Database.pool
            .query(
                `select * from "exports" where "id" = $1`,
                [ id ],
            );

        if (result.rowCount === 0)
        {
            throw Boom.notFound();
        }

        return Export.deserialize(result.rows[0]);
    }

    ///////////////
    // UTILITIES //
    ///////////////

    ///////////////////
    // SERIALIZATION //
    ///////////////////

    public serialize(): ISerializedExport
    {
        return {
            id: this.id,
            user: this.user.serialize(),
            data: this.data,
            created_at: this.created_at.toISOString(),
            completed_at: this.completed_at?.toISOString() ?? null,
            expires_at: this.expires_at?.toISOString() ?? null,
        };
    }

    private static async deserialize(data: IDatabaseExport): Promise<Export>
    {
        const user = await User.retrieve(data.user);

        return new Export(
            data.id,
            user,
            data.data,
            data.created_at,
            data.completed_at,
            data.expires_at,
        );
    }

    /////////////
    // SCHEMAS //
    /////////////

    public static readonly SCHEMA = {
        OBJ: Joi.object({
            id: Schema.ID.EXPORT.required(),
            user: User.SCHEMA.OBJ.required(),
            data: Joi.object().required(),
            created_at: Schema.DATETIME.required(),
            completed_at: Schema.DATETIME.allow(null).required(),
            expires_at: Schema.DATETIME.allow(null).required(),
        }),
    } as const;
}

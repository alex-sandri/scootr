import Boom from "@hapi/boom";
import { differenceInYears } from "date-fns";
import Joi from "joi";
import { Config } from "../config/Config";
import { Schema } from "../config/Schema";
import Database from "../utilities/Database";
import { Utilities } from "../utilities/Utilities";

interface IDatabaseVehicle
{
    id: string,
    battery_level: number,
    location: string,
}

interface ICreateVehicle
{
    battery_level: number,
    location: string,
}

interface IUpdateVehicle
{
    battery_level?: number,
    location?: string,
}

export interface ISerializedVehicle
{
    id: string,
    battery_level: number,
    location: {
        latitude: number,
        longitude: number,
    },
}

export class Vehicle
{
    private constructor
    (
        public readonly id: string,
        private _battery_level: number,
        private _location: string,
    )
    {}

    public get battery_level(): number
    {
        return this._battery_level;
    }

    public get location(): string
    {
        return this._location;
    }

    //////////
    // CRUD //
    //////////

    public static async create(data: ICreateVehicle): Promise<Vehicle>
    {
        const client = await Database.pool.connect();

        await client.query("begin");

        const result = await client
            .query(
                `
                insert into "vehicles"
                    ("id", "battery_level", "location")
                values
                    ($1, $2, $3)
                returning *
                `,
                [
                    Utilities.id(Config.ID_PREFIXES.USER),
                    data.battery_level,
                    data.location,
                ],
            )
            .catch(async () =>
            {
                await client.query("rollback");

                throw Boom.badRequest();
            });

        await client.query("commit");

        client.release();

        return Vehicle.deserialize(result.rows[0]);
    }

    public static async retrieve(id: string): Promise<Vehicle>
    {
        const result = await Database.pool
            .query(
                `select * from "vehicles" where "id" = $1`,
                [ id ],
            );

        if (result.rowCount === 0)
        {
            throw Boom.notFound();
        }

        return Vehicle.deserialize(result.rows[0]);
    }

    public async update(data: IUpdateVehicle): Promise<void>
    {
        this._battery_level = data.battery_level ?? this.battery_level;
        this._location = data.location ?? this.location;

        await Database.pool
            .query(
                `
                update "users"
                set
                    "battery_level" = $1,
                    "location" = $2
                where
                    "id" = $3
                `,
                [
                    this.battery_level,
                    this.location,
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
                `delete from "users" where "id" = $1`,
                [ this.id, ],
            );
    }

    ///////////////////
    // SERIALIZATION //
    ///////////////////

    public serialize(): ISerializedVehicle
    {
        return {
            id: this.id,
            battery_level: this.battery_level,
            // TODO
            location: {
                latitude: 123,
                longitude: 456,
            },
        };
    }

    private static deserialize(data: IDatabaseVehicle): Vehicle
    {
        console.log(data);
        return new Vehicle(
            data.id,
            data.battery_level,
            data.location,
        );
    }

    /////////////
    // SCHEMAS //
    /////////////

    public static readonly SCHEMA = {
        OBJ: Joi.object({
            id: Schema.ID.USER.required(),
            battery_level: Joi.number().integer().min(0).max(100).required(),
            location: Joi.object({
                latitude: Schema.LATITUDE.required(),
                longitude: Schema.LONGITUDE.required(),
            }).required(),
        }),
        CREATE: Joi.object({
            battery_level: Joi.number().integer().min(0).max(100).required(),
            location: Joi.object({
                latitude: Schema.LATITUDE.required(),
                longitude: Schema.LONGITUDE.required(),
            }).required(),
        }),
        UPDATE: Joi.object({
            battery_level: Joi.number().integer().min(0).max(100).optional(),
            location: Joi.object({
                latitude: Schema.LATITUDE.required(),
                longitude: Schema.LONGITUDE.required(),
            }).optional(),
        }),
    } as const;
}

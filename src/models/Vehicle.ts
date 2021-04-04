import Boom from "@hapi/boom";
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

interface IVehicleLocation
{
    latitude: number,
    longitude: number,
}

interface ICreateVehicle
{
    battery_level: number,
    location: IVehicleLocation,
}

interface IUpdateVehicle
{
    battery_level?: number,
    location?: IVehicleLocation,
}

export interface ISerializedVehicle
{
    id: string,
    battery_level: number,
    location: IVehicleLocation,
}

export class Vehicle
{
    private constructor
    (
        public readonly id: string,
        private _battery_level: number,
        private _location: IVehicleLocation,
    )
    {}

    public get battery_level(): number
    {
        return this._battery_level;
    }

    public get location(): IVehicleLocation
    {
        return this._location;
    }

    //////////
    // CRUD //
    //////////

    public static async create(data: ICreateVehicle): Promise<Vehicle>
    {
        const id = Utilities.id(Config.ID_PREFIXES.VEHICLE);

        await Database.pool
            .query(
                `
                insert into "vehicles"
                    ("id", "battery_level", "location")
                values
                    ($1, $2, $3)
                `,
                [
                    id,
                    data.battery_level,
                    Vehicle.formatLocationForDatabase(data.location),
                ],
            )
            .catch(() =>
            {
                throw Boom.badRequest();
            });

        return Vehicle.deserialize({
            id,
            battery_level: data.battery_level,
            location: `${data.location.longitude};${data.location.latitude}`,
        });
    }

    public static async retrieve(id: string): Promise<Vehicle>
    {
        const result = await Database.pool
            .query(
                `select * from "v_vehicles" where "id" = $1`,
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
                update "vehicles"
                set
                    "battery_level" = $1,
                    "location" = $2
                where
                    "id" = $3
                `,
                [
                    this.battery_level,
                    Vehicle.formatLocationForDatabase(this.location),
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
                `delete from "vehicles" where "id" = $1`,
                [ this.id, ],
            );
    }

    ///////////////
    // UTILITIES //
    ///////////////

    private static formatLocationForDatabase(location: IVehicleLocation): string
    {
        return `srid=4326;point(${location.longitude} ${location.latitude})`;
    }

    private static parseLocationFromDatabase(location: string): IVehicleLocation
    {
        return {
            latitude: parseFloat(location.split(";")[1]),
            longitude: parseFloat(location.split(";")[0]),
        };
    }

    ///////////////////
    // SERIALIZATION //
    ///////////////////

    public serialize(): ISerializedVehicle
    {
        return {
            id: this.id,
            battery_level: this.battery_level,
            location: this.location,
        };
    }

    private static deserialize(data: IDatabaseVehicle): Vehicle
    {
        return new Vehicle(
            data.id,
            data.battery_level,
            Vehicle.parseLocationFromDatabase(data.location),
        );
    }

    /////////////
    // SCHEMAS //
    /////////////

    public static readonly SCHEMA = {
        OBJ: Joi.object({
            id: Schema.ID.VEHICLE.required(),
            battery_level: Joi.number().integer().min(0).max(100).required(),
            location: Schema.LOCATION.required(),
        }),
        CREATE: Joi.object({
            battery_level: Joi.number().integer().min(0).max(100).required(),
            location: Schema.LOCATION.required(),
        }),
        UPDATE: Joi.object({
            battery_level: Joi.number().integer().min(0).max(100).optional(),
            location: Schema.LOCATION.optional(),
        }),
    } as const;
}

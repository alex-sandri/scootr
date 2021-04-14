import Boom from "@hapi/boom";
import { differenceInMinutes } from "date-fns";
import Joi from "joi";
import { ILocation } from "../common/ILocation";
import { Config } from "../config/Config";
import { Schema } from "../config/Schema";
import Database from "../utilities/Database";
import { Utilities } from "../utilities/Utilities";
import { ISerializedUser, User } from "./User";
import { ISerializedVehicle, Vehicle } from "./Vehicle";
import { ISerializedWallet, Wallet } from "./Wallet";

interface IDatabaseRide
{
    id: string,
    user: string,
    vehicle: string,
    wallet: string,
    start_time: Date,
    end_time: Date | null,
    start_location: string,
    end_location: string | null,
}

interface ICreateRide
{
    vehicle: string,
    wallet: string,
    start_location: ILocation,
}

export interface ISerializedRide
{
    id: string,
    user: ISerializedUser,
    vehicle: ISerializedVehicle,
    wallet: ISerializedWallet,
    start_time: string,
    end_time: string | null,
    start_location: ILocation,
    end_location: ILocation | null,
}

export class Ride
{
    private constructor
    (
        public readonly id: string,
        public readonly user: User,
        public readonly vehicle: Vehicle,
        public readonly wallet: Wallet,
        public readonly start_time: Date,
        public readonly end_time: Date | null,
        public readonly start_location: ILocation,
        public readonly end_location: ILocation | null,
    )
    {}

    //////////
    // CRUD //
    //////////

    public static async create(data: ICreateRide, user: User): Promise<Ride>
    {
        // TODO: Check user has enough balance in wallet to start ride

        const result = await Database.pool
            .query(
                `
                insert into "rides"
                    ("id", "user", "vehicle", "wallet", "start_time", "start_location")
                values
                    ($1, $2, $3, $4, $5, $6)
                returning *
                `,
                [
                    Utilities.id(Config.ID_PREFIXES.RIDE),
                    user.id,
                    data.vehicle,
                    data.wallet,
                    new Date().toISOString(),
                    data.start_location,
                ],
            )
            .catch(() =>
            {
                throw Boom.badRequest();
            });

        return Ride.deserialize(result.rows[0]);
    }

    public static async retrieve(id: string): Promise<Ride>
    {
        const result = await Database.pool
            .query(
                `select * from "rides" where "id" = $1`,
                [ id ],
            );

        if (result.rowCount === 0)
        {
            throw Boom.notFound();
        }

        return Ride.deserialize(result.rows[0]);
    }

    ///////////////
    // UTILITIES //
    ///////////////

    public static async forUser(user: User): Promise<Ride[]>
    {
        const result = await Database.pool
            .query(
                `select * from "rides" where "user" = $1`,
                [ user.id ],
            );

        return Promise.all(result.rows.map(Ride.deserialize));
    }

    public async end(location: ILocation): Promise<void>
    {
        const endTime = new Date();

        const chargeAmount = Config.RIDE_FIXED_COST
            + (differenceInMinutes(endTime, this.start_time) * Config.RIDE_COST_PER_MINUTE);

        this.wallet.charge(chargeAmount);

        await Database.pool
            .query(
                `
                update "rides"
                set
                    "end_time" = $1,
                    "end_location" = $2
                where
                    "id" = $3
                `,
                [
                    endTime.toISOString(),
                    Utilities.formatLocationForDatabase(location),
                    this.id,
                ],
            )
            .catch(() =>
            {
                throw Boom.badImplementation();
            });
    }

    ///////////////////
    // SERIALIZATION //
    ///////////////////

    public serialize(): ISerializedRide
    {
        return {
            id: this.id,
            user: this.user.serialize(),
            vehicle: this.vehicle.serialize(),
            wallet: this.wallet.serialize(),
            start_time: this.start_time.toISOString(),
            end_time: this.end_time?.toISOString() ?? null,
            start_location: this.start_location,
            end_location: this.end_location,
        };
    }

    private static async deserialize(data: IDatabaseRide): Promise<Ride>
    {
        const user = await User.retrieve(data.user);
        const vehicle = await Vehicle.retrieve(data.vehicle);
        const wallet = await Wallet.retrieve(data.wallet);

        return new Ride(
            data.id,
            user,
            vehicle,
            wallet,
            data.start_time,
            data.end_time,
            Utilities.parseLocationFromDatabase(data.start_location),
            data.end_location
                ? Utilities.parseLocationFromDatabase(data.end_location)
                : null,
        );
    }

    /////////////
    // SCHEMAS //
    /////////////

    public static readonly SCHEMA = {
        OBJ: Joi.object({
            id: Schema.ID.RIDE.required(),
            user: User.SCHEMA.OBJ.required(),
            vehicle: Vehicle.SCHEMA.OBJ.required(),
            start_time: Schema.DATETIME.required(),
            end_time: Schema.DATETIME.allow(null).required(),
            start_location: Schema.LOCATION.required(),
            end_location: Schema.LOCATION.allow(null).required(),
        }),
        CREATE: Joi.object({
            vehicle: Schema.ID.VEHICLE.required(),
            start_location: Schema.LOCATION.required(),
        }),
    } as const;
}

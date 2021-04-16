import Joi from "joi";
import { ILocation } from "../common/ILocation";
import { Schema } from "../config/Schema";
import Database from "../utilities/Database";
import { Utilities } from "../utilities/Utilities";
import { ISerializedRide, Ride } from "./Ride";

interface IDatabaseRideWaypoint
{
    id: string,
    ride: string,
    location: string,
    timestamp: Date,
}

export interface ISerializedRideWaypoint
{
    id: string,
    ride: ISerializedRide,
    location: ILocation,
    timestamp: string,
}

export class RideWaypoint
{
    private constructor
    (
        public readonly id: string,
        public readonly ride: Ride,
        public readonly location: ILocation,
        public readonly timestamp: Date,
    )
    {}

    //////////
    // CRUD //
    //////////

    ///////////////
    // UTILITIES //
    ///////////////

    public static async forRide(ride: Ride): Promise<RideWaypoint[]>
    {
        const result = await Database.pool
            .query(
                `
                select *
                from "v_ride_waypoints"
                where "ride" = $1`,
                [ ride.id ],
            );

        return Promise.all(result.rows.map(RideWaypoint.deserialize));
    }

    ///////////////////
    // SERIALIZATION //
    ///////////////////

    public serialize(): ISerializedRideWaypoint
    {
        return {
            id: this.id,
            ride: this.ride.serialize(),
            location: this.location,
            timestamp: this.timestamp.toISOString(),
        };
    }

    private static async deserialize(data: IDatabaseRideWaypoint): Promise<RideWaypoint>
    {
        const ride = await Ride.retrieve(data.ride);

        return new RideWaypoint(
            data.id,
            ride,
            Utilities.parseLocationFromDatabase(data.location),
            data.timestamp,
        );
    }

    /////////////
    // SCHEMAS //
    /////////////

    public static readonly SCHEMA = {
        OBJ: Joi.object({
            id: Schema.ID.RIDE_WAYPOINT.required(),
            ride: Ride.SCHEMA.OBJ.required(),
            location: Schema.LOCATION.required(),
            timestamp: Schema.DATETIME.required(),
        }),
        CREATE: Joi.object({
            location: Schema.LOCATION.required(),
            timestamp: Schema.DATETIME.required(),
        }),
    } as const;
}

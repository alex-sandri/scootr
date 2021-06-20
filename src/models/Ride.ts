import Boom from "@hapi/boom";
import { differenceInMinutes } from "date-fns";
import Joi from "joi";
import { ILocation } from "../common/ILocation";
import { Config } from "../config/Config";
import { Schema } from "../config/Schema";
import Database from "../utilities/Database";
import { Utilities } from "../utilities/Utilities";
import { User } from "./User";
import { ISerializedVehicle, Vehicle } from "./Vehicle";
import { ISerializedWallet, Wallet } from "./Wallet";

interface IDatabaseRide
{
    id: string,
    vehicle: string,
    wallet: string,
    start_time: Date,
    end_time: Date | null,
}

interface ICreateRide
{
    vehicle: string,
    wallet: string,
}

export interface ISerializedRide
{
    id: string,
    vehicle: ISerializedVehicle,
    wallet: ISerializedWallet,
    start_time: string,
    end_time: string | null,
    amount: number | null,
}

export class Ride
{
    private constructor
    (
        public readonly id: string,
        public readonly vehicle: Vehicle,
        public readonly wallet: Wallet,
        public readonly start_time: Date,
        public readonly end_time: Date | null,
        public readonly amount: number | null,
    )
    {}

    //////////
    // CRUD //
    //////////

    public static async create(data: ICreateRide, user: User): Promise<Ride>
    {
        if (await Ride.retrieveActive(user))
        {
            throw Boom.conflict(undefined, [
                {
                    field: "ride",
                    error: "Non è possibile cominciare una nuova corsa in quanto ne esiste già una di attiva",
                },
            ]);
        }

        const vehicle = await Vehicle.retrieve(data.vehicle);

        if (!vehicle.available)
        {
            throw Boom.conflict(undefined, [
                {
                    field: "ride",
                    error: "Il veicolo selezionato non è al momento disponibile",
                },
            ]);
        }

        const wallet = await Wallet.retrieve(data.wallet);

        if (wallet.balance < Config.WALLET_MIN_BALANCE_TO_START_RIDE)
        {
            throw Boom.forbidden(undefined, [
                {
                    field: "wallet",
                    error: `Non è possibile utilizzare il portafoglio '${wallet.name}' in quanto non ha saldo a sufficienza (minimo ${Config.WALLET_MIN_BALANCE_TO_START_RIDE}€)`,
                },
            ]);
        }

        const id = Utilities.id(Config.ID_PREFIXES.RIDE);
        const startTime = new Date();

        await Database.pool
            .query(
                `
                insert into "rides"
                    ("id", "vehicle", "wallet", "start_time")
                values
                    ($1, $2, $3, $4)
                `,
                [
                    id,
                    data.vehicle,
                    data.wallet,
                    startTime.toISOString(),
                ],
            )
            .catch(() =>
            {
                throw Boom.badRequest();
            });

        return Ride.deserialize({
            id,
            vehicle: data.vehicle,
            wallet: data.wallet,
            start_time: startTime,
            end_time: null,
        });
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
                `
                select "r".*
                from
                    "rides" as "r"
                    inner join
                    "wallets" as "w"
                    on "w"."id" = "r"."wallet"
                where
                    "w"."user" = $1
                `,
                [ user.id ],
            );

        return Promise.all(result.rows.map(Ride.deserialize));
    }

    public static async retrieveActive(user: User): Promise<Ride | null>
    {
        const result = await Database.pool
            .query(
                `
                select "r".*
                from
                    "rides" as "r"
                    inner join
                    "wallets" as "w"
                    on "w"."id" = "r"."wallet"
                where
                    "w"."user" = $1
                    and
                    "end_time" is null
                limit 1
                `,
                [ user.id ],
            );

        if (result.rowCount === 0)
        {
            return null;
        }

        return Ride.deserialize(result.rows[0]);
    }

    public async addWaypoints(data: {
        location: ILocation,
        timestamp: Date,
    }[]): Promise<void>
    {
        const client = await Database.pool.connect();

        await client.query("begin");

        await Promise.all(data.map(waypoint =>
        {
            return client
                .query(
                    `
                    insert into "ride_waypoints"
                        ("id", "ride", "location", "timestamp")
                    values
                        ($1, $2, $3, $4)
                    `,
                    [
                        Utilities.id(Config.ID_PREFIXES.RIDE_WAYPOINT),
                        this.id,
                        Utilities.formatLocationForDatabase(waypoint.location),
                        waypoint.timestamp.toISOString(),
                    ],
                );
        }));

        await client.query("commit");

        client.release();
    }

    public async end(): Promise<void>
    {
        const endTime = new Date();

        const amount = Config.RIDE_FIXED_COST
            + (differenceInMinutes(endTime, this.start_time) * Config.RIDE_COST_PER_MINUTE);

        if (amount < Config.RIDE_FIXED_COST)
        {
            throw Boom.forbidden();
        }

        const client = await Database.pool.connect();

        await client.query("begin");

        await client
            .query(
                `
                insert into "transactions"
                    ("id", "amount", "wallet", "reason", "external_id")
                values
                    ($1, $2, $3, 'ride', $4)
                `,
                [
                    Utilities.id(Config.ID_PREFIXES.TRANSACTION),
                    -amount, // This is a debit transaction so it must be negative
                    this.wallet.id,
                    this.id,
                ],
            )
            .catch(async () =>
            {
                await client.query("rollback");

                throw Boom.badImplementation();
            });

        await client
            .query(
                `
                update "rides"
                set
                    "end_time" = $1
                where
                    "id" = $2
                `,
                [
                    endTime.toISOString(),
                    this.id,
                ],
            )
            .catch(async () =>
            {
                await client.query("rollback");

                throw Boom.badImplementation();
            });

        await client.query("commit");

        client.release();
    }

    ///////////////////
    // SERIALIZATION //
    ///////////////////

    public serialize(): ISerializedRide
    {
        return {
            id: this.id,
            vehicle: this.vehicle.serialize(),
            wallet: this.wallet.serialize(),
            start_time: this.start_time.toISOString(),
            end_time: this.end_time?.toISOString() ?? null,
            amount: this.amount,
        };
    }

    private static async deserialize(data: IDatabaseRide): Promise<Ride>
    {
        const vehicle = await Vehicle.retrieve(data.vehicle);
        const wallet = await Wallet.retrieve(data.wallet);

        const amountResult = await Database.pool
            .query(
                `
                select "amount"
                from "transactions"
                where
                    "reason" = 'ride'
                    and
                    "external_id" = $1
                `,
                [ data.id ],
            );

        let amount: number | null = null;

        if (amountResult.rows[0]?.amount)
        {
            amount = Math.abs(amountResult.rows[0].amount);
        }

        return new Ride(
            data.id,
            vehicle,
            wallet,
            data.start_time,
            data.end_time,
            amount,
        );
    }

    /////////////
    // SCHEMAS //
    /////////////

    public static readonly SCHEMA = {
        OBJ: Joi.object({
            id: Schema.ID.RIDE.required(),
            vehicle: Vehicle.SCHEMA.OBJ.required(),
            wallet: Wallet.SCHEMA.OBJ.required(),
            start_time: Schema.DATETIME.required(),
            end_time: Schema.NULLABLE(Schema.DATETIME).required(),
            amount: Schema.NULLABLE(Schema.MONEY.positive()).required(),
        }),
        CREATE: Joi.object({
            vehicle: Schema.ID.VEHICLE.required(),
            wallet: Schema.ID.WALLET.required(),
        }),
    } as const;
}

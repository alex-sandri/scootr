import Boom from "@hapi/boom";
import { ServerRoute } from "@hapi/hapi";
import Joi from "joi";
import { Schema } from "../../config/Schema";
import { Vehicle } from "../../models/Vehicle";

export default <ServerRoute[]>[
    {
        method: "GET",
        path: "/vehicles",
        options: {
            validate: {
                query: Joi.object({
                    location: Schema.LOCATION.required(),
                    radius: Joi.number().min(0).unit("meters").required(),
                }),
            },
            response: {
                schema: Schema.ARRAY(Vehicle.SCHEMA.OBJ),
            },
        },
        handler: async (request, h) =>
        {
            const vehicles = await Vehicle.retrieveMultiple({
                location: request.query.location,
                radius: request.query.radius,
            });

            return vehicles.map(vehicle => vehicle.serialize());
        },
    },
    {
        method: "GET",
        path: "/vehicles/{id}",
        options: {
            validate: {
                params: Joi.object({
                    id: Schema.ID.VEHICLE.required(),
                }),
            },
            response: {
                schema: Vehicle.SCHEMA.OBJ,
            },
        },
        handler: async (request, h) =>
        {
            const vehicle = await Vehicle.retrieve(request.params.id);

            return vehicle.serialize();
        },
    },
    {
        method: "POST",
        path: "/vehicles",
        options: {
            auth: {
                scope: [ "admin" ],
            },
            validate: {
                payload: Vehicle.SCHEMA.CREATE,
            },
            response: {
                schema: Vehicle.SCHEMA.OBJ,
            },
        },
        handler: async (request, h) =>
        {
            const vehicle = await Vehicle.create(request.payload as any);

            return vehicle.serialize();
        },
    },
    {
        method: "PATCH",
        path: "/vehicles/{id}",
        options: {
            validate: {
                params: Joi.object({
                    id: Schema.ID.VEHICLE.required(),
                }),
                payload: Vehicle.SCHEMA.UPDATE,
            },
            response: {
                schema: Vehicle.SCHEMA.OBJ,
            },
        },
        handler: async (request, h) =>
        {
            throw Boom.notImplemented();
        },
    },
    {
        method: "DELETE",
        path: "/vehicles/{id}",
        options: {
            auth: {
                scope: [ "admin" ],
            },
            validate: {
                params: Joi.object({
                    id: Schema.ID.VEHICLE.required(),
                }),
            },
        },
        handler: async (request, h) =>
        {
            throw Boom.notImplemented();
        },
    },
];

import Boom from "@hapi/boom";
import { ServerRoute } from "@hapi/hapi";
import Joi from "joi";
import { Schema } from "../../config/Schema";

export default <ServerRoute[]>[
    {
        method: "GET",
        path: "/rides/{id}",
        options: {
            validate: {
                params: Joi.object({
                    id: Schema.ID.RIDE.required(),
                }),
            },
            response: {
                schema: Ride.SCHEMA.OBJ,
            },
        },
        handler: async (request, h) =>
        {
            throw Boom.notImplemented();
        },
    },
    {
        method: "POST",
        path: "/rides",
        options: {
            validate: {
                params: Joi.object({
                    id: Schema.ID.RIDE.required(),
                }),
                payload: Ride.SCHEMA.CREATE,
            },
            response: {
                schema: Ride.SCHEMA.OBJ,
            },
        },
        handler: async (request, h) =>
        {
            throw Boom.notImplemented();
        },
    },
    {
        method: "PATCH",
        path: "/rides/{id}",
        options: {
            validate: {
                params: Joi.object({
                    id: Schema.ID.RIDE.required(),
                }),
                payload: Ride.SCHEMA.UPDATE,
            },
            response: {
                schema: Ride.SCHEMA.OBJ,
            },
        },
        handler: async (request, h) =>
        {
            throw Boom.notImplemented();
        },
    },
];

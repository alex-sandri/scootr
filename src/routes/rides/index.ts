import Boom from "@hapi/boom";
import { ServerRoute } from "@hapi/hapi";
import Joi from "joi";
import { Schema } from "../../config/Schema";
import { Ride } from "../../models/Ride";
import { User } from "../../models/User";

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
            const authenticatedUser = request.auth.credentials.user as User;

            const ride = await Ride.retrieve(request.params.id);

            if (authenticatedUser.id !== ride.user.id)
            {
                throw Boom.forbidden();
            }

            return ride.serialize();
        },
    },
    {
        method: "GET",
        path: "/users/{id}/rides/active",
        options: {
            validate: {
                params: Joi.object({
                    id: Schema.ID.USER.required(),
                }),
            },
            response: {
                schema: Ride.SCHEMA.OBJ.allow(null),
            },
        },
        handler: async (request, h) =>
        {
            const authenticatedUser = request.auth.credentials.user as User;

            if (authenticatedUser.id !== request.params.id)
            {
                throw Boom.forbidden();
            }

            const ride = await Ride.retrieveActive(authenticatedUser);

            if (!ride)
            {
                return null;
            }

            return ride.serialize();
        },
    },
    {
        method: "POST",
        path: "/rides",
        options: {
            validate: {
                payload: Ride.SCHEMA.CREATE,
            },
            response: {
                schema: Ride.SCHEMA.OBJ,
            },
        },
        handler: async (request, h) =>
        {
            const authenticatedUser = request.auth.credentials.user as User;

            const ride = await Ride.create(request.payload as any, authenticatedUser);

            return ride.serialize();
        },
    },
    {
        method: "POST",
        path: "/rides/{id}/end",
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
            const authenticatedUser = request.auth.credentials.user as User;

            const ride = await Ride.retrieve(request.params.id);

            if (authenticatedUser.id !== ride.user.id)
            {
                throw Boom.forbidden();
            }

            await ride.end();

            return ride.serialize();
        },
    },
];

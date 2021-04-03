import Boom from "@hapi/boom";
import { ServerRoute } from "@hapi/hapi";
import Joi from "joi";
import { Schema } from "../../config/Schema";
import { User } from "../../models/User";

export default <ServerRoute[]>[
    {
        method: "GET",
        path: "/users/{id}",
        options: {
            validate: {
                params: Joi.object({
                    id: Schema.ID.USER.required(),
                }),
            },
        },
        handler: async (request, h) =>
        {
            throw Boom.notImplemented();
        },
    },
    {
        method: "POST",
        path: "/users",
        options: {
            validate: {
                payload: User.SCHEMA.CREATE,
            },
        },
        handler: async (request, h) =>
        {
            const user = await User.create(request.payload as any);

            return user.serialize();
        },
    },
    {
        method: "PATCH",
        path: "/users/{id}",
        options: {
            validate: {
                params: Joi.object({
                    id: Schema.ID.USER.required(),
                }),
                payload: User.SCHEMA.UPDATE,
            },
        },
        handler: async (request, h) =>
        {
            throw Boom.notImplemented();
        },
    },
    {
        method: "DELETE",
        path: "/users/{id}",
        options: {
            validate: {
                params: Joi.object({
                    id: Schema.ID.USER.required(),
                }),
            },
        },
        handler: async (request, h) =>
        {
            throw Boom.notImplemented();
        },
    },
];

import Boom from "@hapi/boom";
import { ServerRoute } from "@hapi/hapi";
import Joi from "joi";
import { Schema } from "../../config/Schema";
import { User } from "../../models/User";
import { Wallet } from "../../models/Wallet";

export default <ServerRoute[]>[
    {
        method: [ "GET", "POST" ],
        path: "/users/{id}/wallets",
        options: {
            validate: {
                params: Joi.object({
                    id: Schema.ID.USER.required(),
                }),
            },
            response: {
                schema: Wallet.SCHEMA.OBJ,
            },
        },
        handler: async (request, h) =>
        {
            const authenticatedUser = request.auth.credentials.user as User;

            const { id } = request.params;

            if (authenticatedUser.id !== id)
            {
                throw Boom.forbidden();
            }

            const user = await User.retrieve(id);

            return user.serialize();
        },
    },
    {
        method: "GET",
        path: "/wallets/{id}",
        options: {
            validate: {
                params: Joi.object({
                    id: Schema.ID.WALLET.required(),
                }),
            },
            response: {
                schema: Wallet.SCHEMA.OBJ,
            },
        },
        handler: async (request, h) =>
        {
            const authenticatedUser = request.auth.credentials.user as User;

            const { id } = request.params;

            if (authenticatedUser.id !== id)
            {
                throw Boom.forbidden();
            }

            const user = await User.retrieve(id);

            return user.serialize();
        },
    },
    {
        method: "PUT",
        path: "/users/{id}/wallets/default",
        options: {
            validate: {
                params: Joi.object({
                    id: Schema.ID.USER.required(),
                }),
            },
            response: {
                schema: Wallet.SCHEMA.OBJ,
            },
        },
        handler: async (request, h) =>
        {
            const authenticatedUser = request.auth.credentials.user as User;

            const { id } = request.params;

            if (authenticatedUser.id !== id)
            {
                throw Boom.forbidden();
            }

            const user = await User.retrieve(id);

            return user.serialize();
        },
    },
    {
        method: "DELETE",
        path: "/wallets/{id}",
        options: {
            validate: {
                params: Joi.object({
                    id: Schema.ID.WALLET.required(),
                }),
            },
        },
        handler: async (request, h) =>
        {
            throw Boom.notImplemented();
        },
    },
];

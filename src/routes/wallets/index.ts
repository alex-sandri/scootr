import Boom from "@hapi/boom";
import { ServerRoute } from "@hapi/hapi";
import Joi from "joi";
import { Schema } from "../../config/Schema";
import { User } from "../../models/User";
import { Wallet } from "../../models/Wallet";

export default <ServerRoute[]>[
    {
        method: "GET",
        path: "/users/{id}/wallets",
        options: {
            validate: {
                params: Joi.object({
                    id: Schema.ID.USER.required(),
                }),
            },
            response: {
                schema: Schema.ARRAY(Wallet.SCHEMA.OBJ),
            },
        },
        handler: async (request, h) =>
        {
            const authenticatedUser = request.auth.credentials.user as User;

            if (authenticatedUser.id !== request.params.id)
            {
                throw Boom.forbidden();
            }

            const wallets = await Wallet.forUser(authenticatedUser);

            return wallets.map(wallet => wallet.serialize());
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

            const wallet = await Wallet.retrieve(request.params.id);

            if (authenticatedUser.id !== wallet.user.id)
            {
                throw Boom.forbidden();
            }

            return wallet.serialize();
        },
    },
    {
        method: "POST",
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

            if (authenticatedUser.id !== request.params.id)
            {
                throw Boom.forbidden();
            }

            const wallet = await Wallet.create(request.payload as any, authenticatedUser);

            return wallet.serialize();
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
        },
        handler: async (request, h) =>
        {
            const authenticatedUser = request.auth.credentials.user as User;

            const wallet = await Wallet.retrieve(request.params.id);

            if (authenticatedUser.id !== wallet.user.id)
            {
                throw Boom.forbidden();
            }

            await authenticatedUser.setDefaultWallet(wallet);

            return h.response();
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

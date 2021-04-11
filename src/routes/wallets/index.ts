import Boom from "@hapi/boom";
import { ServerRoute } from "@hapi/hapi";
import Joi from "joi";
import { Config } from "../../config/Config";
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

            const defaultWallet = await Wallet.retrieveDefault(authenticatedUser);

            return wallets.map(wallet => ({
                ...wallet.serialize(),
                __metadata: {
                    is_default: defaultWallet?.id === wallet.id,
                },
            }));
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
                payload: Wallet.SCHEMA.CREATE,
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
        method: "POST",
        path: "/wallets/{id}/funds",
        options: {
            validate: {
                params: Joi.object({
                    id: Schema.ID.WALLET.required(),
                }),
                payload: Joi.object({
                    amount: Schema.MONEY.required(),
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

            if (!wallet.stripe_customer_id)
            {
                throw Boom.badImplementation();
            }

            await Config.STRIPE.charges
                .create({
                    amount: (request.payload as any).amount,
                    currency: "eur",
                    customer: wallet.stripe_customer_id,
                })
                .catch(() =>
                {
                    throw Boom.badImplementation();
                });

            return h.response();
        },
    },
    {
        method: "PATCH",
        path: "/wallets/{id}",
        options: {
            validate: {
                params: Joi.object({
                    id: Schema.ID.WALLET.required(),
                }),
                payload: Wallet.SCHEMA.UPDATE,
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

            await wallet.update(request.payload as any);

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
                payload: Joi.object({
                    id: Schema.ID.WALLET.required(),
                }),
            },
        },
        handler: async (request, h) =>
        {
            const authenticatedUser = request.auth.credentials.user as User;

            if (authenticatedUser.id !== request.params.id)
            {
                throw Boom.forbidden();
            }

            const wallet = await Wallet.retrieve((request.payload as any).id);

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

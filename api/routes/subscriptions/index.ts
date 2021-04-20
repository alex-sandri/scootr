import Boom from "@hapi/boom";
import { ServerRoute } from "@hapi/hapi";
import Joi from "joi";
import { Schema } from "../../config/Schema";
import { Subscription } from "../../models/Subscription";
import { User } from "../../models/User";
import { Wallet } from "../../models/Wallet";

export default <ServerRoute[]>[
    {
        method: "GET",
        path: "/subscriptions/{id}",
        options: {
            validate: {
                params: Joi.object({
                    id: Schema.ID.SUBSCRIPTION.required(),
                }),
            },
            response: {
                schema: Subscription.SCHEMA.OBJ,
            },
        },
        handler: async (request, h) =>
        {
            const authenticatedUser = request.auth.credentials.user as User;

            const subscription = await Subscription.retrieve(request.params.id);

            if (authenticatedUser.id !== subscription.wallet.user.id)
            {
                throw Boom.forbidden();
            }

            return subscription.serialize();
        },
    },
    {
        method: "GET",
        path: "/wallets/{id}/subscriptions",
        options: {
            validate: {
                params: Joi.object({
                    id: Schema.ID.WALLET.required(),
                }),
            },
            response: {
                schema: Schema.ARRAY(Subscription.SCHEMA.OBJ),
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

            const subscriptions = await Subscription.forWallet(wallet);

            return subscriptions.map(_ => _.serialize());
        },
    },
];

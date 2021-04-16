import Boom from "@hapi/boom";
import { ServerRoute } from "@hapi/hapi";
import Joi from "joi";
import { Schema } from "../../config/Schema";
import { Transaction } from "../../models/Transaction";
import { User } from "../../models/User";
import { Wallet } from "../../models/Wallet";

export default <ServerRoute[]>[
    {
        method: "GET",
        path: "/transactions/{id}",
        options: {
            validate: {
                params: Joi.object({
                    id: Schema.ID.TRANSACTION.required(),
                }),
            },
            response: {
                schema: Transaction.SCHEMA.OBJ,
            },
        },
        handler: async (request, h) =>
        {
            const authenticatedUser = request.auth.credentials.user as User;

            const transaction = await Transaction.retrieve(request.params.id);

            if (authenticatedUser.id !== transaction.wallet.user.id)
            {
                throw Boom.forbidden();
            }

            return transaction.serialize();
        },
    },
    {
        method: "GET",
        path: "/wallets/{id}/transactions",
        options: {
            validate: {
                params: Joi.object({
                    id: Schema.ID.WALLET.required(),
                }),
            },
            response: {
                schema: Schema.ARRAY(Transaction.SCHEMA.OBJ),
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

            const transactions = await Transaction.forWallet(wallet);

            return transactions.map(_ => _.serialize());
        },
    },
];

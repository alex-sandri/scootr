import Boom from "@hapi/boom";
import { ServerRoute } from "@hapi/hapi";
import Joi from "joi";
import { Schema } from "../../config/Schema";
import { Transaction } from "../../models/Transaction";

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
            throw Boom.notImplemented();
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
            throw Boom.notImplemented();
        },
    },
];

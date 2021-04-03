import Boom from "@hapi/boom";
import { ServerRoute } from "@hapi/hapi";
import Joi from "joi";
import { Schema } from "../../config/Schema";

export default <ServerRoute[]>[
    {
        method: "GET",
        path: "/utenti/{id}",
        options: {
            validate: {
                params: Joi.object({
                    id: Schema.ID.UTENTE.required(),
                }),
            },
        },
        handler: async (request, h) =>
        {},
    },
    {
        method: "POST",
        path: "/utenti",
        options: {
            validate: {
                payload: Joi,
            },
        },
        handler: async (request, h) =>
        {},
    },
    {
        method: "PATCH",
        path: "/utenti/{id}",
        options: {
            validate: {
                params: Joi.object({
                    id: Schema.ID.UTENTE.required(),
                }),
            },
        },
        handler: async (request, h) =>
        {},
    },
    {
        method: "DELETE",
        path: "/utenti/{id}",
        options: {
            validate: {
                params: Joi.object({
                    id: Schema.ID.UTENTE.required(),
                }),
            },
        },
        handler: async (request, h) =>
        {},
    },
];

import Boom from "@hapi/boom";
import { ServerRoute } from "@hapi/hapi";
import Joi from "joi";
import { Config } from "../../config/Config";
import { Schema } from "../../config/Schema";

export default <ServerRoute[]>[
    {
        method: "GET",
        path: "/utenti/{id}",
        options: {
            validate: {
                params: Joi.object({
                    id: Schema.ID(Config.PREFISSI_ID.UTENTE).required(),
                }),
            },
        },
        handler: async (request, h) =>
        {},
    },
];

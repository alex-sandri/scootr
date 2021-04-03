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
];

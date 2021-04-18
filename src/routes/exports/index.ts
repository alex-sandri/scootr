import Boom from "@hapi/boom";
import { ServerRoute } from "@hapi/hapi";
import Joi from "joi";
import { Schema } from "../../config/Schema";
import { Export } from "../../models/Export";
import { User } from "../../models/User";

export default <ServerRoute[]>[
    {
        method: "GET",
        path: "/exports/{id}",
        options: {
            validate: {
                params: Joi.object({
                    id: Schema.ID.EXPORT.required(),
                }),
            },
            response: {
                schema: Export.SCHEMA.OBJ,
            },
        },
        handler: async (request, h) =>
        {
            const authenticatedUser = request.auth.credentials.user as User;

            const dataExport = await Export.retrieve(request.params.id);

            if (authenticatedUser.id !== dataExport.user.id)
            {
                throw Boom.forbidden();
            }

            return dataExport.serialize();
        },
    },
    {
        method: "POST",
        path: "/users/{id}/exports",
        options: {
            validate: {
                params: Joi.object({
                    id: Schema.ID.USER.required(),
                }),
            },
            response: {
                schema: Joi.object({
                    id: Schema.ID.EXPORT.required(),
                }),
            },
        },
        handler: async (request, h) =>
        {
            const authenticatedUser = request.auth.credentials.user as User;

            throw Boom.notImplemented();
        },
    },
];

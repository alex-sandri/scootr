import Boom from "@hapi/boom";
import { ServerRoute } from "@hapi/hapi";
import Joi from "joi";
import { Schema } from "../../config/Schema";
import { Session } from "../../models/Session";
import { User } from "../../models/User";

export default <ServerRoute[]>[
    {
        method: "GET",
        path: "/sessions/{id}",
        options: {
            validate: {
                params: Joi.object({
                    id: Schema.ID.SESSION.required(),
                }),
            },
            response: {
                schema: Session.SCHEMA.OBJ,
            },
        },
        handler: async (request, h) =>
        {
            const authenticatedUser = request.auth.credentials.user as User;

            const session = await Session.retrieve(request.params.id);

            if (authenticatedUser.id !== session.user.id)
            {
                throw Boom.forbidden();
            }

            return session.serialize();
        },
    },
    {
        method: "DELETE",
        path: "/sessions/{id}",
        options: {
            validate: {
                params: Joi.object({
                    id: Schema.ID.SESSION.required(),
                }),
            },
        },
        handler: async (request, h) =>
        {
            throw Boom.notImplemented();
        },
    },
];

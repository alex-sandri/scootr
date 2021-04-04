import "dotenv/config";

import Hapi from "@hapi/hapi";
import routes from "./routes";
import Database from "./utilities/Database";
import { ValidationError } from "joi";
import Boom from "@hapi/boom";
import qs from "qs";
import { Session } from "./models/Session";
import { Config } from "./config/Config";

const server = new Hapi.Server({
    port: process.env.PORT,
    routes: {
        cors: {
            origin: [ Config.CLIENT_HOST ],
        },
        validate: {
            options: {
                abortEarly: false,
            },
            failAction: async (request, h, error) =>
            {
                if (error instanceof ValidationError)
                {
                    throw Boom.badRequest(undefined, error.details.map(e =>
                    {
                        return {
                            field: e.path.join("."),
                            error: e.type,
                        };
                    }));
                }

                throw error;
            },
        },
        response: {
            emptyStatusCode: 204,
        },
    },
    query: {
        parser: qs.parse,
    },
});

const init = async () =>
{
    Database.init();

    server.auth.scheme("token", () =>
    {
        return {
            authenticate: async (request, h) =>
            {
                const authorization = request.raw.req.headers.authorization;

                if (!authorization)
                {
                    throw Boom.unauthorized();
                }

                const session = await Session.retrieve(authorization.split(" ")[1]);

                if (session.hasExpired())
                {
                    throw Boom.unauthorized();
                }

                const { user } = session;

                const scope = [ user.type ];

                if (user.type === "admin")
                {
                    scope.push("user");
                }

                return h.authenticated({
                    credentials: {
                        user,
                        scope,
                    },
                });
            },
        };
    });

    server.auth.strategy("session", "token");

    server.auth.default({
        strategy: "session",
        scope: "user",
    });

    server.ext("onPreResponse", (request, h) =>
    {
        const { response } = request;

        if (response instanceof Boom.Boom && response.data)
        {
            response.output.payload.details = response.data;
        }

        return h.continue;
    });

    server.route(routes);

    server.start();
};

init();

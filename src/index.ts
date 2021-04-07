import "dotenv/config";

import Hapi from "@hapi/hapi";
import Cookie from "@hapi/cookie";
import routes from "./routes";
import Database from "./utilities/Database";
import { ValidationError } from "joi";
import Boom from "@hapi/boom";
import qs from "qs";
import { Config } from "./config/Config";
import { Session } from "./models/Session";

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

    await server.register(Cookie);

    server.auth.strategy("session", "cookie", {
        cookie: {
            name: "session_id",
            password: process.env.AUTH_COOKIE_ENCRYPTION_PASSWORD,
            ttl: Config.SESSION_DURATION,
            domain: Config.CLIENT_HOST,
            path: "/",
            clearInvalid: true,
            isSameSite: "Strict",
            isSecure: Config.IS_PRODUCTION,
            isHttpOnly: true,
        },
        validateFunc: async (request, session?: { id: string }) =>
        {
            if (!session)
            {
                return { valid: false };
            }

            const userSession = await Session.retrieve(session.id);

            if (userSession.hasExpired())
            {
                throw Boom.unauthorized();
            }

            const { user } = userSession;

            const scope = [ user.type ];

            if (user.type === "admin")
            {
                scope.push("user");
            }

            return {
                valid: true,
                credentials: {
                    user,
                    scope,
                },
            };
        },
    });

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

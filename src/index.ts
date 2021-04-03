import dotenv from "dotenv";

dotenv.config();

import Hapi from "@hapi/hapi";
import routes from "./routes";
import Database from "./utilities/Database";
import { ValidationError } from "joi";
import Boom from "@hapi/boom";

const server = new Hapi.Server({
    port: process.env.PORT,
    routes: {
        cors: {
            origin: [ "*" ], // TODO
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
});

const init = async () =>
{
    Database.init();

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
}

init();

import dotenv from "dotenv";

dotenv.config();

import Boom from "@hapi/boom";
import Hapi from "@hapi/hapi";

const server = new Hapi.Server({
    port: process.env.PORT,
});

const init = async () =>
{
    server.route({
        method: "POST",
        path: "/sessions",
        handler: async (request, h) =>
        {
            
        },
    });

    server.start();
}

init();

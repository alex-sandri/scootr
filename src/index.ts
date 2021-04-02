import Boom from "@hapi/boom";
import Hapi from "@hapi/hapi";

const server = new Hapi.Server({
    port: 4000,
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

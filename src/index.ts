import dotenv from "dotenv";

dotenv.config();

import Hapi from "@hapi/hapi";
import routes from "./routes";
import Database from "./utilities/Database";

const server = new Hapi.Server({
    port: process.env.PORT,
});

const init = async () =>
{
    Database.init();

    server.route(routes);

    server.start();
}

init();

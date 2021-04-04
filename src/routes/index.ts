import auth from "./auth";
import sessions from "./sessions";
import users from "./users";
import vehicles from "./vehicles";
import webhooks from "./webhooks";

export = [
    auth,
    sessions,
    users,
    vehicles,
    webhooks,
].flat();

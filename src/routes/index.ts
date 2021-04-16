import paymentMethods from "./payment-methods";
import rides from "./rides";
import sessions from "./sessions";
import subscriptions from "./subscriptions";
import transactions from "./transactions";
import users from "./users";
import vehicles from "./vehicles";
import wallets from "./wallets";
import webhooks from "./webhooks";

export = [
    paymentMethods,
    rides,
    sessions,
    subscriptions,
    transactions,
    users,
    vehicles,
    wallets,
    webhooks,
].flat();

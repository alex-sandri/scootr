import Boom from "@hapi/boom";
import { ServerRoute } from "@hapi/hapi";
import Stripe from "stripe";
import { Config } from "../../config/Config";
import Database from "../../utilities/Database";

export default <ServerRoute[]>[
    {
        method: "POST",
        path: "/webhooks/stripe",
        options: {
            auth: false,
            payload: {
                output: "data",
                parse: false,
            },
        },
        handler: async (request, h) =>
        {
            let event: Stripe.Event;

            try
            {
                event = Config.STRIPE.webhooks.constructEvent(
                    request.payload as any,
                    request.headers["stripe-signature"],
                    process.env.STRIPE_WEBHOOK_SECRET ?? "",
                );
            }
            catch (err)
            {
                throw Boom.forbidden();
            }

            switch (event.type)
            {
                case "customer.created":
                {
                    const customer = event.data.object as Stripe.Customer;

                    await Database.pool
                        .query(
                            `update "users" set "stripe_customer_id" = $1 where "id" = $2`,
                            [
                                customer.id,
                                customer.metadata.user_id,
                            ],
                        )
                        .catch(() =>
                        {
                            throw Boom.badImplementation();
                        });

                    break;
                }
            }

            return { received: true };
        },
    },
];
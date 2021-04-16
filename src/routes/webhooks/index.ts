import Boom from "@hapi/boom";
import { ServerRoute } from "@hapi/hapi";
import Stripe from "stripe";
import { Config } from "../../config/Config";
import { PaymentMethod } from "../../models/PaymentMethod";
import { Wallet } from "../../models/Wallet";
import Database from "../../utilities/Database";
import { Utilities } from "../../utilities/Utilities";

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
                            `update "wallets" set "stripe_customer_id" = $1 where "id" = $2`,
                            [
                                customer.id,
                                customer.metadata.wallet_id,
                            ],
                        )
                        .catch(() =>
                        {
                            throw Boom.badImplementation();
                        });

                    break;
                }
                case "customer.updated":
                {
                    const customer = event.data.object as Stripe.Customer;

                    const wallet = await Wallet.retrieve(customer.metadata.wallet_id);

                    let paymentMethod: PaymentMethod | null = null;

                    if (customer.invoice_settings.default_payment_method !== null)
                    {
                        if (typeof customer.invoice_settings.default_payment_method !== "string")
                        {
                            throw Boom.badImplementation();
                        }

                        paymentMethod = await PaymentMethod.retrieveWithStripeId(customer.invoice_settings.default_payment_method);
                    }

                    await wallet.setDefaultPaymentMethod(paymentMethod);

                    break;
                }
                case "customer.subscription.created":
                {
                    

                    break;
                }
                case "customer.subscription.deleted":
                {
                    

                    break;
                }
                case "customer.subscription.updated":
                {
                    

                    break;
                }
                case "invoice.paid":
                {
                    

                    break;
                }
                case "invoice.payment_failed":
                {
                    

                    break;
                }
                case "payment_intent.succeeded":
                {
                    const paymentIntent = event.data.object as Stripe.PaymentIntent;

                    await Database.pool
                        .query(
                            `
                            insert into "transactions"
                                ("id", "amount", "wallet", "reason", "external_id")
                            values
                                ($1, $2, $3, 'credit', $4)
                            `,
                            [
                                Utilities.id(Config.ID_PREFIXES.TRANSACTION),
                                paymentIntent.amount / 100, // Amount is in cents
                                paymentIntent.metadata.wallet_id,
                                paymentIntent.id,
                            ],
                        )
                        .catch(() =>
                        {
                            throw Boom.badImplementation();
                        });

                    break;
                }
                case "payment_method.attached":
                {
                    const paymentMethod = event.data.object as Stripe.PaymentMethod;

                    if (typeof paymentMethod.customer !== "string")
                    {
                        throw Boom.badImplementation();
                    }

                    const customer = await Config.STRIPE.customers.retrieve(paymentMethod.customer) as Stripe.Customer;

                    await Database.pool
                        .query(
                            `
                            insert into "payment_methods"
                                ("id", "type", "data", "wallet", "stripe_id")
                            values
                                ($1, $2, $3, $4, $5)
                            `,
                            [
                                Utilities.id(Config.ID_PREFIXES.PAYMENT_METHOD),
                                paymentMethod.type,
                                paymentMethod[paymentMethod.type],
                                customer.metadata.wallet_id,
                                paymentMethod.id,
                            ],
                        )
                        .catch(() =>
                        {
                            throw Boom.badImplementation();
                        });

                    break;
                }
                case "payment_method.updated":
                case "payment_method.automatically_updated":
                {
                    const paymentMethod = event.data.object as Stripe.PaymentMethod;

                    await Database.pool
                        .query(
                            `update "payment_methods" set "data" = $1 where "stripe_id" = $1`,
                            [ paymentMethod[paymentMethod.type], paymentMethod.id ],
                        )
                        .catch(() =>
                        {
                            throw Boom.badImplementation();
                        });

                    break;
                }
                case "payment_method.detached":
                {
                    const paymentMethod = event.data.object as Stripe.PaymentMethod;

                    await Database.pool
                        .query(
                            `delete from "payment_methods" where "stripe_id" = $1`,
                            [ paymentMethod.id ],
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
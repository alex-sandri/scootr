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
                    const subscription = event.data.object as Stripe.Subscription;

                    if (!subscription.items.data[0].price.unit_amount)
                    {
                        throw Boom.badImplementation();
                    }

                    await Database.pool
                        .query(
                            `
                            insert into "subscriptions"
                                ("id", "amount", "wallet", "status", "current_period_end", "cancel_at_period_end", "deleted", "stripe_id")
                            values
                                ($1, $2, $3, $4, $5, $6, false, $7)
                            `,
                            [
                                Utilities.id(Config.ID_PREFIXES.SUBSCRIPTION),
                                subscription.items.data[0].price.unit_amount / 100,
                                subscription.metadata.wallet_id,
                                subscription.status,
                                new Date(subscription.current_period_end * 1000).toISOString(),
                                subscription.cancel_at_period_end,
                                subscription.id,
                            ],
                        )
                        .catch(() =>
                        {
                            throw Boom.badImplementation();
                        });

                    break;
                }
                case "customer.subscription.deleted":
                {
                    const subscription = event.data.object as Stripe.Subscription;

                    await Database.pool
                        .query(
                            `
                            update "subscriptions"
                            set
                                "status" = $1,
                                "deleted" = true
                            where
                                "stripe_id" = $2
                            `,
                            [
                                subscription.status,
                                subscription.id,
                            ],
                        )
                        .catch(() =>
                        {
                            throw Boom.badImplementation();
                        });

                    break;
                }
                case "customer.subscription.updated":
                {
                    const subscription = event.data.object as Stripe.Subscription;

                    await Database.pool
                        .query(
                            `
                            update "subscriptions"
                            set
                                "status" = $1,
                                "cancel_at_period_end" = $2
                            where
                                "stripe_id" = $3
                            `,
                            [
                                subscription.status,
                                subscription.cancel_at_period_end,
                                subscription.id,
                            ],
                        )
                        .catch(() =>
                        {
                            throw Boom.badImplementation();
                        });

                    break;
                }
                case "invoice.paid":
                {
                    const invoice = event.data.object as Stripe.Invoice;

                    if (typeof invoice.subscription !== "string")
                    {
                        throw Boom.badImplementation();
                    }

                    const subscription = await Config.STRIPE.subscriptions
                        .retrieve(invoice.subscription)
                        .catch(() =>
                        {
                            throw Boom.badImplementation();
                        });

                    await Database.pool
                        .query(
                            `
                            update "subscriptions"
                            set
                                "current_period_end" = $1,
                                "cancel_at_period_end" = $2
                            where
                                "stripe_id" = $3
                            `,
                            [
                                new Date(subscription.current_period_end * 1000).toISOString(),
                                subscription.cancel_at_period_end,
                                subscription.id,
                            ],
                        )
                        .catch(() =>
                        {
                            throw Boom.badImplementation();
                        });

                    break;
                }
                case "invoice.payment_failed":
                {
                    const invoice = event.data.object as Stripe.Invoice;

                    if (typeof invoice.subscription !== "string")
                    {
                        throw Boom.badImplementation();
                    }

                    const subscription = await Config.STRIPE.subscriptions.retrieve(invoice.subscription);

                    await Database.pool
                        .query(
                            `
                            update "subscriptions"
                            set
                                "status" = $1
                            where
                                "stripe_id" = $2
                            `,
                            [
                                subscription.status,
                                subscription.id,
                            ],
                        )
                        .catch(() =>
                        {
                            throw Boom.badImplementation();
                        });

                    break;
                }
                case "payment_intent.succeeded":
                {
                    const paymentIntent = event.data.object as Stripe.PaymentIntent;

                    if (typeof paymentIntent.customer !== "string")
                    {
                        throw Boom.badImplementation();
                    }

                    const isSubscription = paymentIntent.invoice !== null;

                    const wallet = await Wallet.retrieveWithStripeCustomerId(paymentIntent.customer);

                    await Database.pool
                        .query(
                            `
                            insert into "transactions"
                                ("id", "amount", "wallet", "reason", "external_id")
                            values
                                ($1, $2, $3, $4, $5)
                            `,
                            [
                                Utilities.id(Config.ID_PREFIXES.TRANSACTION),
                                paymentIntent.amount / 100, // Amount is in cents
                                wallet.id,
                                isSubscription
                                    ? "subscription"
                                    : "credit",
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
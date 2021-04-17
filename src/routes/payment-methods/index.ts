import Boom from "@hapi/boom";
import { ServerRoute } from "@hapi/hapi";
import Joi from "joi";
import { Config } from "../../config/Config";
import { Schema } from "../../config/Schema";
import { PaymentMethod } from "../../models/PaymentMethod";
import { User } from "../../models/User";
import { Wallet } from "../../models/Wallet";

export default <ServerRoute[]>[
    {
        method: "GET",
        path: "/wallets/{id}/payment-methods",
        options: {
            validate: {
                params: Joi.object({
                    id: Schema.ID.WALLET.required(),
                }),
            },
            response: {
                schema: Schema.ARRAY(PaymentMethod.SCHEMA.OBJ),
            },
        },
        handler: async (request, h) =>
        {
            const authenticatedUser = request.auth.credentials.user as User;

            const wallet = await Wallet.retrieve(request.params.id);

            if (authenticatedUser.id !== wallet.user.id)
            {
                throw Boom.forbidden();
            }

            const paymentMethods = await PaymentMethod.forWallet(wallet);

            const defaultPaymentMethod = await PaymentMethod.retrieveDefault(wallet);

            return paymentMethods.map(paymentMethod => ({
                ...paymentMethod.serialize(),
                __metadata: {
                    is_default: defaultPaymentMethod?.id === paymentMethod.id,
                },
            }));
        },
    },
    {
        method: "POST",
        path: "/wallets/{id}/payment-methods",
        options: {
            validate: {
                params: Joi.object({
                    id: Schema.ID.WALLET.required(),
                }),
                payload: Joi.object({
                    // ID of a Stripe Payment Method
                    id: Schema.STRING.required(),
                }),
            },
        },
        handler: async (request, h) =>
        {
            const authenticatedUser = request.auth.credentials.user as User;

            const wallet = await Wallet.retrieve(request.params.id);

            if (authenticatedUser.id !== wallet.user.id)
            {
                throw Boom.forbidden();
            }

            if (!wallet.stripe_customer_id)
            {
                throw Boom.badImplementation();
            }

            await Config.STRIPE.paymentMethods
                .attach(
                    (request.payload as any).id,
                    {
                        customer: wallet.stripe_customer_id,
                    },
                )
                .catch(() =>
                {
                    throw Boom.badImplementation();
                });

            return h.response();
        },
    },
    {
        method: "PUT",
        path: "/wallets/{id}/payment-methods/default",
        options: {
            validate: {
                params: Joi.object({
                    id: Schema.ID.WALLET.required(),
                }),
                payload: Joi.object({
                    id: Schema.ID.PAYMENT_METHOD.required(),
                }),
            },
        },
        handler: async (request, h) =>
        {
            const authenticatedUser = request.auth.credentials.user as User;

            const wallet = await Wallet.retrieve(request.params.id);

            if (authenticatedUser.id !== wallet.user.id)
            {
                throw Boom.forbidden();
            }

            if (!wallet.stripe_customer_id)
            {
                throw Boom.badImplementation();
            }

            const paymentMethod = await PaymentMethod.retrieve((request.payload as any).id);

            if (paymentMethod.wallet.id !== wallet.id)
            {
                throw Boom.forbidden();
            }

            await Config.STRIPE.customers
                .update(
                    wallet.stripe_customer_id,
                    {
                        invoice_settings: {
                            default_payment_method: paymentMethod.stripe_id,
                        },
                    },
                )
                .catch(() =>
                {
                    throw Boom.badImplementation();
                });

            return h.response();
        },
    },
    {
        method: "DELETE",
        path: "/payment-methods/{id}",
        options: {
            validate: {
                params: Joi.object({
                    id: Schema.ID.PAYMENT_METHOD.required(),
                }),
            },
        },
        handler: async (request, h) =>
        {
            const authenticatedUser = request.auth.credentials.user as User;

            const paymentMethod = await PaymentMethod.retrieve(request.params.id);

            if (authenticatedUser.id !== paymentMethod.wallet.user.id)
            {
                throw Boom.forbidden();
            }

            const defaultPaymentMethod = await PaymentMethod.retrieveDefault(paymentMethod.wallet);

            /**
             * The default payment method cannot be deleted if
             * the user has at least one active subscription
             */
            if
            (
                defaultPaymentMethod?.id === paymentMethod.id
                && await paymentMethod.wallet.hasActiveSubscriptions()
            )
            {
                throw Boom.forbidden();
            }

            await Config.STRIPE.paymentMethods
                .detach(paymentMethod.stripe_id)
                .catch(() =>
                {
                    throw Boom.badImplementation();
                });

            return h.response();
        },
    },
];

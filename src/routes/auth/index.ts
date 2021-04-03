import Boom from "@hapi/boom";
import crypto from "crypto";
import { ServerRoute } from "@hapi/hapi";
import sendgrid from "@sendgrid/mail";
import Joi from "joi";
import { Config } from "../../config/Config";
import { Session } from "../../models/Session";
import { User } from "../../models/User";
import Database from "../../utilities/Database";
import { Utilities } from "../../utilities/Utilities";
import { Schema } from "../../config/Schema";

sendgrid.setApiKey(process.env.SENDGRID_API_KEY ?? "");

export default <ServerRoute[]>[
    {
        method: "GET",
        path: "/auth/email/{token}",
        options: {
            auth: false,
            validate: {
                params: Joi.object({
                    token: Schema.STRING.required(),
                }),
            },
        },
        handler: async (request, h) =>
        {
            const result = await Database.pool
                .query(
                    `select * from "sign_in_requests" where "token" = $1`,
                    [ request.params.token ],
                );

            if (result.rowCount === 0)
            {
                throw Boom.notFound();
            }

            if
            (
                result.rows[0].expires_at < new Date()
                || result.rows[0].session !== null
            )
            {
                throw Boom.forbidden();
            }

            const user = await User.retrieve(result.rows[0].user);

            const session = await Session.create(user);

            await Database.pool
                .query(
                    `update "sign_in_requests" set "session" = $1 where "id" = $2`,
                    [ session.id, result.rows[0].id ],
                );

            return h.response();
        },
    },
    {
        method: "GET",
        path: "/auth/email/requests/{id}",
        options: {
            auth: false,
            validate: {
                params: Joi.object({
                    id: Schema.ID.SIGN_IN_REQUEST.required(),
                }),
            },
            response: {
                schema: Joi.object({
                    session: Session.SCHEMA.OBJ.required(),
                }),
            },
        },
        handler: async (request, h) =>
        {
            const result = await Database.pool
                .query(
                    `select * from "sign_in_requests" where "id" = $1`,
                    [ request.params.id ],
                );

            if (result.rowCount === 0 || !result.rows[0].session)
            {
                throw Boom.notFound();
            }

            if (result.rows[0].expires_at < new Date())
            {
                throw Boom.forbidden();
            }

            await Database.pool
                .query(
                    `delete from "sign_in_requests" where "id" = $1`,
                    [ result.rows[0].id ],
                );

            const session = await Session.retrieve(result.rows[0].session);

            return { session: session.serialize() };
        },
    },
    {
        method: "POST",
        path: "/auth/email",
        options: {
            auth: false,
            validate: {
                payload: Session.SCHEMA.CREATE,
            },
            response: {
                schema: Joi.object({
                    id: Schema.ID.SIGN_IN_REQUEST.required(),
                }),
            },
        },
        handler: async (request, h) =>
        {
            const { email } = request.payload as any;

            let user: User;

            if (await User.exists(email))
            {
                user = await User.retrieveWithEmail(email);
            }
            else
            {
                user = await User.create({ email });
            }

            const id = Utilities.id(Config.ID_PREFIXES.SIGN_IN_REQUEST);

            const token = crypto.randomBytes(Config.SIGN_IN_REQUEST_TOKEN_BYTES).toString("hex");

            const expires = new Date();
            expires.setSeconds(new Date().getSeconds() + Config.SIGN_IN_REQUEST_DURATION);

            const client = await Database.pool.connect();

            await client.query("begin");

            await client
                .query(
                    `
                    insert into "sign_in_requests"
                        ("id", "token", "user", "expires_at")
                    values
                        ($1, $2, $3, $4)
                    `,
                    [
                        id,
                        token,
                        user.id,
                        expires.toISOString(),
                    ],
                )
                .catch(async () =>
                {
                    await client.query("rollback");

                    throw Boom.badImplementation();
                });

            await sendgrid
                .send({
                    to: user.email,
                    from: "scootr.tokens@alexsandri.com",
                    subject: "[scootr] Accept Sign In Request",
                    text: "Hi,\n"
                        + "We received a request to sign into your account\n"
                        + "If this is you click the link below to accept the sign in\n"
                        + "If you are not sure and decide not to click it no one will gain access to your account\n\n"
                        + `${Config.API_HOST}/auth/email/${token}`,
                })
                .catch(async () =>
                {
                    await client.query("rollback");

                    throw Boom.badImplementation();
                });

            await client.query("commit");

            client.release();

            return { id };
        },
    },
];

import Boom from "@hapi/boom";
import { differenceInYears } from "date-fns";
import Joi from "joi";
import { Config } from "../config/Config";
import { Schema } from "../config/Schema";
import Database from "../utilities/Database";
import { Utilities } from "../utilities/Utilities";

interface IDatabaseUtente
{
    id: string,
    nome: string,
    cognome: string,
    email: string,
    data_nascita: Date,
    codice_fiscale: string,
    stripe_customer_id: string | null,
}

interface ICreaUtente
{
    nome: string,
    cognome: string,
    email: string,
    data_nascita: Date,
    codice_fiscale: string,
}

export interface IUtenteSerializzato
{
    id: string,
    nome: string,
    cognome: string,
    email: string,
    data_nascita: string,
    codice_fiscale: string,
}

export class Utente
{
    private constructor
    (
        public readonly id: string,
        public readonly nome: string,
        public readonly cognome: string,
        private _email: string,
        public readonly data_nascita: Date,
        public readonly codice_fiscale: string,
        public readonly stripe_customer_id: string | null,
    )
    {}

    public get email(): string
    {
        return this.email;
    }

    //////////
    // CRUD //
    //////////

    public static async crea(data: ICreaUtente): Promise<Utente>
    {
        if (differenceInYears(new Date(), data.data_nascita) < Config.UTENTE_ETA_MINIMA)
        {
            throw Boom.tooEarly(undefined, [
                {
                    field: "data_nascita",
                    error: `Per potersi registrare si deve avere almeno ${Config.UTENTE_ETA_MINIMA} anni compiuti`,
                },
            ]);
        }

        const client = await Database.pool.connect();

        await client.query("begin");

        const result = await client
            .query(
                `
                insert into "utenti"
                    ("id", "nome", "cognome", "email", "data_nascita", "codice_fiscale")
                values
                    ($1, $2, $3, $4, $5, $6)
                returning *
                `,
                [
                    Utilities.id(Config.PREFISSI_ID.UTENTE),
                    data.nome,
                    data.cognome,
                    data.email,
                    data.data_nascita.toISOString(),
                    data.codice_fiscale,
                ],
            )
            .catch(async () =>
            {
                await client.query("rollback");

                throw Boom.badRequest();
            });

        await Config.STRIPE.customers
            .create({
                name: `${data.nome} ${data.cognome}`,
                email: data.email,
                metadata: {
                    user_id: result.rows[0].id,
                },
            })
            .catch(async () =>
            {
                await client.query("rollback");

                throw Boom.badImplementation();
            });

        await client.query("commit");

        client.release();

        return Utente.deserializza(result.rows[0]);
    }

    public static async ottieni(id: string): Promise<Utente>
    {
        const result = await Database.pool
            .query(
                `select * from "utenti" where "id" = $1`,
                [ id ],
            );

        return Utente.deserializza(result.rows[0]);
    }

    public async elimina(): Promise<void>
    {
        const client = await Database.pool.connect();

        await client.query("begin");

        await Database.pool
            .query(
                `delete from "utenti" where "id" = $1`,
                [ this.id, ],
            );

        if (this.stripe_customer_id)
        {
            await Config.STRIPE.customers
                .del(this.stripe_customer_id)
                .catch(async () =>
                {
                    await client.query("rollback");
    
                    throw Boom.badImplementation();
                });
        }

        await client.query("commit");

        client.release();
    }

    ///////////////////
    // SERIALIZATION //
    ///////////////////

    public serializza(): IUtenteSerializzato
    {
        return {
            id: this.id,
            nome: this.nome,
            cognome: this.cognome,
            email: this.email,
            data_nascita: this.data_nascita.toISOString(),
            codice_fiscale: this.codice_fiscale,
        };
    }

    private static deserializza(data: IDatabaseUtente): Utente
    {
        return new Utente(
            data.id,
            data.nome,
            data.cognome,
            data.email,
            data.data_nascita,
            data.codice_fiscale,
            data.stripe_customer_id,
        );
    }

    /////////////
    // SCHEMAS //
    /////////////

    public static readonly SCHEMA = {
        CREATE: Joi.object({
            nome: Schema.STRING.required(),
            cognome: Schema.STRING.required(),
            email: Schema.EMAIL.required(),
            data_nascita: Schema.DATE.max("now").required(),
            codice_fiscale: Schema.CODICE_FISCALE.required(),
        }),
        UPDATE: Joi.object({
            email: Schema.EMAIL.optional(),
        }),
    } as const;
}

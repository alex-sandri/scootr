import Boom from "@hapi/boom";
import { Config } from "../config/Config";
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
}

interface ICreaUtente
{
    nome: string,
    cognome: string,
    email: string,
    data_nascita: Date,
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
    )
    {}

    public get email(): string
    {
        return this.email;
    }

    public static async crea(data: ICreaUtente): Promise<Utente>
    {
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

    private static deserializza(data: IDatabaseUtente): Utente
    {
        return new Utente(
            data.id,
            data.nome,
            data.cognome,
            data.email,
            data.data_nascita,
            data.codice_fiscale,
        );
    }
}

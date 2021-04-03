import Boom from "@hapi/boom";
import Database from "../utilities/Database";

interface IDatabaseUtente
{
    id: string,
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

    public static async crea(): Promise<Utente>
    {
        const result = await Database.pool
            .query(
                ``,
                [],
            )
            .catch(() =>
            {
                throw Boom.badRequest();
            });

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

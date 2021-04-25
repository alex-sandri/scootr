import { Pool, types } from "pg";

export default class Database
{
    public static pool: Pool;

    public static init(): void
    {
        Database.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            /**
             * TODO:
             * 
             * Find a way to avoid this in production
             */
            ssl: {
                rejectUnauthorized: false,
            },
        });

        types.setTypeParser(types.builtins.INT8, BigInt);

        types.setTypeParser(types.builtins.DATE, string => new Date(`${string}T00:00:00Z`));
        types.setTypeParser(types.builtins.TIMESTAMP, string => new Date(`${string.replace(" ", "T")}Z`));
    }
}

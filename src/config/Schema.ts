import Joi from "joi";
import JoiDate from "@joi/date";

export class Schema
{
    public static readonly STRING = Joi.string().trim();

    public static readonly ID = (prefix: string) => Schema.STRING.pattern(new RegExp(`^${prefix}_.+$`));

    public static readonly EMAIL = Schema.STRING.email();

    public static readonly DATE = Joi.extend(JoiDate); // TODO
    public static readonly DATETIME = Joi; // TODO

    public static readonly CODICE_FISCALE = Joi; // TODO
}

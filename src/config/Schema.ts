import BaseJoi from "joi";
import JoiDate from "@joi/date";

const Joi = BaseJoi.extend(JoiDate) as BaseJoi.Root;

export class Schema
{
    public static readonly STRING = Joi.string().trim();

    public static readonly ID = (prefix: string) => Schema.STRING.pattern(new RegExp(`^${prefix}_.+$`));

    public static readonly EMAIL = Schema.STRING.email();

    public static readonly DATE = Joi.date().utc().format("YYYY-MM-DD");
    public static readonly DATETIME = Joi.date().utc().format("YYYY-MM-DDTHH:mm:ss.SSSZ");

    public static readonly CODICE_FISCALE = Joi; // TODO
}

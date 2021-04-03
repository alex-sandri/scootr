import BaseJoi from "joi";
import JoiDate from "@joi/date";
import { Config } from "./Config";

const Joi = BaseJoi.extend(JoiDate) as BaseJoi.Root;

export class Schema
{
    public static readonly STRING = Joi.string().trim();

    // TODO: Find a way to make this obj type safe
    public static readonly ID = Object
        .entries(Config.PREFISSI_ID)
        .map(([ key, value ]) =>
        {
            return { [key]: Schema.STRING.pattern(new RegExp(`^${value}_.+$`)) };
        })
        .reduce((prev, curr) =>
        {
            return { ...prev, ...curr };
        }, {});

    public static readonly EMAIL = Schema.STRING.email();

    public static readonly DATE = Joi.date().utc().format("YYYY-MM-DD");
    public static readonly DATETIME = Joi.date().utc().format("YYYY-MM-DDTHH:mm:ss.SSSZ");

    public static readonly CODICE_FISCALE = Schema.STRING.uppercase().pattern(/^[A-Z]{6}[0-9]{2}[ABCDEHLMPRST][0-9]{2}[A-Z][0-9]{3}[A-Z]$/);
}

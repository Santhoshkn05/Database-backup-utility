const Joi = require("joi");

const loginSchema = Joi.object({
    email: Joi.string()
        .trim()
        .email()
        .required(),

    password: Joi.string()
        .min(8)
        .max(100)
        .required()
})
module.exports = loginSchema;
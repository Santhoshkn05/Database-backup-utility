const Joi = require("joi");

    const databaseSchema = Joi.object({
        name: Joi.string()
            .trim()
            .min(2)
            .max(100)
            .required(),

        db_type: Joi.string()
            .valid("postgresql", "mysql", "mongodb")
            .required(),
        
        host: Joi.string()
            .trim()
            .required(),

        port: Joi.number()
            .integer()
            .min(1)
            .max(65535)
            .required(),
        
        database_name: Joi.string()
            .trim()
            .required(),

        username: Joi.string()
            .trim()
            .required(),
        
        password: Joi.string()
            .min(1)
            .required()
    });

module.exports = databaseSchema;
const Joi = require("joi");

const idSchema = Joi.object({
    id: Joi.number()
        .integer()
        .positive()
        .required()
});
module.exports = idSchema;
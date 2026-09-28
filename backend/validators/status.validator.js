const Joi = require("joi");
const statusSchema = Joi.object({
    is_active: Joi.boolean().required()
});
module.exports = statusSchema;
const Joi = require("joi");
const restoreSchema = Joi.object({
    targetDatabase: Joi.string()
        .trim()
        .min(1)
        .required()
});
module.exports = restoreSchema;
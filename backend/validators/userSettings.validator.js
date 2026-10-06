const Joi = require("joi");

module.exports = Joi.object({
    notify_backup_success: Joi.boolean().required(),
    notify_backup_failure: Joi.boolean().required(),
    default_retention_count: Joi.number().valid(7, 14, 30, 60, 90).required()
});
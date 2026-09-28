const Joi = require("joi");
const cron = require("cron-validator");

const scheduleSchema = Joi.object({
    schedule: Joi.string()
        .trim()
        .required()
        .custom((value, helpers) => {
            if (!cron.isValidCron(value)) {
                return helpers.error("invalid");
            }
            return value;
        })
        .message ({
            "invalid": "Invalid cron expression"
        })
});
module.exports = scheduleSchema;
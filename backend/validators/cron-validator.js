const Joi = require("joi");
const cron = require("cron-validator");

const scheduleSchema = Joi.object({
    schedule: Joi.string()
    .trim()
    .require()
    .custom((value, helpers) => {
        if (!cron.isValidCron(value)) {
            return helpers.error("invalid");
        }
        return value;
    })
    .message ({
        "any.invalid" : "Invalid cron expression"
    })
});
module.exports = scheduleSchema;
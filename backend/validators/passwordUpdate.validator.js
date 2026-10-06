const Joi = require("joi");

module.exports = Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).max(100).required()
});
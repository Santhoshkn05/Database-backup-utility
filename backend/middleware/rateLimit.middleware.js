const rateLimit = require("express-rate-limit")

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    skip: (req) => req.path === "/me",
    message: {
        error: "Too many requests. Please try again later."
    }
});
module.exports = authLimiter;
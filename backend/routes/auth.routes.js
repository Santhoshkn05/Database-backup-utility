const express = require("express");
const router = express.Router();
const registerRoutes = require("../controllers/register");
const loginRoutes = require("../controllers/login");
const otpRoutes = require("../controllers/otp.controller");
const authLimiter = require("../middleware/ratelimit.middleware");

router.use(authLimiter);
router.use(registerRoutes);
router.use(loginRoutes);
router.use(otpRoutes);

module.exports = router;
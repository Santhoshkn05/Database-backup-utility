const express = require("express");
const router = express.Router();
const registerRoutes = require("../controllers/register");
const loginRoutes = require("../controllers/login");
const otpRoutes = require("../controllers/otp.controller");
// const authLimiter = require("../middleware/rateLimit.middleware");
const profileRoutes = require("../controllers/profile");

// router.use(authLimiter);
router.use(registerRoutes);
router.use(loginRoutes);
router.use(otpRoutes);
router.use(profileRoutes);

module.exports = router;
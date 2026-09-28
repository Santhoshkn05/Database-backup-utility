const express = require("express");
const router = express.Router();
const registerRoutes = require("../controllers/register");
const loginRoutes = require("../controllers/login");
const otpRoutes = require("../controllers/otp.controller");

router.use(registerRoutes);
router.use(loginRoutes);
router.use(otpRoutes);

module.exports = router;
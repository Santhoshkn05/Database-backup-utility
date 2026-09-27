const express = require("express");
const router = express.Router();
const registerRoutes = require("../controllers/register");
const loginRoutes = require("../controllers/login");
const authenticateToken = require("../middleware/auth.middleware");

router.use(registerRoutes);
router.use(loginRoutes);

module.exports = router;
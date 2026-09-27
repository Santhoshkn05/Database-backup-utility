const express = require("express");
const authenticateToken = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/protected", authenticateToken, (req, res) => {
    res.status(200).json({
        message: "You are authenticated",
        user: req.user
    });
});

module.exports = router;
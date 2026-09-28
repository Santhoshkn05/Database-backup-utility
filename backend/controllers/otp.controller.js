const express = require("express");
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../database');
const authenticateToken = require("../middleware/auth.middleware");
const transporter = require("../config/mail");

router.post("/send-otp", authenticateToken, async (req, res) => {
    const userId = req.user.userId;

    const userResult = await pool.query(
        `SELECT email
        FROM users
        WHERE id = $1`,
        [userId]
    );
    if (userResult.rows.length === 0) {
        return res.status(404).json({
            error: "User not found"
        });
    }
    const email = userResult.rows[0].email;

    try {
        const otp = crypto.randomInt(100000, 1000000).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        await pool.query(
            `INSERT INTO otp_verifications
            (user_id, otp_hash, expires_at)
            VALUES ($1, $2, $3)`,
            [userId, otpHash, expiresAt]
        );

        await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: email,
            subject: "Database Backup Utility - OTP Verification",
            text: `Your OTP is ${otp}. It will expires in 5 minutes.`
        });

        console.log("Generated OTP:", otp);
        return res.status(200).json({
            success: true,
            message: "OTP generated successfully"
        });
    } catch (error) {
        console.error("Failed to generate OTP:", error);
        return res.status(500).json({
            error: "Failed to generate OTP"
        });
    }
});
module.exports = router;
const express = require("express");
const bcrypt = require("bcrypt");
const pool = require('../database');
const jwt = require("jsonwebtoken");

const router = express.Router();

router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
        return res.status(400).json({
            error: "Email and Password are required to proceed"
        });
    }

    try {
        // Find user by email
        const query = `
            SELECT id, password_hash
            FROM users
            WHERE email = $1
        `;

        const result = await pool.query(query, [email]);

        // User not found
        if (result.rows.length === 0) {
            return res.status(401).json({
                error: "Invalid email or Password"
            });
        }
        const storedHash = result.rows[0].password_hash;

        // Compare entered password with stored hash
        const passwordMatch = await bcrypt.compare(
            password,
            storedHash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                error: "Invalid email or Password"
            });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not configured");
        }

        const token = jwt.sign({
            userId: result.rows[0].id,
            email
        }, process.env.JWT_SECRET, {
            expiresIn: "1h"
        });

        // Login successful
        return res.status(200).json({
            message: "Login Successful",
            token
        });

    } catch (err) {
        console.error("Login failed:", err);

        return res.status(500).json({
            error: "Internal server error"
        });
    }
});

module.exports = router;
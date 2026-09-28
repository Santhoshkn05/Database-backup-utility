const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../database");
const registerSchema = require("../validators/register.validator");

const router = express.Router();

router.post("/register", async (req, res) => {
    const {error, value} = registerSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            error: error.details[0].message
        });
    }
    const {name, email, password} = value;

    try {
        // Hash password
        const hash = await bcrypt.hash(password, 10);

        // Insert user
        const query = `
            INSERT INTO users (name, email, password_hash)
            VALUES ($1, $2, $3)
        `;

        await pool.query(query, [name, email, hash]);

        // Successful registration
        return res.status(201).json({
            message: "Registration Successful"
        });

    } catch (err) {

        // Duplicate email
        if (err.code === "23505") {
            return res.status(409).json({
                message: "Email already exists"
            });
        }

        console.error("Insert failed:", err);

        return res.status(500).json({
            error: "Internal server error"
        });
    }
});

module.exports = router;
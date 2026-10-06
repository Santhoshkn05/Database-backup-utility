const express = require("express");
const pool = require("../database");
const bcrypt = require("bcrypt");
const authenticationToken = require("../middleware/auth.middleware");
const profileSchema = require("../validators/profile.validator");
const passwordUpdateSchema = require("../validators/passwordUpdate.validator");
const userSettingsSchema = require("../validators/userSettings.validator");

const router = express.Router();
router.get("/me", authenticationToken, async(req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, email
            FROM users
            WHERE id = $1`,
            [req.user.userId]
        );
        if(result.rows.length === 0) {
            return res.status(404).json({
                error: "user not found"
            });
        }
        return res.status(200).json({
            success: true,
            data: {
                id: result.rows[0].id,
                name: result.rows[0].name,
                email: result.rows[0].email
            }
        });
    } catch (error) {
        console.error("Failed to fetch profile:", error);
        return res.status(500).json({
            error: "Failed to fetch profile"
        });
    }
});

router.patch("/me", authenticationToken, async (req, res) => {
    const {error, value} = profileSchema.validate(req.body);
    if (error) {
        return res.status(400).json({error: error.details[0].message});
    }

    try {
        const result = await pool.query(
            `UPDATE users SET name = $1, email = $2
            WHERE id = $3
            RETURNING id, name, email`,
            [value.name, value.email, req.user.userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({error: "User not found"});
        }
        return res.status(200).json({success: true, data: result.rows[0]});
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({error: "Email address is already in use"});
        }
        console.error("Failed to update profile:", error);
        return res.status(500).json({error: "Failed to update profile"});
    }
});

router.put("/password", authenticationToken, async (req, res) => {
    const {error, value} = passwordUpdateSchema.validate(req.body);
    if (error) {
        return res.status(400).json({error: error.details[0].message});
    }

    try {
        const result = await pool.query(
            "SELECT password_hash FROM users WHERE id = $1",
            [req.user.userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({error: "User not found"});
        }
        const currentPasswordMatches = await bcrypt.compare(
            value.currentPassword,
            result.rows[0].password_hash
        );
        if (!currentPasswordMatches) {
            return res.status(400).json({error: "Current password is incorrect"});
        }
        const passwordHash = await bcrypt.hash(value.newPassword, 10);
        await pool.query(
            "UPDATE users SET password_hash = $1 WHERE id = $2",
            [passwordHash, req.user.userId]
        );
        return res.status(200).json({success: true, message: "Password updated successfully"});
    } catch (error) {
        console.error("Failed to update password:", error);
        return res.status(500).json({error: "Failed to update password"});
    }
});

router.get("/settings", authenticationToken, async (req, res) => {
    try {
        const result = await pool.query(
            `INSERT INTO user_settings (user_id) VALUES ($1)
            ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
            RETURNING notify_backup_success, notify_backup_failure, default_retention_count`,
            [req.user.userId]
        );
        return res.status(200).json({success: true, data: result.rows[0]});
    } catch (error) {
        console.error("Failed to fetch settings:", error);
        return res.status(500).json({error: "Failed to fetch settings"});
    }
});

router.put("/settings", authenticationToken, async (req, res) => {
    const {error, value} = userSettingsSchema.validate(req.body);
    if (error) {
        return res.status(400).json({error: error.details[0].message});
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await client.query(
            `INSERT INTO user_settings
                (user_id, notify_backup_success, notify_backup_failure, default_retention_count)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id) DO UPDATE SET
                notify_backup_success = EXCLUDED.notify_backup_success,
                notify_backup_failure = EXCLUDED.notify_backup_failure,
                default_retention_count = EXCLUDED.default_retention_count
            RETURNING notify_backup_success, notify_backup_failure, default_retention_count`,
            [
                req.user.userId,
                value.notify_backup_success,
                value.notify_backup_failure,
                value.default_retention_count
            ]
        );
        await client.query(
            "UPDATE databases SET retention_count = $1 WHERE user_id = $2",
            [value.default_retention_count, req.user.userId]
        );
        await client.query("COMMIT");
        return res.status(200).json({success: true, data: result.rows[0]});
    } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        console.error("Failed to update settings:", error);
        return res.status(500).json({error: "Failed to update settings"});
    } finally {
        client.release();
    }
});

module.exports = router;
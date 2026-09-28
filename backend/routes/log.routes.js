const express = require('express');
const pool = require('../database');
const authenticateToken = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/databases/:id/logs', authenticateToken, async (req, res) => {
    const databaseId = req.params.id;

    try {
        const databaseResult = await pool.query(
            `SELECT id
            FROM databases
            WHERE id = $1
            AND user_id = $2`,
            [databaseId, req.user.userId]
        );
        if (databaseResult.rows.length === 0) {
            return res.status(404).json({
                error: "Databases not found"
            });
        }
        
        const result = await pool.query(
            `SELECT * FROM logs
             WHERE database_id = $1
             ORDER BY created_at DESC`,
            [databaseId]
        );

        res.status(200).json({
            success: true,
            message: "Logs fetched successfully",
            data: result.rows
        });
    } catch (error) {
        console.error("Failed to fetch logs:", error);

        res.status(500).json({
            error: "Failed to fetch logs"
        });
    }
});

module.exports = router;
const express = require('express');
const pool = require('../database');

const router = express.Router();

router.get('/databases/:id/logs', async (req, res) => {
    const databaseId = req.params.id;

    try {
        const result = await pool.query(
            `SELECT * FROM logs
             WHERE database_id = $1
             ORDER BY created_at DESC`,
            [databaseId]
        );

        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Failed to fetch logs:", error);

        res.status(500).json({
            error: "Failed to fetch logs"
        });
    }
});

module.exports = router;
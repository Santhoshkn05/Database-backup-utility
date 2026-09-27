const express = require('express');
const pool = require('../database');
const router = express.Router();
const {startSchedule, stopSchedule} = require('../scheduler/backup.scheduler');
const authenticateToken = require('../middleware/auth.middleware');
const { schedule } = require('node-cron');

router.post('/databases/:id/schedule', authenticateToken, async (req, res) => {
    const databaseId = req.params.id;
    const {schedule} = req.body;

    const databaseResult = await pool.query(
        `SELECT id
        FROM databases
        WHERE id = $1 AND user_id = $2`,
        [databaseId, req.user.userId]
    );
    if (databaseResult.rows.length === 0) {
        return res.status(404).json({
            error: "Database not found"
        });
    }

    if (!schedule) {
        return res.status(400).json({
            error: "Schedule is required"
        });
    }
    const scheduleResult = await pool.query(
        `INSERT INTO schedules
        (database_id, schedule)
        VALUES($1, $2)
        RETURNING *`,
        [databaseId, schedule]
    );
    startSchedule(scheduleResult.rows[0]);
    return res.status(201).json({
        message: "Schedule created successfully",
        schedule: scheduleResult.rows[0]
    });
});

router.get('/databases/:id/schedule', authenticateToken, async (req, res) => {
    const databaseId = req.params.id;
    try {
        const databaseResult = await pool.query(
            `SELECT id
            FROM databases
            WHERE id = $1 AND user_id = $2`,
            [databaseId, req.user.userId]
        );
        if (databaseResult.rows.length === 0) {
            return res.status(404).json({
                error: "Database not found"
            });
        }
        const result = await pool.query(
            `SELECT *
            FROM schedules
            WHERE database_id = $1
            ORDER BY created_at DESC`,
            [databaseId]
        );

        return res.status(200).json(result.rows);
    } catch (error) {
        console.error("failed to fetch schedule: ", error);
        return res.status(500).json({
            error: "Failed to fetch schedules"
        });
    }
});

router.put('/schedules/:id', authenticateToken, async (req, res) => {
    const scheduleId = Number(req.params.id);
    const {schedule} = req.body;

    if (!schedule) {
        return res.status(400).json({
            error: "Schedule is required"
        });
    }
    try {
        const scheduleOwner = await pool.query(
            `SELECT schedules.id
            FROM schedules
            JOIN databases
            ON schedules.database_id = databases.id
            WHERE schedules.id = $1
            AND databases.user_id = $2`,
            [scheduleId, req.user.userId]
        );
        if (scheduleOwner.rows.length === 0) {
            return res.status(404).json({
                error: "Schedules not found"
            });
        }
        const result = await pool.query(
            `UPDATE schedules
            SET schedule = $1
            WHERE id = $2
            RETURNING *`,
            [schedule, scheduleId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Schedule not found"
            });
        }

        stopSchedule(scheduleId);
        startSchedule(result.rows[0]);

        return res.status(200).json({
            message: "Schedule updated successfully",
            schedule: result.rows[0]
        });
    } catch (error) {
        console.error("Failed to update schedule: ", error);
        return res.status(500).json({
            error: "Failed to update schedule"
        });
    }
});

router.patch('/schedules/:id/status', authenticateToken, async (req, res) => {
    const scheduleId = req.params.id;
    const {is_active} = req.body;

    if (typeof is_active !== 'boolean') {
        return res.status(400).json({
            error: "is_active must be true or false"
        });
    }
    try {
        const scheduleOwner = await pool.query(
            `SELECT schedules.id
            FROM schedules
            JOIN databases
            ON schedules.database_id = databases.id
            WHERE schedules.id = $1
            AND databases.user_id = $2`,
            [scheduleId, req.user.userId]
        );
        if (scheduleOwner.rows.length === 0) {
            return res.status(404).json({
                error: "Schedule not found"
            });
        }

        const result = await pool.query(
            `UPDATE schedules
            SET is_active = $1
            WHERE id = $2
            RETURNING *`,
            [is_active, scheduleId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Schedule not found"
            });
        }
        return res.status(200).json({
            message: "Schedule status updated successfully",
            schedule: result.rows[0]
        });
    } catch (error) {
        console.error("Failed to update schedule status: ", error);
        return res.status(500).json({
            error: "Failed to update schedule status"
        });
    }
});

router.delete('/schedules/:id', authenticateToken, async(req, res) => {
    const scheduleId = Number(req.params.id);
    try {
        const scheduleOwner = await pool.query(
            `SELECT schedules.id
            FROM schedules
            JOIN databases
            ON SCHEDULES.DATABASE_ID = DATABASES.ID
            WHERE schedules.id = $1
            AND databases.user_id = $2`,
            [scheduleId, req.user.userId]
        );
        if (scheduleOwner.rows.length === 0) {
            return res.status(404).json({
                error: "Schedule not found"
            });
        }
        const result = await pool.query(
            `DELETE FROM schedules
            WHERE id = $1
            RETURNING *`,
            [scheduleId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json ({
                error: "Schedule not found"
            });
        }

        stopSchedule(scheduleId);

        return res.status(200).json({
            message: "Schedule deleted successfully",
            schedule: result.rows[0]
        });
    } catch (error) {
        console.error("Failed to delete schedule: ", error);
        return res.status(500).json({
            error: "failed to delete schedule"
        });
    }
});
module.exports = router;
const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const cron = require("node-cron");
const pool = require("../database");
const authenticateToken = require("../middleware/auth.middleware");

const router = express.Router();
const backupDirectory = path.resolve(__dirname, "..", "backups");

router.get("/", authenticateToken, async (req, res) => {
    try {
        const databaseResult = await pool.query(
            `SELECT id, name, db_type, database_name
            FROM databases
            WHERE user_id = $1
            ORDER BY id DESC`,
            [req.user.userId]
        );

        const [backupResult, scheduleResult] = await Promise.all([
            pool.query(
                `SELECT backups.*, databases.name AS database_name
                FROM backups
                JOIN databases ON databases.id = backups.database_id
                WHERE databases.user_id = $1
                ORDER BY backups.created_at DESC`,
                [req.user.userId]
            ),
            pool.query(
                `SELECT schedules.*, databases.name AS database_name
                FROM schedules
                JOIN databases ON databases.id = schedules.database_id
                WHERE databases.user_id = $1
                ORDER BY schedules.created_at DESC`,
                [req.user.userId]
            )
        ]);

        const databaseIds = new Set(databaseResult.rows.map((database) => String(database.id)));
        const schedules = scheduleResult.rows.map((schedule) => {
            let nextRunAt = null;
            if (schedule.is_active) {
                const task = cron.schedule(schedule.schedule, () => {});
                try {
                    nextRunAt = task.getNextRun()?.toISOString() ?? null;
                } finally {
                    task.destroy();
                }
            }
            return {
                ...schedule,
                databaseName: schedule.database_name,
                nextRunAt
            };
        }).sort((first, second) => {
            if (first.is_active !== second.is_active) return first.is_active ? -1 : 1;
            return new Date(first.nextRunAt || 0) - new Date(second.nextRunAt || 0);
        });
        let localStorageBytes = 0;

        try {
            const files = await fs.readdir(backupDirectory, {withFileTypes: true});
            const ownedBackupFiles = files.filter((file) =>
                file.isFile() &&
                file.name.endsWith(".gz") &&
                [...databaseIds].some((id) => file.name.startsWith(`backup-${id}-`))
            );
            const fileStats = await Promise.all(
                ownedBackupFiles.map((file) => fs.stat(path.join(backupDirectory, file.name)))
            );
            localStorageBytes = fileStats.reduce((total, file) => total + file.size, 0);
        } catch (error) {
            if (error.code !== "ENOENT") throw error;
        }

        return res.status(200).json({
            success: true,
            data: {
                databases: databaseResult.rows,
                backups: backupResult.rows.map((backup) => ({
                    ...backup,
                    databaseName: backup.database_name,
                    file_size: backup.file_size == null ? null : Number(backup.file_size)
                })),
                schedules,
                localStorageBytes
            }
        });
    } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        return res.status(500).json({error: "Failed to fetch dashboard data"});
    }
});

module.exports = router;
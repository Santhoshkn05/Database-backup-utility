const cron = require('node-cron');
const pool = require('../database');
const createBackup = require('../services/backup.service');
const schedulesJobs = new Map();

async function loadSchedules() {
    const result = await pool.query(
        `SELECT *
        FROM schedules
        WHERE is_active = true`
    );
        return result.rows;
}
async function startScheduler() {
    const schedules = await loadSchedules();
    for (const schedule of schedules) {
        startSchedule(schedule);
    }
}

function stopSchedule(scheduleId) {
    const job = schedulesJobs.get(scheduleId);
    if (job) {
        job.stop();
        schedulesJobs.delete(scheduleId);
    }
}

function startSchedule(schedule) {
    const job = cron.schedule(schedule.schedule, async () => {
        console.log(`schedules backup triggered for database ${schedule.database_id}`);
        try {
            const result = await createBackup(schedule.database_id);
            console.log(`Scheduled backup completed: ${result.file}`
            );
        } catch (error) {
            console.error (`Scheduled backup failed for database ${schedule.database_id}:`, error);
        }
    });
    schedulesJobs.set(schedule.id, job);
}

module.exports = {
    startScheduler,
    startSchedule,
    stopSchedule
};
startScheduler();
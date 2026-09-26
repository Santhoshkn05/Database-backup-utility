const pool = require('../database');
const fs = require('fs');
const {DeleteObjectCommand} = require('@aws-sdk/client-s3');
const {b2Client} = require('../services/b2Storage.service');

async function cleanupBackups(databaseId) {
    const result = await pool.query(
        `SELECT retention_count
        FROM databases
        WHERE id = $1`,
        [databaseId]
    );

    if (result.rows.length === 0) {
        throw new Error("Database not found");
    }
    const retentionCount = result.rows[0].retention_count;

    const backupsResult = await pool.query(
        `SELECT *
        FROM backups
        WHERE database_id = $1
        AND status = 'success'
        ORDER BY created_at DESC`,
        [databaseId]
    );

    const backupsToDelete = backupsResult.rows.slice(retentionCount);
    for (const backup of backupsToDelete) {
        const filePath = `backups/${backup.file_name}`;
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        const command = new DeleteObjectCommand({
            Bucket: process.env.B2_BUCKET_NAME,
            Key: backup.file_name
        });
        await b2Client.send(command);
        console.log(`Deleted backup from B2: ${backup.file_name}`);

        await pool.query(
            `DELETE FROM backups
            WHERE id = $1`,
            [backup.id]
        );
    }
}
module.exports = cleanupBackups;
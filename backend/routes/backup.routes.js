const express = require('express');
const pool = require('../database');
const router = express.Router();
const createBackup = require('../services/backup.service');
const restoreBackup = require('../services/restore.service');
const authenticateToken = require('../middleware/auth.middleware');

router.post('/databases/:id/backup', authenticateToken, async(req, res) => {
    const databaseId = req.params.id;
    try {
        const databaseResult = await pool.query(
            'SELECT id FROM databases WHERE id = $1 AND user_id = $2',
            [databaseId, req.user.userId]
        );
        if (databaseResult.rows.length === 0) {
            return res.status(404).json({
                error: "Database not found"
            });
        }
        const result = await createBackup(databaseId);
        res.status(201).json({
            message: "backup created successsfully",
            file: result.file
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Failed to created backup"
        });
    }
});

router.get('/databases/:id/backups', authenticateToken, async (req, res) => {
    const databaseId = req.params.id;
    try {
        const databaseResult = await pool.query(
            'SELECT id FROM databases WHERE id=$1 AND USER_ID = $2',
            [databaseId, req.user.userId]
        );
        if (databaseResult.rows.length === 0) {
            return res.status(404).json({
                error: "Database not found"
            });
        }
        const result = await pool.query(
            'SELECT * FROM backups WHERE database_id = $1 ORDER BY created_at DESC',
            [databaseId]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Failed to fetch backup history"
        });
    }
});

// router.post('/backups/:id/restore', async (req, res) => {
//     const backupId = req.params.id;
//     try {
//         const backupResult = await pool.query(
//             `SELECT * FROM backups WHERE id = $1`,
//             [backupId]
//         );
//         if (backupResult.rows.length === 0) {
//             return res.status(404).json({
//                 error: "Backup not found"
//             });
//         }
//         const backup = backupResult.rows[0];
//         await createLog(
//                 backup.database_id,
//                 "restore",
//                 "started",
//                 "Restore started"
//         );
        
//         const compressedFile = backup.file_name;
//         const restoreFile = compressedFile.replace('.gz', '');
//         const input = fs.createReadStream(`backups/${compressedFile}`);
//         input.on("error", (error) => {
//             console.error("Restore file read failed: ", error);
//             return res.status(500).json({
//                 error: "Failed to read backup file"
//             });
//         });

//         const output = fs.createWriteStream(`backups/${restoreFile}`);
//         output.on("error", async(error) => {
//             console.error("Restore file write failed:", error);
//             await pool.query(
//                 `INSERT INTO logs
//                 (database_id, action, status, message)
//                 VALUES($1, $2, $3, $4)`,
//                 [
//                     database.id,
//                     "backup",
//                     "failed",
//                     "Failed to write compressed backup file"
//                 ]
//             );
//             return res.status(500).json({
//                 error: "Failed to create restore file"
//             });
//     });

//         const gunzip = zlib.createGunzip();
//         gunzip.on("error", (error) => {
//             console.error("Decomposition failed: ", error);
//             return res.status(500).json({
//                 error: "Failed to decompress backup file"
//             });
//         });

//         input.pipe(gunzip).pipe(output);

//         output.on("finish", async ()=> {
//             console.log("Decompression completed");

//         const databaseResult = await pool.query(
//             'SELECT * FROM databases WHERE id = $1',
//             [backup.database_id]
//         );
//         if (databaseResult.rows.length === 0) {
//             return res.status(404).json({
//                 error: "Database not found"
//                 });
//         }
//         const database = databaseResult.rows[0];
//         const command = `"C:\\Program Files\\PostgreSQL\\14\\pgAdmin 4\\runtime\\psql.exe" -U ${database.username} -h ${database.host} -p ${database.port} -d restore_test -f "backups/${restoreFile}"`;
//         const env = {
//             ...process.env,
//             PGPASSWORD: database.password
//         };
//         const {exec} = require("child_process");
//         exec(command, {env}, async(error, stdout, stderr) => {
//             if (error) {
//                 console.error("Restore failed: ", error);
//                 await createLog(
//                     backup.database_id,
//                     "restore",
//                     "failed",
//                     "Restore failed"
//                 );
//                 return res.status(500).json({
//                     error: "Restore failed"
//                 });
//             }
//             console.log("Restore completed successfully");
//             try {
//             fs.unlinkSync (`backups/${restoreFile}`);
//             } catch (error) {
//                 console.error("Failed to delete temporary restore file:", error);
//                 return res.status(500).json({
//                     error: "Restore completed, but failed to remove temporary file"
//                 });
//             }
//             await createLog(
//                     backup.database_id,
//                     "restore",
//                     "success",
//                     "Restore completed successfully"
//             );

//             res.status(200).json({
//                 message: "Backup restored successfully"
//             });
//         });
//     });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({
//             error: "Failed to prepare restore"
//         });
//     }
// });
router.post('/backups/:id/restore', authenticateToken, async (req, res) => {
    const backupId = req.params.id;
    const {targetDatabase} = req.body;
    try {
        const backupResult = await pool.query(
            `SELECT backups.id
            FROM backups
            JOIN databases
            ON backups.database_id = databases.id
            WHERE backups.id = $1
            AND databases.user_id = $2`,
            [backupId, req.user.userId]
        );
        if (backupResult.rows.length === 0) {
            return res.status(404).json({
                error: "Backup not found"
            });
        }
        const result = await restoreBackup(backupId, targetDatabase);
        res.status(200).json({
            message: "backup restored successfully",
            file: result.restoreFile
        });
    } catch (error) {
        console.error("Restore failed: ", error);
        res.status(500).json({
            error: error.message
        });
    }
});
module.exports=router;
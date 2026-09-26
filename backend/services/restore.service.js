const pool = require('../database');
const zlib = require('zlib');
const fs = require('fs');
const {exec} = require('child_process');
const createLog = require('../utils/log');
const {downloadFromB2} = require('./b2Storage.service');

async function restoreBackup(backupId, targetDatabase) {
    const backupResult = await pool.query(
        `SELECT * FROM backups WHERE id = $1`,
        [backupId]
    );
    if (backupResult.rows.length === 0) {
        throw new Error("Backup not found");
    }
    const backup = backupResult.rows[0];
    const databaseResult = await pool.query(
        `SELECT * FROM databases WHERE id = $1`,
        [backup.database_id]
    );
    if (databaseResult.rows.length === 0) {
        throw new Error("Database not found");
    }
    const database = databaseResult.rows[0];
    await createLog(
        database.id,
        'restore',
        'started',
        `Restore started for backup ${backup.file_name}`
    );

    console.log("Backup found: ", backup.file_name);
    console.log("database type: ", database.db_type);

    const compressedFile = backup.file_name;
    const compressedPath = `backups/${compressedFile}`;
    if (!fs.existsSync(compressedPath)) {
        await downloadFromB2(compressedFile, compressedPath);
    }

    const restoreFile = compressedFile.replace('.gz', '');
    try {
    const input = fs.createReadStream(compressedPath);
    const output = fs.createWriteStream(`backups/${restoreFile}`);
    const gunzip = zlib.createGunzip();

    input.pipe(gunzip).pipe(output);
    await new Promise((resolve, reject) => {
        input.on('error', reject);
        gunzip.on('error', reject);
        output.on('error', reject);

        output.on('finish', resolve);
    });
    if (database.db_type === 'postgresql') {
            const command = `"C:\\Program Files\\PostgreSQL\\14\\pgAdmin 4\\runtime\\psql.exe" -U ${database.username} -h ${database.host} -p ${database.port} -d restore_test -f "backups/${restoreFile}"`;

            const env = {
                ...process.env,
                PGPASSWORD: database.password
            };
            await new Promise((resolve, reject) => {
                exec(command, {env}, (error, stdout, stderr) => {
                    if (error) {
                        console.error("PostgreSQL restore failed: ", error);
                        console.error("STDERR:", stderr);
                        return reject(new Error("PostgreSQL restore failed"));
                    }
                    console.log("PostgreSQL restore completed successfully");
                    resolve();
                });
            });
        }
        if (database.db_type === 'mysql') {
            // const command = `mysql -h ${database.host} -P ${database.port} -u ${database.username} ${database.database_name} < "backups/${restoreFile}"`;
            const command = `mysql -h ${database.host} -P ${database.port} -u ${database.username} ${targetDatabase} < "backups/${restoreFile}"`;
            const env = {
                ...process.env,
                MYSQL_PWD: database.password
            };
            await new Promise((resolve, reject) => {
                exec(command, {env}, (error, stdout, stderr) => {
                    if (error) {
                        console.error("MySQL restore failed: ", error);
                        console.error("STDERR: ", stderr);
                        return reject(new Error("MySQL restore failed"));
                    }
                    console.log("MySQL restore completed successfully");
                    resolve();
                });
            });
        }
        await createLog(
            database.id,
            'restore',
            'success',
            `Restore completed for backup ${backup.file_name}`
        );
        
        fs.unlinkSync(`backups/${restoreFile}`);
        return {
            backup,
            database,
            restoreFile
        };
    } catch (error) {
        await createLog(
            database.id,
            'restore',
            'failed',
            `Restore failed for backup ${backup.file_name}: ${error.message}`
        );
        throw error;
    } finally {
        if (fs.existsSync(`backups/${restoreFile}`)) {
            fs.unlinkSync(`backups/${restoreFile}`);
        }
    }
}
module.exports = restoreBackup;
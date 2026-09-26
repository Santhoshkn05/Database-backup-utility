const pool = require('../database');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
const {uploadToB2} = require('./b2Storage.service');
const createLog = require('../utils/log');
const verifyBackup = require('../utils/verifyBackup');
const cleanupBackups = require('../utils/cleanupBackups');
const sendEmail = require('./email.service');
const adapters = require('../adapters/mapping_pg_mysql');

const MAX_RETRIES =3;

async function createBackup(databaseId) {
  const result = await pool.query(
    `SELECT * FROM databases WHERE id = $1`,
    [databaseId]
  );

  if (result.rows.length === 0) {
    throw new Error('Database not found');
  }

  const database = result.rows[0];
  const backupDir = path.resolve(process.cwd(), 'backups');
  fs.mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = `backup-${database.id}-${timestamp}.sql`;
  const compressedFile = `${backupFile}.gz`;
  const backupPath = path.join(backupDir, backupFile);
  const compressedPath = path.join(backupDir, compressedFile);

  await createLog(database.id, 'backup', 'started', 'Backup started');

  const createDatabaseBackup = adapters[database.db_type];
  if (!createDatabaseBackup) {
    throw new Error(`Unsupported database type: ${database.db_type}`);
  }
  await createDatabaseBackup(database, backupPath);

  return new Promise((resolve, reject) => {

    function continueBackup() {
      const input = fs.createReadStream(backupPath);
      const output = fs.createWriteStream(compressedPath);
      const gzip = zlib.createGzip();

      input.on('error', (error) => {
        console.error('Backup file read failed:', error);
        reject(new Error('Failed to read backup file'));
      });

      output.on('error', (error) => {
        console.error('Backup file write failed:', error);
        reject(new Error('Failed to write compressed backup file'));
      });

      gzip.on('error', async (error) => {
        console.error('Compression failed:', error);
        await createLog(database.id, 'backup', 'failed', 'Backup compression failed');
        reject(new Error('Backup compression failed'));
      });

      input.pipe(gzip).pipe(output);

      output.on('finish', async () => {
        try {
          await verifyBackup(compressedPath);
          const stats = fs.statSync(compressedPath);
          if (stats.size === 0) {
            throw new Error('Compressed backup file is empty');
          }
          let cloudStatus = 'uploaded';

          let cloudRetryCount = 0;

          async function uploadWithRetry() {
            try {
              await uploadToB2(compressedPath, compressedFile);

              console.log('B2 upload successful');
            } catch (error) {
              cloudRetryCount++;

              console.error(
                `B2 upload attempt ${cloudRetryCount} failed:`,
                error.message
              );

              if (cloudRetryCount < MAX_RETRIES) {
                console.log(
                  `Retrying B2 upload... (${cloudRetryCount + 1}/${MAX_RETRIES})`
                );

                return uploadWithRetry();
              }

              throw new Error(
                'B2 upload failed after maximum retries'
              );
            }
          }

          try {
            await uploadWithRetry();
          } catch (error) {
            console.error('B2 upload failed:', error);

            if (fs.existsSync(compressedPath)) {
                fs.unlinkSync(compressedPath);
              }
              if (fs.existsSync(backupPath)) {
                fs.unlinkSync(backupPath);
            }
            await createLog(
              database.id,
              'backup',
              'failed',
              `B2 upload failed: ${error.message}`
            );
            throw new Error('Backup failed because cloud upload was unsuccessful');
          }
          fs.unlinkSync(backupPath);

          await pool.query(
            `INSERT INTO backups (database_id, file_name, status, file_size, cloud_status)
             VALUES ($1, $2, $3, $4, $5)`,
            [database.id, compressedFile, 'success', stats.size, cloudStatus]
          );

          try {
            await cleanupBackups(database.id);
          } catch (error) {
            console.error('Backup cleanup failed:', error);
          }

          await createLog(database.id, 'backup', 'success', 'Backup completed successfully');
          await sendEmail(
            process.env.NOTIFICATION_EMAIL,
            'Database Backup Successful',
            `Backup completed successfully.

Database: ${database.name}
Backup file: ${compressedFile}
File size: ${stats.size} bytes
Cloud storage: B2
Status: Success`
          );

          resolve({
            file: compressedFile,
            fileSize: stats.size,
            cloudStatus
          });
        } catch (error) {
          console.error('Backup finalization failed:', error);
          await createLog(database.id, 'backup', 'failed', 'Backup verification or save failed');
          await sendEmail(
            process.env.NOTIFICATION_EMAIL,
            `Database backup Failed`,
            `Backup failed
Database: ${database.name}
Status: Failed
Reason: ${error.message}`
          );
          reject(error);
        }
      });
    }
    continueBackup()
  });
}

module.exports = createBackup;
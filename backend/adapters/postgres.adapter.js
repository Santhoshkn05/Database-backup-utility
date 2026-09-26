const {execFile} = require('child_process');
const PG_DUMP_PATH = 'C:\\Program Files\\PostgreSQL\\14\\pgAdmin 4\\runtime\\pg_dump.exe';
const MAX_RETRIES = 3;

async function createPostgresBackup(database, backupPath) {
    const env = {
        ...process.env,
        PGPASSWORD: database.password
    };
    const pgDumpArgs = [
        '-U', database.username,
        '-h', database.host,
        '-p', String(database.port),
        '-d', database.database_name,
        '-f', backupPath
    ];
    return new Promise((resolve, reject) => {
        let retryCount = 0;
        function runBackup() {
            execFile(
                PG_DUMP_PATH,
                pgDumpArgs,
                {env},
                (error, stdout, stderr) => {
                    if (error) {
                        console.error(`PostgreSQL backup attempt ${retryCount} failed`);
                        console.error('ERROR:', error);
                        console.error('STDERR:', stderr);

                        if (retryCount < MAX_RETRIES) {
                            return runBackup();
                        }
                        return reject(
                            new Error(
                                `PostgreSQL backup failed after maximum retries`
                            )
                        );
                    }
                    resolve();
                }
            );
        }
        runBackup();
    });
}
module.exports = {
    createBackup: createPostgresBackup,
    extension: '.sql'
};
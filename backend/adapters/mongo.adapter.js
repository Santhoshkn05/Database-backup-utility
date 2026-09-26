const {execFile} = require('child_process');
const MONGO_DUMP_PATH = 'C:\\Program Files\\MongoDB\\Tools\\100\\bin\\mongodump.exe';
const MONGO_RESTORE_PATH = 'C:\\Program Files\\MongoDB\\Tools\\100\\bin\\mongorestore.exe';

async function createMongoBackup(database, backupPath) {
    const mongoDumpArgs = [
        '--host', database.host,
        '--port', String(database.port),
        '--db', database.database_name,
        '--archive=' + backupPath
    ];
    return new Promise((resolve, reject) => {
        execFile(
            MONGO_DUMP_PATH,
            mongoDumpArgs,
            (error, stdout, stderr) => {
                if (error) {
                    console.error('MongoDB backup failed:', error);
                    console.error('STDERR:', stderr);
                    return reject(
                        new Error('MongoDB backup failed')
                    );
                }
                resolve();
            }
        );
    });
}

async function restoreMongoBackup(database, restorePath, targetDatabase) {
    const mongoRestoreArgs = [
        '--host', database.host,
        '--port', String(database.port),
        '--archive=' + restorePath,
        '--nsFrom=' + database.database_name + '.*',
        '--nsTo=' + targetDatabase + '.*'
    ];

    return new Promise((resolve, reject) => {
        execFile(
            MONGO_RESTORE_PATH,
            mongoRestoreArgs,
            (error, stdout, stderr) => {
                console.log('MongoDB restore stdout:', stdout);
                console.log('MongoDB restore stderr:', stderr);
                if (error) {
                    console.error('MongoDB restore failed:', error);
                    console.error("STDERR:", stderr);
                    return reject(new Error('MongoDB restore failed'));
                }
                resolve();
            }
        );
    });
}
module.exports = {
    createBackup: createMongoBackup,
    restoreBackup: restoreMongoBackup,
    extension: '.archive'
};
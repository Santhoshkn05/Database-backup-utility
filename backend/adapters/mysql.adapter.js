const createMySQLBackup = require('../services/mysqlBackup.service');

async function createMysqlBackup(database, backupPath) {
    await createMySQLBackup({
        host: database.host,
        port: database.port,
        user: database.username,
        password: database.password,
        database: database.database_name
    },
backupPath
);
}
module.exports = createMysqlBackup;
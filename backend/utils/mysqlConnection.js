const mysql = require('mysql2/promise');
async function mysqlConnection(config) {
    const connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database
    });
    return connection;
}
module.exports = mysqlConnection;
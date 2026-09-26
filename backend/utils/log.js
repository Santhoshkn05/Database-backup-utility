const pool = require('../database');

async function createLog(databaseId, action, status, message) {
    await pool.query(
        `INSERT INTO logs
        (database_id, action, status, message)
            VALUES($1, $2, $3, $4)`,
            [
                databaseId,
                action, 
                status,
                message
            ]
    );
}
module.exports = createLog;
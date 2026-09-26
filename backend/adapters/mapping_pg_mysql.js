const createPostgreBackup = require('./postgres.adapter');
const createMysqlBackup = require('./mysql.adapter');

const adapter = {
    postgresql: createPostgreBackup,
    mysql: createMysqlBackup
};
module.exports = adapter;
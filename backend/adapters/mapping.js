const mongoAdapter = require('./mongo.adapter');
const postgresAdapter = require('./postgres.adapter');
const mysqlAdapter = require('./mysql.adapter');

const adapters = {
    postgresql: postgresAdapter,
    mysql: mysqlAdapter,
    mongodb: mongoAdapter
};
module.exports = adapters;
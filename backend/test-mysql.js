const mysqlConnection = require('./utils/mysqlConnection');

const config = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'Santhosh@21',
    database: 'backup_test'
};

async function test() {
    try {
        const connection = await mysqlConnection(config);

        console.log('MySQL connection successful');

        await connection.end();
    } catch (error) {
        console.error('MySQL connection failed:', error.message);
    }
}

test();
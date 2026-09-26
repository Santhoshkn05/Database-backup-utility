const createMySQLBackup = require('./services/mysqlBackup.service');

const config = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'Santhosh@21',
    database: 'backup_test'
};

async function test() {
    try {
        const result = await createMySQLBackup(config);

        console.log('Backup created:', result.file);
    } catch (error) {
        console.error('Backup failed:', error.message);
    }
}

test();
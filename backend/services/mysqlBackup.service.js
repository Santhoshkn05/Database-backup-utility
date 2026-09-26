const {exec} = require('child_process');
async function createMySQLBackup(config, fileName) {
    return new Promise((resolve, reject) => {
        // const fileName = `${config.database}-${Date.now()}.sql`;
        const command = `mysqldump -h ${config.host} -P ${config.port} -u ${config.user} ${config.database} > "${fileName}"`;
        const env = {
            ...process.env,
            MYSQL_PWD: config.password
        };
        exec (command, {env}, (error, stdout, stderr) => {
            if (error) {
                console.error("MySQL backup failed: ", error);
                return reject(error);
            }
            console.log("MySQL backup created successfully");
            resolve ({
                file: fileName
            });
        });
    });
}
module.exports = createMySQLBackup;
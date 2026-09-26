const {exec} = require("child_process");
const command = `"C:\\Program Files\\PostgreSQL\\18\\pgAdmin 4\\runtime\\pg_dump.exe" -U postgres -h localhost -p 5432 -d testdb -f "backup-test.sql"`;

exec(command, (error, stdout, stderr) => {
    if(error) {
        console.error("Backup failed: ");
        console.error(error.message);
        return;
    }
    console.log("Backup created successfully");
    if(stderr) {
        console.log(stderr);
    }
});
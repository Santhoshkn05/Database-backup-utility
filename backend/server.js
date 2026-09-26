const express = require('express');
const databaseRoutes = require('./routes/database.routes');
const backupRoutes = require('./routes/backup.routes');
const logRoutes = require('./routes/log.routes');
const scheduleRoutes = require('./routes/schedule.routes')
const startScheduler = require('./scheduler/backup.scheduler');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(databaseRoutes);
app.use(backupRoutes);
app.use(logRoutes);
app.use(scheduleRoutes);

app.listen(PORT, () => {
    console.log(`server starts ${PORT}`);
});
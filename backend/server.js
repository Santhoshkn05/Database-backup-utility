const express = require('express');
const databaseRoutes = require('./routes/database.routes');
const backupRoutes = require('./routes/backup.routes');
const logRoutes = require('./routes/log.routes');
const scheduleRoutes = require('./routes/schedule.routes')
const startScheduler = require('./scheduler/backup.scheduler');
const authRoutes = require("./routes/auth.routes");
const testRoutes = require("./routes/test.routes");
const app = express();
const PORT = 3000;

app.use(express.json());
app.use("/auth", authRoutes);
app.use(databaseRoutes);
app.use(backupRoutes);
app.use(logRoutes);
app.use(scheduleRoutes);
app.use("/test", testRoutes);

app.listen(PORT, () => {
    console.log(`server starts ${PORT}`);
});
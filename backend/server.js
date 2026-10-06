const express = require('express');
const databaseRoutes = require('./routes/database.routes');
const backupRoutes = require('./routes/backup.routes');
const logRoutes = require('./routes/log.routes');
const scheduleRoutes = require('./routes/schedule.routes')
const {startScheduler} = require('./scheduler/backup.scheduler');
const authRoutes = require("./routes/auth.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const testRoutes = require("./routes/test.routes");
const errorHandler = require("./middleware/error.middleware");
const pool = require("./database");
const {checkB2Health} = require("./services/b2Storage.service");
const helmet = require("helmet");
const app = express();
const PORT = 3000;
const cors = require("cors");

app.use(helmet());
app.use(cors());
app.use(express.json({limit: "1mb"}));
app.get("/health", async (req, res) => {
    const [postgresResult, cloudResult] = await Promise.allSettled([
        pool.query({text: "SELECT 1", query_timeout: 5000}),
        checkB2Health()
    ]);

    res.status(200).json({
        success: true,
        data: {
            api: "Operational",
            postgresql: postgresResult.status === "fulfilled" ? "Connected" : "Unavailable",
            cloudStorage: cloudResult.status === "fulfilled" && cloudResult.value
                ? "Operational"
                : "Unavailable"
        }
    });
});
app.use("/auth", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use(databaseRoutes);
app.use(backupRoutes);
app.use(logRoutes);
app.use(scheduleRoutes);
app.use("/test", testRoutes);
app.use(errorHandler);

if (require.main == module) {
    console.log(`[backend] Starting PID ${process.pid} with Node ${process.version} from ${process.cwd()}`);
    const server = app.listen(PORT, () => {
        console.log(`[backend] HTTP listener active on port ${PORT} (PID ${process.pid})`);
        startScheduler().then(() => {
            console.log("[backend] Backup scheduler initialized");
        }).catch((error) => {
            console.error("[backend] Failed to initialize backup schedules:", error);
        });
    });

    server.on("error", (error) => {
        console.error("[backend] HTTP listener error:", error);
        process.exitCode = 1;
    });
    server.on("close", () => {
        console.error("[backend] HTTP listener closed");
    });
    process.on("uncaughtExceptionMonitor", (error, origin) => {
        console.error(`[backend] Uncaught exception (${origin}):`, error);
    });
    process.on("beforeExit", (code) => {
        console.error(`[backend] Event loop empty; Node is about to exit with code ${code}`);
    });
    process.on("exit", (code) => {
        console.error(`[backend] Process exiting with code ${code}`);
    });
}
module.exports = app;
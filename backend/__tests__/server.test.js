const request = require("supertest");
const app = require("../server");
const jwt = require("jsonwebtoken");
const pool = require("../database");
const { stopSchedule } = require("../scheduler/backup.scheduler");

test("Protected route should reject request without token", async () => {
    const response = await request(app)
        .get("/test/protected");

    expect(response.statusCode).toBe(401);
});
test("Protected route should reject invalid token", async () => {
    const response = await request(app)
        .get("/test/protected")
        .set("Authorization", "Bearer invalid-token");

    expect(response.statusCode).toBe(401);
});
test("Protected route should accept valid token", async () => {
    const token = jwt.sign(
        {
            userId: 20,
            email: "santhoshkn@gmail.com"
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1h"
        }
    );

    const response = await request(app)
        .get("/test/protected")
        .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
});
test("Database list should require authentication", async () => {
    const response = await request(app)
        .get("/databases");

    expect(response.statusCode).toBe(401);
});
test("Database list should allow authenticated user", async () => {
    const token = jwt.sign(
        {
            userId: 20,
            email: "santhoshkn@gmail.com"
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1h"
        }
    );

    const response = await request(app)
        .get("/databases")
        .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty("message");
    expect(response.body).toHaveProperty("data");
    expect(Array.isArray(response.body.data)).toBe(true);
});

test("User should not access another user's backups", async () => {
    const token = jwt.sign(
        {
            userId: 20,
            email: "santhoshkn@gmail.com"
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1h"
        }
    );

    const response = await request(app)
        .get("/databases/10/backups")
        .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(404);
});

test("Create database should reject invalid database type", async () => {
    const token = jwt.sign(
        {
            userId: 20,
            email: "santhoshkn@gmail.com"
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1h"
        }
    );

    const response = await request(app)
        .post("/databases")
        .set("Authorization", `Bearer ${token}`)
        .send({
            name: "Invalid Database",
            db_type: "oracle",
            host: "localhost",
            port: 1521,
            database_name: "test",
            username: "test",
            password: "test"
        });

    expect(response.statusCode).toBe(400);
});

test("Create database should reject missing name", async () => {
    const token = jwt.sign(
        {
            userId: 20,
            email: "santhoshkn@gmail.com"
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1h"
        }
    );

    const response = await request(app)
        .post("/databases")
        .set("Authorization", `Bearer ${token}`)
        .send({
            db_type: "postgresql",
            host: "localhost",
            port: 5432,
            database_name: "testdb",
            username: "postgres",
            password: "test"
        });

    expect(response.statusCode).toBe(400);
});

test("Authenticated user should create a database", async () => {
    const token = jwt.sign(
        {
            userId: 20,
            email: "santhoshkn@gmail.com"
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1h"
        }
    );

    const response = await request(app)
        .post("/databases")
        .set("Authorization", `Bearer ${token}`)
        .send({
            name: `Jest Test DB ${Date.now()}`,
            db_type: "postgresql",
            host: "localhost",
            port: 5432,
            database_name: "testdb",
            username: "postgres",
            password: "test"
        });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty("message");
});

test("User should not test another user's database connection", async () => {
    const token = jwt.sign(
        {
            userId: 20,
            email: "santhoshkn@gmail.com"
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1h"
        }
    );

    const response = await request(app)
        .post("/databases/10/test")
        .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(404);
});

test("Backup creation should require authentication", async () => {
    const response = await request(app)
        .post("/databases/11/backup");

    expect(response.statusCode).toBe(401);
});

test("Authenticated user should test database connection", async () => {
    const token = jwt.sign(
        {
            userId: 20,
            email: "santhoshkn@gmail.com"
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1h"
        }
    );

    const response = await request(app)
        .post("/databases/11/test")
        .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty("message");
});

test("User should not create backup for another user's database", async () => {
    const token = jwt.sign(
        {
            userId: 20,
            email: "santhoshkn@gmail.com"
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1h"
        }
    );

    const response = await request(app)
        .post("/databases/10/backup")
        .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(404);
});

test("Backup history should require authentication", async () => {
    const response = await request(app)
        .get("/databases/11/backups");

    expect(response.statusCode).toBe(401);
});

test("User should not view another user's backup history", async () => {
    const token = jwt.sign(
        {
            userId: 20,
            email: "santhoshkn@gmail.com"
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1h"
        }
    );

    const response = await request(app)
        .get("/databases/10/backups")
        .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(404);
});

test("Restore should require authentication", async () => {
    const response = await request(app)
        .post("/backups/1676/restore")
        .send({
            targetDatabase: "restore_test"
        });

    expect(response.statusCode).toBe(401);
});

test("User should not restore another user's backup", async () => {
    const token = jwt.sign(
        {
            userId: 20,
            email: "santhoshkn@gmail.com"
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1h"
        }
    );

    const response = await request(app)
        .post("/backups/1676/restore")
        .set("Authorization", `Bearer ${token}`)
        .send({
            targetDatabase: "restore_test"
        });

    expect(response.statusCode).toBe(404);
});

test("Restore should reject missing target database", async () => {
    const token = jwt.sign(
        {
            userId: 20,
            email: "santhoshkn@gmail.com"
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1h"
        }
    );

    const response = await request(app)
        .post("/backups/1676/restore")
        .set("Authorization", `Bearer ${token}`)
        .send({});

    expect(response.statusCode).toBe(400);
});

test("Authenticated user should restore a backup", async () => {
    const token = jwt.sign(
        {
            userId: 20,
            email: "santhoshkn@gmail.com"
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1h"
        }
    );

    const backupResult = await pool.query(
        `SELECT backups.id
         FROM backups
         JOIN databases
         ON backups.database_id = databases.id
         WHERE databases.id = 11
         AND databases.user_id = 20
         ORDER BY backups.created_at DESC
         LIMIT 1`
    );

    const backupId = backupResult.rows[0].id;

    const response = await request(app)
        .post(`/backups/${backupId}/restore`)
        .set("Authorization", `Bearer ${token}`)
        .send({
            targetDatabase: "restore_test"
        });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty("message");
    expect(response.body).toHaveProperty("data");
    expect(response.body.data).toHaveProperty("file");
}, 30000);

test("Logs should require authentication", async () => {
    const response = await request(app)
        .get("/databases/11/logs");

    expect(response.statusCode).toBe(401);
});

test("User should not view another user's logs", async () => {
    const token = jwt.sign(
        {
            userId: 20,
            email: "santhoshkn@gmail.com"
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1h"
        }
    );

    const response = await request(app)
        .get("/databases/10/logs")
        .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(404);
});

test("Schedule creation should require authentication", async () => {
    const response = await request(app)
        .post("/databases/11/schedule")
        .send({
            schedule: "* * * * *"
        });

    expect(response.statusCode).toBe(401);
});

test("User should not create schedule for another user's database", async () => {
    const token = jwt.sign(
        {
            userId: 20,
            email: "santhoshkn@gmail.com"
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1h"
        }
    );

    const response = await request(app)
        .post("/databases/10/schedule")
        .set("Authorization", `Bearer ${token}`)
        .send({
            schedule: "* * * * *"
        });

    expect(response.statusCode).toBe(404);
});

test("Schedule creation should reject invalid schedule", async () => {
    const token = jwt.sign(
        {
            userId: 20,
            email: "santhoshkn@gmail.com"
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1h"
        }
    );

    const response = await request(app)
        .post("/databases/11/schedule")
        .set("Authorization", `Bearer ${token}`)
        .send({
            schedule: "invalid-cron"
        });

    expect(response.statusCode).toBe(400);
});

test("Authenticated user should create a schedule", async () => {
    const token = jwt.sign(
        {
            userId: 20,
            email: "santhoshkn@gmail.com"
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1h"
        }
    );

    const response = await request(app)
        .post("/databases/11/schedule")
        .set("Authorization", `Bearer ${token}`)
        .send({
            schedule: "0 0 * * *"
        });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);

    stopSchedule(response.body.data.id);
});

test("Schedule fetch should require authentication", async () => {
    const response = await request(app)
        .get("/databases/11/schedule");

    expect(response.statusCode).toBe(401);
});

test("User should not view another user's schedule", async () => {
    const token = jwt.sign(
        {
            userId: 20,
            email: "santhoshkn@gmail.com"
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1h"
        }
    );

    const response = await request(app)
        .get("/databases/10/schedule")
        .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(404);
});

test("Authenticated user should fetch logs", async () => {
    const token = jwt.sign(
        {
            userId: 20,
            email: "santhoshkn@gmail.com"
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1h"
        }
    );

    const response = await request(app)
        .get("/databases/11/logs")
        .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
});

test("Authenticated user should fetch backup history", async () => {
    const token = jwt.sign(
        {
            userId: 20,
            email: "santhoshkn@gmail.com"
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1h"
        }
    );

    const response = await request(app)
        .get("/databases/11/backups")
        .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
});

test("Authenticated user should create a backup", async () => {
    const token = jwt.sign(
        {
            userId: 20,
            email: "santhoshkn@gmail.com"
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1h"
        }
    );

    const response = await request(app)
        .post("/databases/11/backup")
        .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty("message");
    expect(response.body).toHaveProperty("data");
    expect(response.body.data).toHaveProperty("file");
}, 30000);

afterAll(async () => {
    await pool.end();
});
const express = require('express');
const pool = require('../database');
const router = express.Router();
const authenticateToken = require('../middleware/auth.middleware');
const databaseSchema = require('../validators/database.validator');
const {Client: PostgresClient} = require("pg");
const mysql = require("mysql2/promise");
const {MongoClient} = require("mongodb");
const databaseUpdateSchema = databaseSchema.fork(["password"], (schema) => schema.optional());

async function testConnection(database)  {
    const dbType = String(database.db_type || "")
        .trim()
        .toLocaleLowerCase();
    
    if (dbType === "postgresql") {
        const client = new PostgresClient({
            host: database.host,
            port: database.port,
            user: database.username,
            password: database.password,
            database: database.database_name,
            connectionTimeoutMillis: 5000
        });

        try {
            await client.connect();
            await client.query("SELECT 1");
        } finally {
            await client.end().catch(() => {});
        }
        return;
    }
    if (dbType === "mysql") {
        const connection = await mysql.createConnection({
            host: database.host,
            port: database.port,
            user: database.username,
            password: database.password,
            database: database.database_name,
            connectTimeout: 5000
        });
        try {
            await connection.ping();
        } finally {
            await connection.end();
        }
        return;
    }
    if (dbType === "mongodb") {
        const client = new MongoClient(
            `mongodb://${database.host}:${database.port}`,
            {
                auth: database.username
                ?{
                    username: database.username,
                    password: database.password
                }
                : undefined,
            serverSelectionTimeoutMS: 5000
            }
        );
        try {
            await client.connect();
            await client.db(database.database_name).command({ping: 1});
        } finally {
            await client.close();
        }
        return;
    }
    throw new Error(`Unsupported database type: ${database.db_type}`);
}

router.post('/databases', authenticateToken, async (req, res) => {

    const {error, value} = databaseSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            error: error.details[0].message
        });
    }
    const database = value

    if (!database.name) {
        res.status(400).json({
            error: "Database name is required"
        });
        return;
    }

    const query = `INSERT INTO databases
        (user_id, name, db_type, host, port, database_name, username, password, retention_count)
        VALUES($1, $2, $3, $4, $5, $6, $7, $8,
            COALESCE((SELECT default_retention_count FROM user_settings WHERE user_id = $1), 7))`;
    const values = [
        req.user.userId,
        database.name,
        database.db_type,
        database.host,
        database.port,
        database.database_name,
        database.username,
        database.password
    ];

    try {
        await pool.query(query, values);

        res.status(201).json({
            success: true,
            message: "Database added successfully"
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            error: "Failed to add database"
        });
    }
});

router.put('/databases/:id', authenticateToken, async (req, res) => {
    const databaseId = Number(req.params.id);
    if (!Number.isInteger(databaseId) || databaseId < 1) {
        return res.status(400).json({error: "Invalid database ID"});
    }

    const requestBody = {
        ...req.body,
        password: req.body.password === "" ? undefined : req.body.password
    };
    const {error, value} = databaseUpdateSchema.validate(requestBody);
    if (error) {
        return res.status(400).json({error: error.details[0].message});
    }

    try {
        const result = await pool.query(
            `UPDATE databases
            SET name = $1, db_type = $2, host = $3, port = $4,
                database_name = $5, username = $6,
                password = COALESCE($7, password)
            WHERE id = $8 AND user_id = $9
            RETURNING id`,
            [
                value.name,
                value.db_type,
                value.host,
                value.port,
                value.database_name,
                value.username,
                value.password || null,
                databaseId,
                req.user.userId
            ]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({error: "Database not found"});
        }
        return res.status(200).json({success: true, message: "Database updated successfully"});
    } catch (updateError) {
        console.error("Failed to update database:", updateError);
        return res.status(500).json({error: "Failed to update database"});
    }
});

router.delete('/databases/:id', authenticateToken, async (req, res) => {
    const databaseId = Number(req.params.id);
    if (!Number.isInteger(databaseId) || databaseId < 1) {
        return res.status(400).json({error: "Invalid database ID"});
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const database = await client.query(
            `SELECT id FROM databases WHERE id = $1 AND user_id = $2 FOR UPDATE`,
            [databaseId, req.user.userId]
        );
        if (database.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({error: "Database not found"});
        }

        const dependencies = await client.query(
            `SELECT
                EXISTS(SELECT 1 FROM backups WHERE database_id = $1) AS has_backups,
                EXISTS(SELECT 1 FROM schedules WHERE database_id = $1) AS has_schedules,
                EXISTS(SELECT 1 FROM logs WHERE database_id = $1) AS has_logs`,
            [databaseId]
        );
        const {has_backups, has_schedules, has_logs} = dependencies.rows[0];
        if (has_backups || has_schedules || has_logs) {
            await client.query("ROLLBACK");
            return res.status(409).json({
                error: "This database has backup, schedule, or log history. Remove that history before deleting the connection."
            });
        }

        await client.query("DELETE FROM databases WHERE id = $1", [databaseId]);
        await client.query("COMMIT");
        return res.status(200).json({success: true, message: "Database deleted successfully"});
    } catch (deleteError) {
        await client.query("ROLLBACK").catch(() => {});
        console.error("Failed to delete database:", deleteError);
        return res.status(500).json({error: "Failed to delete database"});
    } finally {
        client.release();
    }
});

router.post('/databases/:id/test', authenticateToken, async (req, res) => {
    const databaseId = req.params.id;
    try {
        const result = await pool.query(
            'SELECT * FROM databases WHERE id = $1 AND user_id = $2',
            [databaseId, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json ({
                error: "Database not found"
            });
        }
        const database = result.rows[0];
        await testConnection(database);
        res.status(200).json({
            success: true,
            message: "Database connection successful"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Database connection failed"
        });
    }
}); 

router.get('/databases', authenticateToken, async(req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT id, name, db_type, host, port, database_name, username
            FROM databases WHERE user_id = $1 ORDER BY id DESC`,
            [req.user.userId]
        );
        return res.status(200).json({
            success: true,
            message: "Databases fetched successfully",
            data: result.rows
        });

    } catch (error) {
        next(error);
    }
});
module.exports = router;
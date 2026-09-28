const express = require('express');
const pool = require('../database');
const router = express.Router();
const authenticateToken = require('../middleware/auth.middleware');
const databaseSchema = require('../validators/database.validator');

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

    const query = 'INSERT INTO databases (user_id, name, db_type, host, port, database_name, username, password) VALUES($1, $2, $3, $4, $5, $6, $7, $8)';
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
        const {Client} = require("pg");
        const client = new Client ({
            host: database.host,
            port: database.port,
            user: database.username,
            password: database.password,
            database: database.database_name
        });
        await client.connect();
        await client.end();
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
const express = require('express');
const pool = require('../database');
const router = express.Router();

router.post('/databases', async (req, res) => {

    const database = req.body;

    if (!database.name) {
        res.status(400).json({
            error: "Database name is required"
        });
        return;
    }

    const query = 'INSERT INTO databases (user_id, name, db_type, host, port, database_name, username, password) VALUES($1, $2, $3, $4, $5, $6, $7, $8)';
    const values = [
        database.user_id,
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
            message: "Database added successfully"
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            error: "Failed to add database"
        });
    }
});

router.post('/databases/:id/test', async (req, res) => {
    const databaseId = req.params.id;
    try {
        const result = await pool.query(
            'SELECT * FROM databases WHERE id = $1',
            [databaseId]
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
            message: "Database connection successful"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Database connection failed"
        });
    }
}); 
module.exports = router;
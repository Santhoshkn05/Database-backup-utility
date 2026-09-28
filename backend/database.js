require('dotenv').config();
const { Pool } = require("pg");

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});
pool.query("SELECT current_database(), current_user")
        .then(({rows}) => {
            console.log("PostgreSQL connection connected ");
        })
        .catch(err => {
            console.error("PostgreSQL connection error:");
        });

module.exports = pool;
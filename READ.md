# Database Utility

A Node.js/Express REST API for managing database connection records, creating compressed backups, storing backup files in Backblaze B2, scheduling backups, and restoring backup files. The application metadata is stored in PostgreSQL. Backup sources can be PostgreSQL or MySQL.

## Features

- Register database connection details and test a connection.
- Create a database dump, gzip it, and verify the compressed file.
- Upload successful backups to a B2 bucket and record backup history.
- Retain a configured number of recent backups and delete older local/cloud copies.
- Schedule backups with cron expressions.
- Restore a backup, downloading it from B2 when it is not present locally.
- Record backup and restore events in a log table and send backup notification emails.

## Requirements

- Node.js and npm.
- A PostgreSQL database for application metadata.
- PostgreSQL command-line utilities. The current service uses a hardcoded PostgreSQL 14 `pg_dump.exe` path; restore uses a hardcoded `psql.exe` path.
- For MySQL sources, `mysqldump` and `mysql` must be available on `PATH`.
- A Backblaze B2 bucket configured for the S3-compatible API.
- SMTP credentials for backup notification emails.

## Setup

Run commands from the `backend` directory:

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Set the values in `backend/.env`:

| Variable | Purpose |
| --- | --- |
| `DB_USER`, `DB_HOST`, `DB_NAME`, `DB_PASSWORD`, `DB_PORT` | PostgreSQL connection used for application data. `DB_PORT` defaults to `5432`. |
| `B2_ENDPOINT`, `B2_REGION`, `B2_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET_NAME` | B2 S3-compatible endpoint, credentials, and bucket. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | SMTP server settings. |
| `NOTIFICATION_EMAIL` | Recipient for backup success/failure notifications. |
| `PORT` | Listed in the sample environment, but the current server ignores it and listens on port `3000`. |

Create the application tables in the PostgreSQL metadata database before starting the API. The only checked-in migration, [`backend/migrations/001_create_databases.sql`](backend/migrations/001_create_databases.sql), creates `databases` and references `users(id)`, so the `users` table must already exist. The application also queries `backups`, `logs`, and `schedules`, which are not created by the checked-in migration. Backup cleanup additionally expects a `retention_count` column on `databases`; add the required tables and column as part of your database provisioning.

Start the server with:

```powershell
node server.js
```

The API listens on `http://localhost:3000`. There is no `start` script in `package.json`; its current `test` script is a placeholder that exits with an error.

## API

All routes accept and return JSON where applicable. The server does not configure an authentication middleware.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/databases` | Add a database record. The body should include `user_id`, `name`, `db_type`, `host`, `port`, `database_name`, `username`, and `password`. Supported `db_type` values are `postgresql` and `mysql`. |
| `POST` | `/databases/:id/test` | Test a saved connection. The current implementation uses the PostgreSQL client, so this endpoint does not test MySQL connections correctly. |
| `POST` | `/databases/:id/backup` | Create and upload a backup. |
| `GET` | `/databases/:id/backups` | List backup history for a database. |
| `POST` | `/backups/:id/restore` | Restore a saved backup. MySQL restores use a `targetDatabase` value in the JSON body. PostgreSQL currently restores to a hardcoded database named `restore_test`. |
| `POST` | `/databases/:id/schedule` | Add a scheduled backup. Body: `{ "schedule": "0 2 * * *" }` (cron expression). |
| `GET` | `/databases/:id/schedule` | List schedules for a database. |
| `PUT` | `/schedules/:id` | Change a schedule. Body: `{ "schedule": "0 3 * * *" }`. |
| `PATCH` | `/schedules/:id/status` | Set its active flag. Body: `{ "is_active": true }`. |
| `DELETE` | `/schedules/:id` | Delete a schedule. |
| `GET` | `/databases/:id/logs` | List log records for a database. |

Example database record request:

```http
POST /databases
Content-Type: application/json

{
	"user_id": 1,
	"name": "Development database",
	"db_type": "postgresql",
	"host": "localhost",
	"port": 5432,
	"database_name": "app_db",
	"username": "app_user",
	"password": "replace-with-a-secret"
}
```

## Backup Flow

The API writes temporary SQL and gzip files under `backend/backups/`. It verifies the gzip stream, uploads the compressed file to B2, stores metadata in PostgreSQL, applies retention cleanup, logs the result, and sends an email notification. Scheduled jobs use `node-cron` and the server process must remain running for them to execute.

## Current Limitations and Security

- Database credentials are stored in the `databases` table as supplied; the application does not encrypt them.
- No authentication or authorization is applied to the API routes. Do not expose this service to an untrusted network without adding access controls.
- `login.js` and `register.js` are not mounted by `server.js`; they are not available as API routes in the running server.
- PostgreSQL dump/restore paths are fixed to a PostgreSQL 14 installation on Windows. Update the service paths for another installation or operating system.
- MySQL backup and restore invoke local command-line tools, so those tools and appropriate permissions must be installed on the server.
- Schedule status changes update the database record, but the current status route does not start or stop the in-memory cron job.
- The email service currently reads `SMTP_user` for the sender address, while `.env.example` defines `SMTP_USER`; check the sender configuration if email delivery fails.

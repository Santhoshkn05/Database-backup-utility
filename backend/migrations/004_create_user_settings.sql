ALTER TABLE databases
ADD COLUMN IF NOT EXISTS retention_count INTEGER NOT NULL DEFAULT 7;

CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    notify_backup_success BOOLEAN NOT NULL DEFAULT true,
    notify_backup_failure BOOLEAN NOT NULL DEFAULT true,
    default_retention_count INTEGER NOT NULL DEFAULT 7
        CHECK (default_retention_count IN (7, 14, 30, 60, 90))
);
CREATE tABLE databases (
id              INTEGER GENERATED ALWAYS AS IDENTITY  PRIMARY KEY,
user_id         INTEGER       NOT NULL,
name            VARCHAR       NOT NULL,
db_type         VARCHAR       NOT NULL,
host            VARCHAR       NOT NULL,
port            INTEGER       NOT NULL,
database_name   VARCHAR       NOT NULL,
username        VARCHAR       NOT NULL,
password        VARCHAR       NOT NULL,

FOREIGN KEY (user_id) REFERENCES users(id)
);
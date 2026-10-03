CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS app_schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO app_schema_version (version)
VALUES (1)
ON CONFLICT (version) DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    student_code TEXT,
    phone TEXT,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS clubs (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    field TEXT,
    contact_email TEXT,
    active BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS memberships (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    club_id TEXT NOT NULL REFERENCES clubs(id),
    status TEXT NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL,
    UNIQUE (user_id, club_id)
);

CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    club_id TEXT NOT NULL REFERENCES clubs(id),
    name TEXT NOT NULL,
    description TEXT,
    active BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    UNIQUE (club_id, name)
);

CREATE TABLE IF NOT EXISTS department_members (
    id TEXT PRIMARY KEY,
    department_id TEXT NOT NULL REFERENCES departments(id),
    membership_id TEXT NOT NULL REFERENCES memberships(id),
    joined_at TIMESTAMPTZ NOT NULL,
    UNIQUE (department_id, membership_id)
);

CREATE TABLE IF NOT EXISTS permission_grants (
    user_id TEXT NOT NULL REFERENCES users(id),
    permission TEXT NOT NULL,
    scope TEXT NOT NULL,
    resource_id TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (user_id, permission, scope, resource_id)
);
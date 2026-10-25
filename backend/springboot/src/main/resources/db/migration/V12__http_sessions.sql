-- V12: sign-in moves from JWT + refresh tokens kept by the browser to server-side sessions.
-- The browser only holds an HttpOnly session cookie; the session itself lives in these tables
-- (Spring Session JDBC, schema copied from spring-session-jdbc's schema-postgresql.sql).
-- Deleting a row signs that session out immediately.

-- ---------------------------------------------------------------------------------------------
-- 1. Sessions: one row per signed-in browser
-- ---------------------------------------------------------------------------------------------
CREATE TABLE spring_session (
    primary_id CHAR(36) NOT NULL,
    session_id CHAR(36) NOT NULL,
    creation_time BIGINT NOT NULL,
    last_access_time BIGINT NOT NULL,
    max_inactive_interval INT NOT NULL,
    expiry_time BIGINT NOT NULL,
    -- The signed-in user's id, used to find and end every session of one user.
    principal_name VARCHAR(100),
    CONSTRAINT spring_session_pk PRIMARY KEY (primary_id)
);

CREATE UNIQUE INDEX spring_session_ix1 ON spring_session (session_id);
CREATE INDEX spring_session_ix2 ON spring_session (expiry_time);
CREATE INDEX spring_session_ix3 ON spring_session (principal_name);

-- ---------------------------------------------------------------------------------------------
-- 2. Session attributes (the serialized security context)
-- ---------------------------------------------------------------------------------------------
CREATE TABLE spring_session_attributes (
    session_primary_id CHAR(36) NOT NULL,
    attribute_name VARCHAR(200) NOT NULL,
    attribute_bytes BYTEA NOT NULL,
    CONSTRAINT spring_session_attributes_pk PRIMARY KEY (session_primary_id, attribute_name),
    CONSTRAINT spring_session_attributes_fk FOREIGN KEY (session_primary_id)
        REFERENCES spring_session (primary_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------------------------
-- 3. Refresh tokens are no longer issued
-- ---------------------------------------------------------------------------------------------
DROP TABLE refresh_tokens;

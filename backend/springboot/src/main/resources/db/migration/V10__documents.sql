-- V10: club documents stored in object storage (Cloudflare R2). The database keeps the metadata;
-- the file bytes live in the bucket under `path`. Deleting a document is soft: the row is flagged
-- and hidden, the object stays so the document can be restored.

-- ---------------------------------------------------------------------------------------------
-- 1. Documents: one row per logical file, pointing at its current version
-- ---------------------------------------------------------------------------------------------
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs (id) ON DELETE RESTRICT,
    owner_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    -- Object key of the current version inside the bucket.
    path VARCHAR(1024) NOT NULL,
    version INT NOT NULL,
    content_type VARCHAR(127) NOT NULL,
    size_bytes BIGINT NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,
    -- Which part of the application the file belongs to (e.g. "club.rules", "event.report").
    app_detail_key VARCHAR(100),
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users (id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    CONSTRAINT ck_documents_version_positive CHECK (version > 0),
    CONSTRAINT ck_documents_size_positive CHECK (size_bytes > 0),
    CONSTRAINT ck_documents_checksum_hex CHECK (checksum_sha256 ~ '^[0-9a-f]{64}$'),
    CONSTRAINT ck_documents_name_safe CHECK (
        btrim(name) = name AND name <> '' AND name !~ '[/\\[:cntrl:]]' AND name NOT IN ('.', '..')),
    CONSTRAINT ck_documents_app_detail_key_format CHECK (
        app_detail_key IS NULL OR app_detail_key ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$'),
    CONSTRAINT ck_documents_deleted CHECK (
        (deleted AND deleted_at IS NOT NULL AND deleted_by IS NOT NULL)
        OR (NOT deleted AND deleted_at IS NULL AND deleted_by IS NULL))
);
-- A name is used by at most one live document per club; deleted ones keep theirs for restore.
CREATE UNIQUE INDEX uq_documents_club_name_live ON documents (club_id, lower(name)) WHERE NOT deleted;
CREATE UNIQUE INDEX uq_documents_path ON documents (path);
CREATE INDEX idx_documents_club_live ON documents (club_id, created_at DESC) WHERE NOT deleted;
CREATE INDEX idx_documents_club_deleted ON documents (club_id, deleted_at DESC) WHERE deleted;
CREATE INDEX idx_documents_owner ON documents (owner_id);
CREATE INDEX idx_documents_app_detail_key ON documents (club_id, app_detail_key) WHERE app_detail_key IS NOT NULL;
CREATE INDEX idx_documents_deleted_by ON documents (deleted_by) WHERE deleted_by IS NOT NULL;
CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------------------------
-- 2. Versions: every uploaded file, never changed or removed
-- ---------------------------------------------------------------------------------------------
CREATE TABLE document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
    version INT NOT NULL,
    path VARCHAR(1024) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(127) NOT NULL,
    size_bytes BIGINT NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_document_versions_number UNIQUE (document_id, version),
    CONSTRAINT uq_document_versions_path UNIQUE (path),
    CONSTRAINT uq_document_versions_pointer UNIQUE (document_id, version, path),
    CONSTRAINT ck_document_versions_version_positive CHECK (version > 0),
    CONSTRAINT ck_document_versions_size_positive CHECK (size_bytes > 0),
    CONSTRAINT ck_document_versions_checksum_hex CHECK (checksum_sha256 ~ '^[0-9a-f]{64}$')
);
CREATE INDEX idx_document_versions_uploaded_by ON document_versions (uploaded_by);

-- The current-version pointer must name a real version row (checked at commit, because the
-- document and its first version are inserted in the same transaction).
ALTER TABLE documents ADD CONSTRAINT fk_documents_current_version
    FOREIGN KEY (id, version, path) REFERENCES document_versions (document_id, version, path)
    DEFERRABLE INITIALLY DEFERRED;

-- Versions only ever grow by one: no gaps, no rewriting history.
CREATE FUNCTION check_document_version_sequence() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    latest INT;
BEGIN
    IF TG_OP <> 'INSERT' THEN
        RAISE EXCEPTION 'ck_document_versions_immutable: document versions cannot be changed'
            USING ERRCODE = 'check_violation', CONSTRAINT = 'ck_document_versions_immutable';
    END IF;
    SELECT max(version) INTO latest FROM document_versions WHERE document_id = NEW.document_id;
    IF NEW.version <> COALESCE(latest, 0) + 1 THEN
        RAISE EXCEPTION 'ck_document_versions_sequence: version % does not follow %', NEW.version, COALESCE(latest, 0)
            USING ERRCODE = 'check_violation', CONSTRAINT = 'ck_document_versions_sequence';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_document_versions_sequence BEFORE INSERT OR UPDATE ON document_versions
    FOR EACH ROW EXECUTE FUNCTION check_document_version_sequence();

-- ---------------------------------------------------------------------------------------------
-- 3. Permissions and audit
-- ---------------------------------------------------------------------------------------------
INSERT INTO permissions (permission_key, module, action, scope, description)
VALUES
    ('document.view', 'document', 'view', 'CLUB', 'View and download club documents'),
    ('document.upload', 'document', 'upload', 'CLUB', 'Upload club documents and new versions'),
    ('document.update', 'document', 'update', 'CLUB', 'Rename any club document'),
    ('document.delete', 'document', 'delete', 'CLUB', 'Soft-delete any club document'),
    ('document.restore', 'document', 'restore', 'CLUB', 'See and restore deleted club documents')
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON (
       (r.code IN ('SYSTEM_ADMIN', 'CLUB_PRESIDENT') AND p.permission_key LIKE 'document.%')
    OR (r.code = 'CLUB_VICE_PRESIDENT' AND p.permission_key IN
            ('document.view', 'document.upload', 'document.update', 'document.delete'))
    OR (r.code = 'CLUB_MEMBER' AND p.permission_key = 'document.view')
)
ON CONFLICT DO NOTHING;

ALTER TABLE audit_logs DROP CONSTRAINT ck_audit_logs_resource_type;
ALTER TABLE audit_logs ADD CONSTRAINT ck_audit_logs_resource_type CHECK (resource_type IN
    ('USER', 'CLUB', 'DEPARTMENT', 'MEMBERSHIP', 'DEPARTMENT_MEMBER', 'PERMISSION_GRANT', 'ROLE', 'ROLE_ASSIGNMENT',
     'APPLICATION', 'DOCUMENT'));

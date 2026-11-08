-- Store Cloudflare R2 object keys and media metadata for separated club logos and covers
ALTER TABLE clubs
    ADD COLUMN IF NOT EXISTS logo_storage_key VARCHAR(500),
    ADD COLUMN IF NOT EXISTS logo_content_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS logo_size_bytes BIGINT,
    ADD COLUMN IF NOT EXISTS cover_storage_key VARCHAR(500),
    ADD COLUMN IF NOT EXISTS cover_content_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS cover_size_bytes BIGINT;

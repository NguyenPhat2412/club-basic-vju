-- Stores 9router AI translations for dynamic database content (clubs, events, departments, etc.)
CREATE TABLE IF NOT EXISTS i18n_translations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_hash     VARCHAR(64)  NOT NULL,
    target_locale   VARCHAR(8)   NOT NULL,
    source_text     TEXT         NOT NULL,
    translated_text TEXT         NOT NULL,
    model_used      VARCHAR(80),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_i18n_source_locale UNIQUE (source_hash, target_locale)
);

CREATE INDEX IF NOT EXISTS idx_i18n_translations_locale ON i18n_translations (target_locale);

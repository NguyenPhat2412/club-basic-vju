-- V48: Event cover / poster image URL for public event cards, detail pages, and homepage spotlight.

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS cover_image_url VARCHAR(500);

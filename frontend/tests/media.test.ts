import assert from "node:assert/strict";
import test from "node:test";
import { clubSlugFromCode, resolveMediaUrl, toApiMediaUrl } from "@/lib/media";

test("clubSlugFromCode normalizes VJU club codes and folder names", () => {
  assert.equal(clubSlugFromCode("VJUA"), "vjua");
  assert.equal(clubSlugFromCode("Sun Pinkey"), "sunpinkey");
  assert.equal(clubSlugFromCode("  Ouve-VJU "), "ouvevju");
  assert.equal(clubSlugFromCode(null), "");
});

test("resolveMediaUrl extracts portable /images path or preserves external URLs", () => {
  assert.equal(
    resolveMediaUrl("http://localhost:3000/images/clubs/vjua/logo.png"),
    "/images/clubs/vjua/logo.png"
  );
  assert.equal(
    resolveMediaUrl("https://club.vju.edu.vn/images/clubs/neb/cover.jpg"),
    "/images/clubs/neb/cover.jpg"
  );
  assert.equal(resolveMediaUrl("/images/intro/bia-web-1.jpg"), "/images/intro/bia-web-1.jpg");
  assert.equal(
    resolveMediaUrl("https://cdn.example.com/posters/club-banner.webp"),
    "https://cdn.example.com/posters/club-banner.webp"
  );
  assert.equal(resolveMediaUrl(""), null);
  assert.equal(resolveMediaUrl(undefined), null);
});

test("toApiMediaUrl converts relative /images paths into full http(s) URLs for backend validation", () => {
  assert.equal(
    toApiMediaUrl("/images/clubs/arc/cover.jpg", "http://localhost:3000"),
    "http://localhost:3000/images/clubs/arc/cover.jpg"
  );
  assert.equal(
    toApiMediaUrl("https://cdn.example.com/logo.png"),
    "https://cdn.example.com/logo.png"
  );
  assert.equal(toApiMediaUrl("   "), "");
  assert.equal(toApiMediaUrl(null), "");
});

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  areEventsRelatedInFestival,
  EMPTY_EVENT_FORM,
  toCreateEventPayload,
  toEventFormValues,
} from "@/forms/event/event-form";
import type { ClubEvent } from "@/types/event/event.types";

const FORBIDDEN_TAILWIND_PALETTE =
  /\b(?:bg|text|border|ring)-(?:blue|green|emerald|lime|purple|sky|teal|indigo|violet|fuchsia|pink|cyan|orange)-/;

test("areEventsRelatedInFestival suppresses false conflicts between parent festival and child booths", () => {
  const oshougatsu = { id: "fest-1", parentEventId: null };
  const vacBooth = { id: "booth-vac", parentEventId: "fest-1" };
  const arcBooth = { id: "booth-arc", parentEventId: "fest-1" };
  const unrelatedSeminar = { id: "seminar-1", parentEventId: null };

  assert.equal(areEventsRelatedInFestival(oshougatsu, vacBooth), true);
  assert.equal(areEventsRelatedInFestival(vacBooth, oshougatsu), true);
  assert.equal(areEventsRelatedInFestival(vacBooth, arcBooth), true);
  assert.equal(areEventsRelatedInFestival(oshougatsu, unrelatedSeminar), false);
  assert.equal(areEventsRelatedInFestival(vacBooth, unrelatedSeminar), false);
});

test("toCreateEventPayload and toEventFormValues round-trip V49 festival, booth, map, and shuttle fields", () => {
  const sampleEvent: ClubEvent = {
    id: "ev-booth-1",
    clubId: "club-vac",
    clubCode: "VAC",
    clubName: "CLB Vẽ Trường Đại học Việt Nhật",
    title: "Gian hàng Vẽ Ema – Oshougatsu 2027",
    description: "Trải nghiệm vẽ thẻ gỗ cầu may đầu xuân.",
    eventType: "CLUB_EVENT",
    location: "Sân nghi thức QGHN04 Hòa Lạc",
    startTime: "2027-01-16T08:30:00.000Z",
    endTime: "2027-01-16T15:30:00.000Z",
    registrationDeadline: "2027-01-15T12:00:00.000Z",
    allowCtv: true,
    allowPublicAttendees: true,
    requiresSubmission: false,
    maxParticipants: 40,
    status: "OPEN_REGISTRATION",
    parentEventId: "ev-oshougatsu-2027",
    parentEventTitle: "Tết Việt Nhật – Oshougatsu 2027",
    boothCode: "B02",
    venueMapUrl: "https://vju-club.all1.vn/maps/oshougatsu-2027.png",
    facebookPostUrl: "https://www.facebook.com/vnu.vju/posts/2027",
    recapAlbumUrl: "https://www.facebook.com/media/set/?set=a.2027",
    allowShuttleBus: true,
    coHosts: [{ clubId: "club-neb", clubCode: "NEB", clubName: "CLB Văn hóa Việt Nhật" }],
  };

  const form = toEventFormValues(sampleEvent);
  assert.equal(form.parentEventId, "ev-oshougatsu-2027");
  assert.equal(form.boothCode, "B02");
  assert.equal(form.allowShuttleBus, true);
  assert.deepEqual(form.coHostClubIds, ["club-neb"]);

  const payload = toCreateEventPayload(form, "2026-2", "ev-oshougatsu-2027");
  assert.equal(payload.parentEventId, "ev-oshougatsu-2027");
  assert.equal(payload.clearParentEvent, undefined);
  assert.equal(payload.boothCode, "B02");
  assert.equal(payload.venueMapUrl, "https://vju-club.all1.vn/maps/oshougatsu-2027.png");
  assert.equal(payload.facebookPostUrl, "https://www.facebook.com/vnu.vju/posts/2027");
  assert.equal(payload.recapAlbumUrl, "https://www.facebook.com/media/set/?set=a.2027");
  assert.equal(payload.allowShuttleBus, true);
  assert.deepEqual(payload.coHostClubIds, ["club-neb"]);

  const detachedPayload = toCreateEventPayload(
    { ...EMPTY_EVENT_FORM, title: "Độc lập", startTime: "2027-01-16T08:00", endTime: "2027-01-16T10:00", boothCode: "B02" },
    "2026-2",
    "ev-oshougatsu-2027",
  );
  assert.equal(detachedPayload.parentEventId, undefined);
  assert.equal(detachedPayload.clearParentEvent, true);
  assert.equal(detachedPayload.boothCode, "");
});

test("all event components stay strictly below 400 lines and adhere to the 60/30/10 palette", () => {
  const eventDir = path.resolve(process.cwd(), "src/components/event");
  const files = fs.readdirSync(eventDir).filter((f) => f.endsWith(".tsx"));
  assert.ok(files.includes("EventFestivalCampaignFields.tsx"));
  assert.ok(files.includes("EventFestivalDetailSection.tsx"));

  for (const file of files) {
    const content = fs.readFileSync(path.join(eventDir, file), "utf8");
    const lineCount = content.split("\n").length;
    assert.ok(lineCount < 400, `${file} exceeds 400 lines (${lineCount} lines)`);
    if (file === "EventFestivalCampaignFields.tsx" || file === "EventFestivalDetailSection.tsx") {
      assert.equal(
        FORBIDDEN_TAILWIND_PALETTE.test(content),
        false,
        `${file} contains forbidden Tailwind color token`,
      );
    }
  }
});

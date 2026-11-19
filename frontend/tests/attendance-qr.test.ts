import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAttendanceQrCheckInUrl,
  parseAttendanceQrInput,
  renderAttendanceQrDataUrl,
} from "@/utils/event/attendance-qr";

const SAMPLE_EVENT_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const SAMPLE_ISSUER_ID = "11111111-2222-3333-4444-555555555555";
const SAMPLE_TOKEN = `v1.${SAMPLE_EVENT_ID}.${SAMPLE_ISSUER_ID}.1890000000.sig_abc123`;

test("buildAttendanceQrCheckInUrl and parseAttendanceQrInput round-trip URLs and raw v1 tokens", () => {
  const url = buildAttendanceQrCheckInUrl("https://vju-club.all1.vn/", SAMPLE_EVENT_ID, SAMPLE_TOKEN);
  assert.ok(url.startsWith(`https://vju-club.all1.vn/events?checkin=${SAMPLE_EVENT_ID}&token=`));

  assert.deepEqual(parseAttendanceQrInput(url), {
    eventId: SAMPLE_EVENT_ID,
    token: SAMPLE_TOKEN,
  });
  assert.deepEqual(parseAttendanceQrInput(SAMPLE_TOKEN), {
    eventId: SAMPLE_EVENT_ID,
    token: SAMPLE_TOKEN,
  });
  assert.equal(parseAttendanceQrInput("javascript:alert(1)"), null);
  assert.equal(parseAttendanceQrInput("v2.bad.token"), null);
});

test("renderAttendanceQrDataUrl generates a valid PNG data URI for campus QR scanners", async () => {
  const dataUrl = await renderAttendanceQrDataUrl(
    buildAttendanceQrCheckInUrl("https://vju-club.all1.vn", SAMPLE_EVENT_ID, SAMPLE_TOKEN)
  );
  assert.ok(dataUrl.startsWith("data:image/png;base64,"));
  assert.ok(dataUrl.length > 400);
});

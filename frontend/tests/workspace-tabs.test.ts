import assert from "node:assert/strict";
import test from "node:test";
import {
  clearPendingTabClose,
  computeCloseTabTransition,
  computeNextPersistedTabIds,
  computeOpenTabIds,
  getActivePendingTabClose,
  parseStoredTabIds,
  recordPendingTabClose,
  resolveEffectiveActiveTabId,
  resolveTabIdFromHref,
} from "@/components/layout/WorkspaceTabSpecs";

const CATALOG = new Set([
  "route:/dashboard",
  "mgmt:clubs",
  "mgmt:overview",
  "mgmt:members",
  "route:/settings",
]);

const STARTERS = ["route:/dashboard", "mgmt:clubs", "mgmt:overview"];

test("closing the currently active tab (e.g. Tổng quan) removes it on the VERY FIRST click without resurrecting behind the next tab", () => {
  clearPendingTabClose();
  const initialOpen = ["route:/dashboard", "mgmt:clubs"];

  // User is on /dashboard and clicks X once on Tổng quan ("route:/dashboard")
  const transition = computeCloseTabTransition({
    openIds: initialOpen,
    closingId: "route:/dashboard",
    effectiveActiveId: "route:/dashboard",
  });
  assert.deepEqual(transition, {
    nextIds: ["mgmt:clubs"],
    nextActiveId: "mgmt:clubs",
  });

  recordPendingTabClose("route:/dashboard", "mgmt:clubs");
  const pendingDuringFlight = getActivePendingTabClose();
  assert.ok(pendingDuringFlight);

  // Tick 1: localStorage updated to ["mgmt:clubs"], BEFORE Next.js router finishes leaving /dashboard
  const effectiveDuringFlight = resolveEffectiveActiveTabId("route:/dashboard", pendingDuringFlight);
  assert.equal(effectiveDuringFlight, "mgmt:clubs");

  const openDuringFlight = computeOpenTabIds({
    storedIds: ["mgmt:clubs"],
    defaultStarterIds: STARTERS,
    catalogIds: CATALOG,
    rawActiveId: "route:/dashboard",
    pending: pendingDuringFlight,
  });
  assert.deepEqual(
    openDuringFlight,
    ["mgmt:clubs"],
    "Closed active tab must NOT reappear at the end of openIds while router.push is in flight",
  );

  // Tick 2: Next.js finishes navigating to /management?tab=clubs
  clearPendingTabClose();
  const openAfterLanding = computeOpenTabIds({
    storedIds: ["mgmt:clubs"],
    defaultStarterIds: STARTERS,
    catalogIds: CATALOG,
    rawActiveId: "mgmt:clubs",
    pending: getActivePendingTabClose(),
  });
  assert.deepEqual(openAfterLanding, ["mgmt:clubs"]);
});

test("rapidly closing two active tabs in a row before router settles keeps both closed", () => {
  clearPendingTabClose();

  // Tabs: [dashboard, clubs, members], active = dashboard
  // Click 1: close dashboard -> optimistic active = clubs
  recordPendingTabClose("route:/dashboard", "mgmt:clubs");

  // Click 2 (100ms later, rawActiveId is STILL route:/dashboard): close clubs -> optimistic active = members
  const t2 = computeCloseTabTransition({
    openIds: ["mgmt:clubs", "mgmt:members"],
    closingId: "mgmt:clubs",
    effectiveActiveId: "mgmt:clubs",
  });
  assert.deepEqual(t2, {
    nextIds: ["mgmt:members"],
    nextActiveId: "mgmt:members",
  });
  recordPendingTabClose("mgmt:clubs", "mgmt:members");

  const pending = getActivePendingTabClose();
  assert.equal(resolveEffectiveActiveTabId("route:/dashboard", pending), "mgmt:members");
  assert.equal(resolveEffectiveActiveTabId("mgmt:clubs", pending), "mgmt:members");

  const openIds = computeOpenTabIds({
    storedIds: ["mgmt:members"],
    defaultStarterIds: STARTERS,
    catalogIds: CATALOG,
    rawActiveId: "route:/dashboard",
    pending,
  });
  assert.deepEqual(openIds, ["mgmt:members"]);
  clearPendingTabClose();
});

test("closing an inactive background tab removes it immediately without changing active tab", () => {
  clearPendingTabClose();
  const transition = computeCloseTabTransition({
    openIds: ["mgmt:clubs", "route:/dashboard", "mgmt:members"],
    closingId: "route:/dashboard",
    effectiveActiveId: "mgmt:clubs",
  });
  assert.deepEqual(transition, {
    nextIds: ["mgmt:clubs", "mgmt:members"],
    nextActiveId: null,
  });
});

test("opening tab 1 -> tab 2 -> tab 3 from empty storage keeps all 3 tabs without replacing tab 2", () => {
  const catalog = new Set([
    "route:/dashboard",
    "route:/applications",
    "route:/schedule",
    "route:/profile",
  ]);
  // Step 1: visit /dashboard with empty localStorage (storedIds = null)
  let storedIds: string[] | null = null;
  const persist1 = computeNextPersistedTabIds({
    storedIds,
    defaultStarterIds: ["route:/dashboard"],
    catalogIds: catalog,
    rawActiveId: "route:/dashboard",
  });
  assert.deepEqual(persist1, ["route:/dashboard"]);
  storedIds = persist1;

  // Step 2: click tab 2 (/applications)
  const persist2 = computeNextPersistedTabIds({
    storedIds,
    defaultStarterIds: ["route:/dashboard", "route:/applications"],
    catalogIds: catalog,
    rawActiveId: "route:/applications",
  });
  assert.deepEqual(persist2, ["route:/dashboard", "route:/applications"]);
  storedIds = persist2;

  // Step 3: click tab 3 (/schedule) — tab 2 MUST remain open
  const persist3 = computeNextPersistedTabIds({
    storedIds,
    defaultStarterIds: ["route:/dashboard", "route:/schedule"],
    catalogIds: catalog,
    rawActiveId: "route:/schedule",
  });
  assert.deepEqual(persist3, ["route:/dashboard", "route:/applications", "route:/schedule"]);
  storedIds = persist3;

  // Step 4: opening directly on tab 2 with empty storage still persists both starter + tab 2
  const directPersist = computeNextPersistedTabIds({
    storedIds: null,
    defaultStarterIds: ["route:/dashboard", "route:/applications"],
    catalogIds: catalog,
    rawActiveId: "route:/applications",
  });
  assert.deepEqual(directPersist, ["route:/dashboard", "route:/applications"]);
});

test("closing the last remaining tab enters explicit empty workspace ([]) and does not resurrect until reopened", () => {
  const catalog = new Set(["route:/dashboard", "mgmt:clubs", "route:/profile"]);

  // Close the last remaining tab
  const transition = computeCloseTabTransition({
    openIds: ["route:/dashboard"],
    closingId: "route:/dashboard",
    effectiveActiveId: "route:/dashboard",
  });
  assert.deepEqual(transition, { nextIds: [], nextActiveId: null });

  // Stored "[]" parses as [] (distinct from null)
  const storedEmpty = parseStoredTabIds("[]");
  assert.deepEqual(storedEmpty, []);

  // Empty workspace renders 0 tabs and does NOT auto-resurrect the underlying route
  assert.deepEqual(
    computeOpenTabIds({
      storedIds: storedEmpty,
      defaultStarterIds: ["route:/dashboard"],
      catalogIds: catalog,
      rawActiveId: "route:/dashboard",
      pending: null,
    }),
    [],
  );
  assert.equal(
    computeNextPersistedTabIds({
      storedIds: storedEmpty,
      defaultStarterIds: ["route:/dashboard"],
      catalogIds: catalog,
      rawActiveId: "route:/dashboard",
    }),
    null,
  );

  // Href resolution supports reopening any sidebar/shortcut link cleanly
  assert.equal(resolveTabIdFromHref("/dashboard"), "route:/dashboard");
  assert.equal(resolveTabIdFromHref("/management?tab=clubs"), "mgmt:clubs");
  assert.equal(resolveTabIdFromHref("/home"), null);

  // Reopening a different route (/dashboard) from empty workspace while still on /management?tab=clubs
  // suppresses the old URL during in-flight navigation so no ghost tab appears
  clearPendingTabClose();
  recordPendingTabClose("mgmt:clubs", "route:/dashboard");
  const openDuringReopen = computeOpenTabIds({
    storedIds: ["route:/dashboard"],
    defaultStarterIds: ["route:/dashboard"],
    catalogIds: catalog,
    rawActiveId: "mgmt:clubs",
    pending: getActivePendingTabClose(),
  });
  assert.deepEqual(openDuringReopen, ["route:/dashboard"]);
  clearPendingTabClose();
});

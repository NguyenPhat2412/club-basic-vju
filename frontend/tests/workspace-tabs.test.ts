import assert from "node:assert/strict";
import test from "node:test";
import {
  clearPendingTabClose,
  computeCloseTabTransition,
  computeOpenTabIds,
  getActivePendingTabClose,
  recordPendingTabClose,
  resolveEffectiveActiveTabId,
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
